/**
 * app.js — entry point
 *
 * Bootstraps all modules, fetches calendar data, and sets up auto-refresh.
 *
 * Load strategy:
 *   1. If a localStorage cache exists, render it immediately (no blank screen).
 *   2. Fetch fresh data in the background; silently update when done.
 *   3. On navigation, only re-fetch if the new visible range falls outside
 *      what has already been fetched.
 *   4. Auto-refresh on the configured interval always forces a fresh fetch.
 */

(async () => {

  // ── Loading overlay ──────────────────────────────────────────────────

  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading-overlay';
  loadingEl.textContent = 'Loading calendars…';
  document.getElementById('app').appendChild(loadingEl);

  const errorBanner = document.createElement('div');
  errorBanner.className = 'error-banner';
  document.getElementById('app').appendChild(errorBanner);

  // ── Error banner ─────────────────────────────────────────────────────

  let _errorTimer = null;

  const showError = (msg) => {
    errorBanner.textContent = msg;
    errorBanner.classList.add('visible');
    if (_errorTimer) clearTimeout(_errorTimer);
    _errorTimer = setTimeout(() => errorBanner.classList.remove('visible'), 6000);
  };

  // ── Init UI modules ──────────────────────────────────────────────────

  Sidebar.render();
  Toolbar.render();
  Input.init();
  Calendar.render();
  Sky.init();

  // ── Cache helpers ────────────────────────────────────────────────────

  const CACHE_KEY = 'dashboard-events-v1';

  const _saveCache = (events, rangeStart, rangeEnd) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        events: events.map(ev => ({
          ...ev,
          start: ev.start.getTime(),
          end:   ev.end.getTime(),
        })),
        rangeStart: rangeStart.getTime(),
        rangeEnd:   rangeEnd.getTime(),
        fetchedAt:  Date.now(),
      }));
    } catch (_) { /* quota exceeded or private mode — silently skip */ }
  };

  const _loadCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        events:     data.events.map(ev => ({ ...ev, start: new Date(ev.start), end: new Date(ev.end) })),
        rangeStart: new Date(data.rangeStart),
        rangeEnd:   new Date(data.rangeEnd),
        fetchedAt:  new Date(data.fetchedAt),
      };
    } catch (_) { return null; }
  };

  // ── Fetch tracking (skip refetch when range is already covered) ──────

  let _fetchedStart = null;
  let _fetchedEnd   = null;

  const _rangeIsCovered = (fetchStart, fetchEnd) =>
    _fetchedStart !== null &&
    fetchStart >= _fetchedStart &&
    fetchEnd   <= _fetchedEnd;

  // ── Refresh ──────────────────────────────────────────────────────────

  /**
   * Fetch fresh calendar data.
   * @param {boolean} ignoreRangeCheck  If true, always fetch even if range is covered.
   */
  const refresh = async (ignoreRangeCheck = false) => {
    const range      = State.getVisibleRange();
    const fetchStart = Utils.addDays(range.start, -7);
    const fetchEnd   = Utils.addDays(range.end,   14);

    if (!ignoreRangeCheck && _rangeIsCovered(fetchStart, fetchEnd)) return;

    try {
      const { events, errors } = await ICalFetcher.fetchAll(fetchStart, fetchEnd);

      _fetchedStart = fetchStart;
      _fetchedEnd   = fetchEnd;
      _saveCache(events, fetchStart, fetchEnd);

      State.set({ events, loaded: true, fetchErrors: errors });
      Sidebar.setLastUpdated(new Date());

      if (errors.length > 0) {
        const names = errors.map(e => `${e.person} (${e.label})`).join(', ');
        showError(`Some calendars failed to load: ${names}`);
      }
    } catch (e) {
      console.error('Fatal fetch error:', e);
      showError('Failed to load calendars. Check your config.js URLs.');
    }
  };

  // ── Startup ──────────────────────────────────────────────────────────

  const _hideOverlay = () => {
    loadingEl.classList.add('hidden');
    setTimeout(() => loadingEl.remove(), 400);
  };

  const cached = _loadCache();

  if (cached) {
    // Render cached data immediately — no loading screen
    _fetchedStart = cached.rangeStart;
    _fetchedEnd   = cached.rangeEnd;
    State.set({ events: cached.events, loaded: true });
    Sidebar.setLastUpdated(cached.fetchedAt);
    _hideOverlay();

    // Background refresh — don't await, UI stays responsive
    refresh(true);
  } else {
    // No cache: wait for first fetch before hiding overlay
    await refresh(true);
    _hideOverlay();
  }

  // ── Auto-refresh ─────────────────────────────────────────────────────

  if (CONFIG.refreshIntervalMinutes > 0) {
    setInterval(() => refresh(true), CONFIG.refreshIntervalMinutes * 60 * 1000);
  }

  // ── Re-fetch on navigation (only if outside fetched range) ───────────

  State.onChange((keys) => {
    if (keys.includes('anchorDate')) {
      refresh(false);
    }
  });

})();
