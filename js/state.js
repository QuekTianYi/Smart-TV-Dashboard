/**
 * state.js — centralised app state
 *
 * All mutable state lives here. Other modules read from State and call
 * State.set() / State.update() to trigger re-renders.
 */

const State = (() => {

  const _state = {
    // View mode
    dayView:  CONFIG.defaultDayView  || '3day',   // '3day' | '7day'
    timeView: CONFIG.defaultTimeView || '5hour',   // '5hour' | '24hour'

    // The "anchor" date — in 3day view this is the centre day (today by default),
    // in 7day view this is the Monday of the visible week.
    anchorDate: new Date(),

    // 5-hour band: which hour the band starts at (auto-centred on current time)
    bandStartHour: _calcDefaultBandStart(),

    // People visibility: { [personId]: boolean }
    visibility: _initVisibility(),

    // Fetched events (flat array, all people)
    events: [],

    // Whether initial load is done
    loaded: false,

    // Fetch errors from last refresh
    fetchErrors: [],
  };

  /** Listeners registered via State.onChange() */
  const _listeners = [];

  /** Calculate initial band start hour centred on now */
  function _calcDefaultBandStart() {
    const now = new Date();
    const h   = now.getHours();
    // Centre the 5h window on current hour, clamped to [0, 19]
    return Utils.clamp(h - 2, 0, 19);
  }

  /** Initialise visibility from config defaultVisible */
  function _initVisibility() {
    const v = {};
    CONFIG.people.forEach((p, i) => {
      v[i] = p.defaultVisible !== false;
    });
    return v;
  }

  /** Notify all listeners of a state change */
  const _notify = (changedKeys) => {
    _listeners.forEach(fn => fn(changedKeys, _state));
  };

  /** Update one or more state keys and notify listeners */
  const set = (updates) => {
    const changedKeys = Object.keys(updates);
    Object.assign(_state, updates);
    _notify(changedKeys);
  };

  /** Read current state (returns a shallow copy to discourage direct mutation) */
  const get = () => ({ ..._state });

  /** Register a listener: fn(changedKeys, state) */
  const onChange = (fn) => {
    _listeners.push(fn);
  };

  /**
   * Toggle a person's visibility.
   */
  const togglePerson = (personId) => {
    const next = { ..._state.visibility };
    next[personId] = !next[personId];
    set({ visibility: next });
  };

  /**
   * Compute the visible date range for the current dayView + anchorDate.
   * Returns { start: Date, end: Date, days: Date[] }
   */
  const getVisibleRange = () => {
    const anchor = _state.anchorDate;

    if (_state.dayView === '3day') {
      const yesterday = Utils.addDays(anchor, -1);
      const tomorrow  = Utils.addDays(anchor, 1);
      return {
        start: Utils.startOfDay(yesterday),
        end:   Utils.addDays(Utils.startOfDay(tomorrow), 1),
        days:  [yesterday, anchor, tomorrow],
      };
    }

    // 7-day: anchor is treated as the first visible day
    const days = Array.from({ length: 7 }, (_, i) => Utils.addDays(anchor, i));
    return {
      start: Utils.startOfDay(days[0]),
      end:   Utils.addDays(Utils.startOfDay(days[6]), 1),
      days,
    };
  };

  /**
   * Advance or retreat the anchor date by one step.
   * In 3-day view: ±1 day. In 7-day view: ±7 days.
   */
  const navigate = (direction) => {
    const step  = _state.dayView === '3day' ? 1 : 7;
    const delta = direction === 'prev' ? -step : step;
    set({ anchorDate: Utils.addDays(_state.anchorDate, delta) });
  };

  /** Jump anchor back to today */
  const goToToday = () => {
    set({ anchorDate: new Date(), bandStartHour: _calcDefaultBandStart() });
  };

  /** Shift the 5-hour band up or down by one hour */
  const shiftBand = (direction) => {
    const delta = direction === 'up' ? -1 : 1;
    set({ bandStartHour: Utils.clamp(_state.bandStartHour + delta, 0, 23) });
  };

  return { get, set, onChange, togglePerson, getVisibleRange, navigate, goToToday, shiftBand };
})();
