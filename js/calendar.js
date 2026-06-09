/**
 * calendar.js — renders the calendar grid
 */

const Calendar = (() => {

  const TOOLBAR_HEIGHT_PX = 56;  // must match --toolbar-height in CSS
  const HEADER_HEIGHT_PX  = 64;  // must match day-header height in CSS
  const ALL_DAY_HEIGHT_PX = 32;  // must match all-day-strip height in CSS

  let _nowLineTimer = null;

  // Use window.innerHeight minus known fixed heights so the events area
  // fills the screen exactly. More reliable than clientHeight (avoids
  // measuring before layout or sub-pixel rounding issues).
  const _getDayHeightPx = () =>
    window.innerHeight - TOOLBAR_HEIGHT_PX - HEADER_HEIGHT_PX - ALL_DAY_HEIGHT_PX;

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
      const isMajor = timeView === '5hour' || hour % 6 === 0;
      const label = document.createElement('div');
      label.className = 'time-label' + (isMajor ? ' major' : '');
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
    const majorInterval = timeView === '5hour' ? 5 : 6;
    _getVisibleHours(timeView, bandStartHour).forEach(hour => {
      const line = document.createElement('div');
      line.className = 'hour-line' + (hour % majorInterval === 0 ? ' major' : '');
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
    if (!events.length) return;

    const meta     = _assignEventColumns(events);
    const dayStart = Utils.startOfDay(day);
    const dayEnd   = Utils.addDays(dayStart, 1);

    events.forEach(ev => {
      const { col, totalCols } = meta.get(ev.id) || { col: 0, totalCols: 1 };
      const person = CONFIG.people[ev.personId];

      const segStart = ev.start < dayStart ? dayStart : ev.start;
      const segEnd   = ev.end   > dayEnd   ? dayEnd   : ev.end;

      const topPx    = _timeToPxClamped(segStart, day, state.timeView, state.bandStartHour, DAY_H);
      const bottomPx = _timeToPxClamped(segEnd,   day, state.timeView, state.bandStartHour, DAY_H);
      if (bottomPx <= 0 || topPx >= DAY_H) return;

      const heightPx = Math.max(bottomPx - topPx, 22);
      const widthPct = 100 / totalCols;
      const leftPct  = col * widthPct;

      const block = document.createElement('div');
      block.className = 'event-block';
      block.style.top    = `${topPx}px`;
      block.style.height = `${heightPx}px`;
      block.style.left   = `${leftPct}%`;
      block.style.width  = `${widthPct - 0.5}%`;
      block.style.setProperty('--event-colour', person.colour);
      block.style.setProperty('--event-bg', Utils.hexToRgba(person.colour, 0.15));
      block.style.zIndex = col;

      block.innerHTML = `
        <div class="event-title">${ev.title}</div>
        ${heightPx > 36 ? `<div class="event-time">${Utils.timeStr(ev.start)} – ${Utils.timeStr(ev.end)}</div>` : ''}
      `;

      container.appendChild(block);
    });
  };

  /**
   * Assign each event a column index and total column count within its
   * overlap group, so events that don't overlap span the full width.
   */
  const _assignEventColumns = (events) => {
    const sorted = [...events].sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const meta   = new Map(); // id → { col, totalCols }
    const cols   = [];        // cols[i] = latest end time placed in column i

    sorted.forEach(ev => {
      let col = cols.findIndex(end => end <= ev.start);
      if (col === -1) col = cols.length;
      cols[col] = ev.end;
      meta.set(ev.id, { col, totalCols: 1 });
    });

    // Find connected groups and set totalCols = max col used in that group + 1
    const visited = new Set();
    sorted.forEach(seed => {
      if (visited.has(seed.id)) return;
      // BFS over overlapping events
      const group = [];
      const queue = [seed];
      while (queue.length) {
        const curr = queue.shift();
        if (visited.has(curr.id)) continue;
        visited.add(curr.id);
        group.push(curr);
        sorted.forEach(other => {
          if (!visited.has(other.id) && other.start < curr.end && other.end > curr.start)
            queue.push(other);
        });
      }
      const groupCols = group.reduce((mx, ev) => Math.max(mx, meta.get(ev.id).col), 0) + 1;
      group.forEach(ev => { meta.get(ev.id).totalCols = groupCols; });
    });

    return meta;
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
      return Array.from({ length: 6 }, (_, i) => bandStartHour >= 24 - 4 ? bandStartHour : bandStartHour + i );
    }
    // 24h mode: label and gridline every 3 hours
    return [0, 3, 6, 9, 12, 15, 18, 21, 24];
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
      if (bandStartHour > 19 && hours < bandStartHour + 5 - 24) hours += 24;
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
      if (bandStartHour > 19 && hours < bandStartHour + 5 - 24) hours += 24;
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
