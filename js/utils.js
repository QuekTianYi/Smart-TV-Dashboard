/**
 * utils.js — shared helper functions
 */

const Utils = (() => {

  /** Format a Date to "Mon", "Tue", etc. */
  const dayName = (date) =>
    date.toLocaleDateString('en-GB', { weekday: 'short' });

  /** Format a Date to day number, e.g. "7" */
  const dayNum = (date) => date.getDate();

  /** Format a Date to "7 Jun" */
  const dayLabel = (date) =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  /** Format a Date to "HH:MM" */
  const timeStr = (date) =>
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  /** Returns true if two Date objects are on the same calendar day */
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

  /** Returns true if date is today */
  const isToday = (date) => isSameDay(date, new Date());

  /**
   * Returns a new Date set to midnight (00:00:00.000) of the given date.
   */
  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  /**
   * Returns the Monday of the week containing the given date.
   */
  const startOfWeek = (date) => {
    const d   = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon...
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
  };

  /**
   * Add `n` days to a Date, returning a new Date.
   */
  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };

  /**
   * Clamp a value between min and max.
   */
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  /**
   * Convert a hex colour to rgba with given alpha.
   * e.g. hexToRgba("#4A90D9", 0.18) → "rgba(74,144,217,0.18)"
   */
  const hexToRgba = (hex, alpha = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  /**
   * Format a date range label for the toolbar.
   * e.g. "Mon 2 – Sun 8 Jun 2025"
   */
  const rangeLabel = (startDate, endDate) => {
    const sameMonth = startDate.getMonth() === endDate.getMonth();
    const sameYear  = startDate.getFullYear() === endDate.getFullYear();
    const opts = { weekday: 'short', day: 'numeric' };
    const endOpts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    if (!sameMonth) endOpts.month = 'short';
    const s = startDate.toLocaleDateString('en-GB', opts);
    const e = endDate.toLocaleDateString('en-GB', sameYear ? endOpts : { ...endOpts, year: 'numeric' });
    return `${s} – ${e}`;
  };

  /**
   * Given an hour, return a formatted label like "12 AM", "5 PM".
   */
  const hourLabel = (hour) => {
    const normalized = ((hour % 24) + 24) % 24;
    if (normalized === 0)  return '12 AM';
    if (normalized === 12) return '12 PM';
    return normalized < 12 ? `${normalized} AM` : `${normalized - 12} PM`;
  };

  return { dayName, dayNum, dayLabel, timeStr, isSameDay, isToday, startOfDay, startOfWeek, addDays, clamp, hexToRgba, rangeLabel, hourLabel };
})();
