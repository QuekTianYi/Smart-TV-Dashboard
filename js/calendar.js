/**
 * calendar.js — renders the calendar grid
 *
 * Handles:
 * - Day columns (3-day / 7-day)
 * - Time gutter labels
 * - Hour gridlines
 * - Event blocks with overlap/cascade layout
 * - All-day events strip
 * - Current time indicator
 * - 5-hour band vs 24-hour view
 */

const Calendar = (() => {

  // Total rendered height for a full 24-hour day (px).
  // All positions are calculated as fractions of this.
  const DAY_HEIGHT_PX = 2400; // 100px per hour

  // Height of the sticky day header (px) — must match CSS
  const HEADER_HEIGHT_PX = 64;

  // Height of the all-day strip
  const ALL_DAY_HEIGHT_PX = 32;

  let _nowLineTimer = null;

  // ── Public: full render ────────────────────────────────────────────────

  const render = () => {
    _renderTimeGutter();
    _renderGrid();
    _scheduleNowLine();
  };

  // ── Time Gutter ────────────────────────────────────────────────────────

  const _renderTimeGutter = () => {
    const gutter   = document.getElementById('time-gutter');
    const { timeView, bandStartHour } = State.get();

    gutter.innerHTML = '';
    gutter.style.height = `${DAY_HEIGHT_PX + HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX}px`;

    const hours = _getVisibleHours(timeView, bandStartHour);

    hours.forEach(hour => {
      const label = document.createElement('div');
      label.className = 'time-label';
      label.textContent = Utils.hourLabel(hour);
      label.style.top = `${HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX + _hourToPx(hour, timeView, bandStartHour)}px`;
      gutter.appendChild(label);
    });
  };

  // ── Grid ───────────────────────────────────────────────────────────────

  const _renderGrid = () => {
    const grid  = document.getElementById('calendar-grid');
    const state = State.get();
    const { days } = State.getVisibleRange();

    grid.innerHTML = '';

    // Sync scroll height
    grid.style.height = `${DAY_HEIGHT_PX + HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX}px`;

    const today   = new Date();
    const is3Day  = state.dayView === '3day';

    days.forEach((day, colIdx) => {
      const isToday = Utils.isToday(day);

      const col = document.createElement('div');
      col.className = 'day-column' + (isToday ? ' is-today' : '') + (is3Day && isToday ? ' three-day-focus' : '');

      // ── Day Header ──
      const header = document.createElement('div');
      header.className = 'day-header';
      header.innerHTML = `
        <div class="day-header-name">${Utils.dayName(day)}</div>
        <div class="day-header-date">${Utils.dayNum(day)}</div>
      `;
      col.appendChild(header);

      // ── All-day strip ──
      const allDayStrip = document.createElement('div');
      allDayStrip.className = 'all-day-strip';
      const allDayEvents = _eventsForDay(state.events, day, state.visibility).filter(e => e.allDay);
      allDayEvents.forEach(ev => {
        const person = CONFIG.people[ev.personId];
        const pill   = document.createElement('div');
        pill.className = 'all-day-event';
        pill.style.background = Utils.hexToRgba(person.colour, 0.85);
        pill.textContent = ev.title;
        allDayStrip.appendChild(pill);
      });
      col.appendChild(allDayStrip);

      // ── Timed events area ──
      const eventsArea = document.createElement('div');
      eventsArea.className = 'events-area';
      eventsArea.style.top    = `${HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX}px`;
      eventsArea.style.height = `${DAY_HEIGHT_PX}px`;
      eventsArea.style.position = 'relative';

      // Gridlines
      _addGridLines(eventsArea, state);

      // Now line (today only)
      if (isToday) {
        _addNowLine(eventsArea, state, day);
      }

      // Events — grouped by visible person, then cascade
      const timedEvents = _eventsForDay(state.events, day, state.visibility).filter(e => !e.allDay);
      _renderEvents(eventsArea, timedEvents, state, day);

      col.appendChild(eventsArea);
      grid.appendChild(col);
    });

    // Scroll to band start (or centre of today in 24h mode)
    _scrollToTime(grid, state);
  };

  // ── Gridlines ─────────────────────────────────────────────────────────

  const _addGridLines = (container, state) => {
    const { timeView, bandStartHour } = state;
    const hours = _getVisibleHours(timeView, bandStartHour);

    hours.forEach(hour => {
      const line = document.createElement('div');
      line.className = 'hour-line' + (hour % 5 === 0 ? ' major' : '');
      line.style.top = `${_hourToPx(hour, timeView, bandStartHour)}px`;
      container.appendChild(line);
    });
  };

  // ── Now Line ──────────────────────────────────────────────────────────

  const _addNowLine = (container, state, day) => {
    const now  = new Date();
    const topPx = _timeToPx(now, state.timeView, state.bandStartHour);
    if (topPx === null) return; // outside visible band

    const line = document.createElement('div');
    line.className = 'now-line';
    line.id = 'now-line';
    line.style.top = `${topPx}px`;
    container.appendChild(line);
  };

  const _scheduleNowLine = () => {
    if (_nowLineTimer) clearInterval(_nowLineTimer);
    _nowLineTimer = setInterval(() => {
      const el = document.getElementById('now-line');
      if (!el) return;
      const state  = State.get();
      const topPx  = _timeToPx(new Date(), state.timeView, state.bandStartHour);
      if (topPx === null) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.style.top = `${topPx}px`;
    }, 60_000); // update every minute
  };

  // ── Events ────────────────────────────────────────────────────────────

  /**
   * Render timed events into eventsArea.
   * Groups events per visible person, then calculates horizontal cascade
   * for overlapping events (same Google Calendar style: equal-width columns,
   * left-offset by cascade index).
   */
  const _renderEvents = (container, events, state, day) => {
    const visiblePeople = CONFIG.people
      .map((p, i) => ({ ...p, personId: i }))
      .filter(p => state.visibility[p.personId]);

    if (visiblePeople.length === 0) return;

    // Lane width: divide container equally per visible person
    const laneWidthPct = 100 / visiblePeople.length;

    visiblePeople.forEach((person, laneIdx) => {
      const personEvents = events.filter(e => e.personId === person.personId);
      if (personEvents.length === 0) return;

      const laneLeft = laneIdx * laneWidthPct;

      // Sort by start time
      personEvents.sort((a, b) => a.start - b.start);

      // Group overlapping events into clusters for cascade layout
      const clusters = _clusterEvents(personEvents);

      clusters.forEach(cluster => {
        cluster.forEach((ev, clusterIdx) => {
          const clusterCount = cluster.length;

          const topPx    = _timeToPx(ev.start, state.timeView, state.bandStartHour);
          const bottomPx = _timeToPx(ev.end,   state.timeView, state.bandStartHour);
          if (topPx === null) return;

          const heightPx = Math.max((bottomPx ?? DAY_HEIGHT_PX) - topPx, 22);

          // Within a person's lane, cascade overlapping events
          const evWidthPct  = laneWidthPct / clusterCount;
          const evLeftPct   = laneLeft + clusterIdx * evWidthPct;

          const block = document.createElement('div');
          block.className = 'event-block';
          block.style.top       = `${topPx}px`;
          block.style.height    = `${heightPx}px`;
          block.style.left      = `${evLeftPct}%`;
          block.style.width     = `${evWidthPct - 1}%`; // 1% gap between cascades
          block.style.setProperty('--event-colour', person.colour);
          block.style.setProperty('--event-bg', Utils.hexToRgba(person.colour, 0.15));
          block.style.zIndex    = clusterIdx;

          block.innerHTML = `
            <div class="event-title">${ev.title}</div>
            ${heightPx > 36 ? `<div class="event-time">${Utils.timeStr(ev.start)} – ${Utils.timeStr(ev.end)}</div>` : ''}
          `;

          container.appendChild(block);
        });
      });
    });
  };

  /**
   * Given a sorted list of events for one person,
   * group them into clusters of mutually-overlapping events.
   * Returns an array of clusters (each cluster is an array of events).
   */
  const _clusterEvents = (events) => {
    const clusters = [];
    let currentCluster = [];
    let clusterEnd = null;

    events.forEach(ev => {
      if (!clusterEnd || ev.start >= clusterEnd) {
        if (currentCluster.length > 0) clusters.push(currentCluster);
        currentCluster = [ev];
        clusterEnd = ev.end;
      } else {
        currentCluster.push(ev);
        if (ev.end > clusterEnd) clusterEnd = ev.end;
      }
    });

    if (currentCluster.length > 0) clusters.push(currentCluster);
    return clusters;
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Return events on a given day for visible people */
  const _eventsForDay = (events, day, visibility) =>
    events.filter(ev =>
      visibility[ev.personId] &&
      (Utils.isSameDay(ev.start, day) ||
       (ev.allDay && ev.start <= day && ev.end > day))
    );

  /**
   * Which hours are rendered in this time view?
   * 5hour: bandStartHour to bandStartHour+5 (inclusive labels)
   * 24hour: 0..23
   */
  const _getVisibleHours = (timeView, bandStartHour) => {
    if (timeView === '5hour') {
      return Array.from({ length: 6 }, (_, i) => bandStartHour + i);
    }
    // Every 5 hours for gridlines in 24h mode
    return [0, 5, 10, 15, 20, 23];
  };

  /**
   * Convert an hour number to a pixel offset within the events area.
   * In 5hour mode, maps [bandStart, bandStart+5] → [0, DAY_HEIGHT_PX].
   * In 24hour mode, maps [0, 24] → [0, DAY_HEIGHT_PX].
   */
  const _hourToPx = (hour, timeView, bandStartHour) => {
    if (timeView === '5hour') {
      return ((hour - bandStartHour) / 5) * DAY_HEIGHT_PX;
    }
    return (hour / 24) * DAY_HEIGHT_PX;
  };

  /**
   * Convert a Date to a pixel offset. Returns null if outside visible range.
   */
  const _timeToPx = (date, timeView, bandStartHour) => {
    const hours = date.getHours() + date.getMinutes() / 60;

    if (timeView === '5hour') {
      const bandEnd = bandStartHour + 5;
      if (hours < bandStartHour || hours > bandEnd) return null;
      return ((hours - bandStartHour) / 5) * DAY_HEIGHT_PX;
    }

    return (hours / 24) * DAY_HEIGHT_PX;
  };

  /** Scroll the grid so the band start (or current time area) is in view */
  const _scrollToTime = (grid, state) => {
    const { timeView, bandStartHour } = state;
    const targetHour = timeView === '5hour' ? bandStartHour : Utils.clamp(new Date().getHours() - 1, 0, 23);
    const targetPx   = _hourToPx(targetHour, timeView, bandStartHour);
    grid.scrollTop   = targetPx;
  };

  // Re-render whenever relevant state changes
  State.onChange((keys) => {
    if (keys.some(k => ['dayView','timeView','anchorDate','bandStartHour','events','visibility'].includes(k))) {
      render();
    }
  });

  return { render };
})();
