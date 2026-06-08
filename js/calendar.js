/**
 * calendar.js — renders the calendar grid
 */

const Calendar = (() => {

  const HEADER_HEIGHT_PX  = 64;
  const ALL_DAY_HEIGHT_PX = 32;

  let _nowLineTimer = null;

  // Compute the events-area pixel height from the actual container size
  // so the grid fills the screen exactly with no leftover space.
  const _getDayHeightPx = () => {
    const c = document.getElementById('calendar-container');
    if (!c) return 960;
    return Math.max(c.clientHeight - HEADER_HEIGHT_PX - ALL_DAY_HEIGHT_PX, 100);
  };

  // ── Public ────────────────────────────────────────────────────────────

  const render = () => {
    const h = _getDayHeightPx();
    _renderTimeGutter(h);
    _renderGrid(h);
    _scheduleNowLine();
  };

  // ── Time Gutter ───────────────────────────────────────────────────────

  const _renderTimeGutter = (DAY_H) => {
    const gutter = document.getElementById('time-gutter');
    const { timeView, bandStartHour } = State.get();

    gutter.innerHTML = '';

    // "All Day" label centred in the all-day strip row
    const adLabel = document.createElement('div');
    adLabel.className = 'all-day-label';
    adLabel.textContent = 'All Day';
    adLabel.style.top = `${HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX / 2}px`;
    gutter.appendChild(adLabel);

    // Hour labels
    const hours = _getVisibleHours(timeView, bandStartHour);
    hours.forEach(hour => {
      const label = document.createElement('div');
      label.className = 'time-label';
      label.textContent = Utils.hourLabel(hour);
      label.style.top = `${HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX + _hourToPx(hour, timeView, bandStartHour, DAY_H)}px`;
      gutter.appendChild(label);
    });

    // Current-time label (accent coloured, at now-line position)
    const now   = new Date();
    const nowPx = _timeToPx(now, timeView, bandStartHour, DAY_H);
    if (nowPx !== null) {
      const nowLabel = document.createElement('div');
      nowLabel.id        = 'now-time-label';
      nowLabel.className = 'now-time-label';
      nowLabel.textContent = Utils.timeStr(now);
      nowLabel.style.top = `${HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX + nowPx}px`;
      gutter.appendChild(nowLabel);
    }
  };

  // ── Grid ──────────────────────────────────────────────────────────────

  const _renderGrid = (DAY_H) => {
    const grid  = document.getElementById('calendar-grid');
    const state = State.get();
    const { days } = State.getVisibleRange();

    grid.innerHTML = '';
    grid.style.height = `${DAY_H + HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX}px`;

    const is3Day = state.dayView === '3day';

    days.forEach((day) => {
      const isToday = Utils.isToday(day);

      const col = document.createElement('div');
      col.className = 'day-column'
        + (isToday ? ' is-today' : '')
        + (is3Day && isToday ? ' three-day-focus' : '');

      // Day header
      const header = document.createElement('div');
      header.className = 'day-header';
      header.innerHTML = `
        <div class="day-header-name">${Utils.dayName(day)}</div>
        <div class="day-header-date">${Utils.dayNum(day)}</div>
      `;
      col.appendChild(header);

      // All-day strip
      const allDayStrip = document.createElement('div');
      allDayStrip.className = 'all-day-strip';
      _eventsForDay(state.events, day, state.visibility)
        .filter(e => e.allDay)
        .forEach(ev => {
          const pill = document.createElement('div');
          pill.className = 'all-day-event';
          pill.style.background = Utils.hexToRgba(CONFIG.people[ev.personId].colour, 0.85);
          pill.textContent = ev.title;
          allDayStrip.appendChild(pill);
        });
      col.appendChild(allDayStrip);

      // Timed events area
      const eventsArea = document.createElement('div');
      eventsArea.className  = 'events-area';
      eventsArea.style.height   = `${DAY_H}px`;
      eventsArea.style.position = 'relative';

      _addGridLines(eventsArea, state, DAY_H);

      const timedEvents = _eventsForDay(state.events, day, state.visibility).filter(e => !e.allDay);
      _renderEvents(eventsArea, timedEvents, state, day, DAY_H);

      col.appendChild(eventsArea);
      grid.appendChild(col);
    });

    // Single now-line spanning every column (only when today is visible)
    if (days.some(d => Utils.isToday(d))) {
      _addGridNowLine(grid, state, DAY_H);
    }
  };

  // ── Gridlines ─────────────────────────────────────────────────────────

  const _addGridLines = (container, state, DAY_H) => {
    const { timeView, bandStartHour } = state;
    _getVisibleHours(timeView, bandStartHour).forEach(hour => {
      const line = document.createElement('div');
      line.className = 'hour-line' + (hour % 5 === 0 ? ' major' : '');
      line.style.top = `${_hourToPx(hour, timeView, bandStartHour, DAY_H)}px`;
      container.appendChild(line);
    });
  };

  // ── Now Line (grid-level, spans all columns) ──────────────────────────

  const _addGridNowLine = (grid, state, DAY_H) => {
    const now   = new Date();
    const topPx = _timeToPx(now, state.timeView, state.bandStartHour, DAY_H);
    if (topPx === null) return;

    const line = document.createElement('div');
    line.className = 'now-line';
    line.id        = 'now-line';
    line.style.top = `${HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX + topPx}px`;
    grid.appendChild(line);
  };

  const _scheduleNowLine = () => {
    if (_nowLineTimer) clearInterval(_nowLineTimer);
    _nowLineTimer = setInterval(() => {
      const lineEl  = document.getElementById('now-line');
      const labelEl = document.getElementById('now-time-label');
      if (!lineEl && !labelEl) return;

      const state = State.get();
      const DAY_H = _getDayHeightPx();
      const topPx = _timeToPx(new Date(), state.timeView, state.bandStartHour, DAY_H);

      if (topPx === null) {
        if (lineEl)  lineEl.style.display  = 'none';
        if (labelEl) labelEl.style.display = 'none';
        return;
      }

      const totalTop = HEADER_HEIGHT_PX + ALL_DAY_HEIGHT_PX + topPx;

      if (lineEl)  { lineEl.style.display  = ''; lineEl.style.top  = `${totalTop}px`; }
      if (labelEl) {
        labelEl.style.display = '';
        labelEl.style.top     = `${totalTop}px`;
        labelEl.textContent   = Utils.timeStr(new Date());
      }
    }, 60_000);
  };

  // ── Events ────────────────────────────────────────────────────────────

  const _renderEvents = (container, events, state, day, DAY_H) => {
    const visiblePeople = CONFIG.people
      .map((p, i) => ({ ...p, personId: i }))
      .filter(p => state.visibility[p.personId]);

    if (visiblePeople.length === 0) return;

    const laneWidthPct = 100 / visiblePeople.length;

    visiblePeople.forEach((person, laneIdx) => {
      const personEvents = events
        .filter(e => e.personId === person.personId)
        .sort((a, b) => a.start - b.start);

      if (personEvents.length === 0) return;

      const laneLeft = laneIdx * laneWidthPct;
      const clusters = _clusterEvents(personEvents);

      clusters.forEach(cluster => {
        cluster.forEach((ev, clusterIdx) => {
          const dayStart     = Utils.startOfDay(day);
          const dayEnd       = Utils.addDays(dayStart, 1);
          const segmentStart = ev.start < dayStart ? dayStart : ev.start;
          const segmentEnd   = ev.end   > dayEnd   ? dayEnd   : ev.end;

          const topPx    = _timeToPxClamped(segmentStart, day, state.timeView, state.bandStartHour, DAY_H);
          const bottomPx = _timeToPxClamped(segmentEnd,   day, state.timeView, state.bandStartHour, DAY_H);
          if (bottomPx <= 0 || topPx >= DAY_H) return;

          const heightPx    = Math.max(bottomPx - topPx, 22);
          const evWidthPct  = laneWidthPct / cluster.length;
          const evLeftPct   = laneLeft + clusterIdx * evWidthPct;

          const block = document.createElement('div');
          block.className = 'event-block';
          block.style.top    = `${topPx}px`;
          block.style.height = `${heightPx}px`;
          block.style.left   = `${evLeftPct}%`;
          block.style.width  = `${evWidthPct - 1}%`;
          block.style.setProperty('--event-colour', person.colour);
          block.style.setProperty('--event-bg', Utils.hexToRgba(person.colour, 0.15));
          block.style.zIndex = clusterIdx;

          block.innerHTML = `
            <div class="event-title">${ev.title}</div>
            ${heightPx > 36 ? `<div class="event-time">${Utils.timeStr(ev.start)} – ${Utils.timeStr(ev.end)}</div>` : ''}
          `;

          container.appendChild(block);
        });
      });
    });
  };

  const _clusterEvents = (events) => {
    const clusters = [];
    let cluster = [], clusterEnd = null;

    events.forEach(ev => {
      if (!clusterEnd || ev.start >= clusterEnd) {
        if (cluster.length) clusters.push(cluster);
        cluster    = [ev];
        clusterEnd = ev.end;
      } else {
        cluster.push(ev);
        if (ev.end > clusterEnd) clusterEnd = ev.end;
      }
    });

    if (cluster.length) clusters.push(cluster);
    return clusters;
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Return events on a given day for visible people, deduped by ID. */
  const _eventsForDay = (events, day, visibility) => {
    const dayStart = Utils.startOfDay(day);
    const dayEnd   = Utils.addDays(dayStart, 1);
    const seen     = new Set();

    return events.filter(ev => {
      if (!visibility[ev.personId])    return false;
      if (ev.start >= dayEnd)          return false;
      if (ev.end   <= dayStart)        return false;
      if (seen.has(ev.id))             return false;
      seen.add(ev.id);
      return true;
    });
  };

  const _getVisibleHours = (timeView, bandStartHour) => {
    if (timeView === '5hour') {
      return Array.from({ length: 6 }, (_, i) => bandStartHour + i);
    }
    return [0, 5, 10, 15, 20, 24];
  };

  const _normalizeHourForBand = (hour, bandStartHour) =>
    (bandStartHour > 19 && hour < bandStartHour) ? hour + 24 : hour;

  const _hourToPx = (hour, timeView, bandStartHour, DAY_H) => {
    if (timeView === '5hour') {
      return ((_normalizeHourForBand(hour, bandStartHour) - bandStartHour) / 5) * DAY_H;
    }
    return (hour / 24) * DAY_H;
  };

  const _timeToPx = (date, timeView, bandStartHour, DAY_H) => {
    let hours = date.getHours() + date.getMinutes() / 60;
    if (timeView === '5hour') {
      if (bandStartHour > 19 && hours < bandStartHour) hours += 24;
      const bandEnd = bandStartHour + 5;
      if (hours < bandStartHour || hours > bandEnd) return null;
      return ((hours - bandStartHour) / 5) * DAY_H;
    }
    return (hours / 24) * DAY_H;
  };

  const _hoursSinceDayStart = (date, day) => {
    const t = date.getTime();
    const s = Utils.startOfDay(day).getTime();
    const e = Utils.addDays(Utils.startOfDay(day), 1).getTime();
    if (t === e) return 24;
    return Math.max(0, Math.min(24, (t - s) / 3_600_000));
  };

  const _timeToPxClamped = (date, day, timeView, bandStartHour, DAY_H) => {
    let hours = _hoursSinceDayStart(date, day);
    if (timeView === '5hour') {
      if (bandStartHour > 19 && hours < bandStartHour) hours += 24;
      const bandEnd  = bandStartHour + 5;
      const clamped  = Math.min(Math.max(hours, bandStartHour), bandEnd);
      return ((clamped - bandStartHour) / 5) * DAY_H;
    }
    return (Math.min(Math.max(hours, 0), 24) / 24) * DAY_H;
  };

  State.onChange((keys) => {
    if (keys.some(k => ['dayView','timeView','anchorDate','bandStartHour','events','visibility'].includes(k))) {
      render();
    }
  });

  return { render };
})();
