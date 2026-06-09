/**
 * toolbar.js — view toggle buttons and navigation
 */

const Toolbar = (() => {

  const render = () => {
    document.querySelectorAll('.toolbar-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action));
    });
    _initTheme();
    syncActiveButtons();
    updateLabel();
  };

  const handleAction = (action) => {
    switch (action) {
      case 'view-3day':
        State.set({ dayView: '3day' });
        break;
      case 'view-7day': {
        const monday = Utils.startOfWeek(State.get().anchorDate);
        State.set({ dayView: '7day', anchorDate: monday });
        break;
      }
      case 'time-5hour':
        State.set({ timeView: '5hour' });
        break;
      case 'time-24hour':
        State.set({ timeView: '24hour' });
        break;
      case 'prev':
        State.navigate('prev');
        break;
      case 'next':
        State.navigate('next');
        break;
      case 'today':
        State.goToToday();
        break;
      case 'theme-day':
        _applyTheme('light');
        break;
      case 'theme-night':
        _applyTheme('dark');
        break;
    }
    syncActiveButtons();
    updateLabel();
  };

  const syncActiveButtons = () => {
    const { dayView, timeView } = State.get();

    document.querySelectorAll('.toolbar-btn[data-action^="view-"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.action === `view-${dayView}`);
    });

    document.querySelectorAll('.toolbar-btn[data-action^="time-"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.action === `time-${timeView}`);
    });
  };

  const updateLabel = () => {
    const label = document.getElementById('toolbar-label');
    if (!label) return;
    const { days } = State.getVisibleRange();
    label.textContent = Utils.rangeLabel(days[0], days[days.length - 1]);
  };

  // ── Theme ──────────────────────────────────────────────────────────────

  const _initTheme = () => {
    const saved = localStorage.getItem('theme') || 'dark';
    _applyTheme(saved);
  };

  const _applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.querySelectorAll('.toolbar-btn[data-action^="theme-"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.action === `theme-${theme}`);
    });
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    _applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  // Re-sync on state changes that affect toolbar appearance
  State.onChange((keys) => {
    if (keys.some(k => ['dayView','timeView','anchorDate'].includes(k))) {
      syncActiveButtons();
      updateLabel();
    }
  });

  return { render, toggleTheme };
})();
