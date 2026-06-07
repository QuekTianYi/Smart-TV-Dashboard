/**
 * toolbar.js — view toggle buttons and navigation
 */

const Toolbar = (() => {

  const render = () => {
    document.querySelectorAll('.toolbar-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action));
    });
    syncActiveButtons();
    updateLabel();
  };

  const handleAction = (action) => {
    switch (action) {
      case 'view-3day':
        State.set({ dayView: '3day' });
        break;
      case 'view-7day':
        // In 7-day view, anchor = start of current visible week (Monday)
        const anchor = State.get().anchorDate;
        const monday = _getMondayOf(anchor);
        State.set({ dayView: '7day', anchorDate: monday });
        break;
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

  const _getMondayOf = (date) => {
    const d   = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon...
    const diff = (day === 0) ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Re-sync on state changes that affect toolbar appearance
  State.onChange((keys) => {
    if (keys.some(k => ['dayView','timeView','anchorDate'].includes(k))) {
      syncActiveButtons();
      updateLabel();
    }
  });

  return { render };
})();
