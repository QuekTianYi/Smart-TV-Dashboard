/**
 * app.js — entry point
 *
 * Bootstraps all modules, fetches calendar data, and sets up auto-refresh.
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

  // ── Error banner (defined before refresh so it's in scope) ───────────

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

  // Initial calendar render (empty — shows grid structure while loading)
  Calendar.render();

  // ── Fetch calendars ──────────────────────────────────────────────────

  const refresh = async () => {
    const range = State.getVisibleRange();

    // Fetch a wider range so navigating doesn't immediately require a refetch
    const fetchStart = Utils.addDays(range.start, -7);
    const fetchEnd   = Utils.addDays(range.end,   14);

    try {
      const { events, errors } = await ICalFetcher.fetchAll(fetchStart, fetchEnd);

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

    // Hide loading overlay
    loadingEl.classList.add('hidden');
    setTimeout(() => loadingEl.remove(), 400);
  };

  // Run immediately
  await refresh();

  // Auto-refresh
  if (CONFIG.refreshIntervalMinutes > 0) {
    setInterval(refresh, CONFIG.refreshIntervalMinutes * 60 * 1000);
  }

  // Refresh when navigating to a new date range
  State.onChange((keys) => {
    if (keys.includes('anchorDate')) {
      refresh();
    }
  });

})();
