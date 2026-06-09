/**
 * input.js — keyboard, TV remote d-pad, and mouse scroll handling
 *
 * Tizen TV remote key codes:
 *   Left  = 37, Right = 38 (same as keyboard arrow keys)
 *   Up    = 38, Down  = 40
 *   Enter = 13
 *   Back  = 10009
 *   Play/Pause = 415 / 19
 */

const Input = (() => {

  // Which UI element currently has "focus" for remote nav: 'sidebar' | 'calendar'
  let _focus = 'calendar';

  // Index of focused person in sidebar (for remote nav)
  let _sidebarFocusIdx = 0;

  const init = () => {
    document.addEventListener('keydown', _onKeyDown);
    _initMouseScroll();
  };

  // ── Keyboard / Remote ─────────────────────────────────────────────────

  const _onKeyDown = (e) => {
    const key = e.key || e.keyCode;

    // Tab switches focus between sidebar and calendar
    if (e.key === 'Tab') {
      e.preventDefault();
      _focus = _focus === 'sidebar' ? 'calendar' : 'sidebar';
      _syncSidebarFocus();
      return;
    }

    if (_focus === 'sidebar') {
      _handleSidebarKey(e);
    } else {
      _handleCalendarKey(e);
    }
  };

  const _handleSidebarKey = (e) => {
    const people = CONFIG.people;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        _sidebarFocusIdx = Utils.clamp(_sidebarFocusIdx - 1, 0, people.length - 1);
        _syncSidebarFocus();
        break;

      case 'ArrowDown':
        e.preventDefault();
        _sidebarFocusIdx = Utils.clamp(_sidebarFocusIdx + 1, 0, people.length - 1);
        _syncSidebarFocus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        State.togglePerson(_sidebarFocusIdx);
        break;

      case 'ArrowRight':
        // Move focus to calendar
        _focus = 'calendar';
        _blurSidebar();
        break;
    }
  };

  const _handleCalendarKey = (e) => {
    const { timeView } = State.get();

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        State.navigate('prev');
        break;

      case 'ArrowRight':
        e.preventDefault();
        State.navigate('next');
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (timeView === '5hour') State.shiftBand('up');
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (timeView === '5hour') State.shiftBand('down');
        break;

      case 'ArrowLeft':
        // If already at leftmost — shift sidebar focus
        _focus = 'sidebar';
        _syncSidebarFocus();
        break;

      case 't':
      case 'T':
        // Shortcut: jump to today
        State.goToToday();
        break;

      case '3':
        State.set({ dayView: '3day' });
        break;

      case '7':
        State.set({ dayView: '7day' });
        break;

      case 'h':
      case 'H':
        // Toggle time view
        State.set({ timeView: State.get().timeView === '5hour' ? '24hour' : '5hour' });
        break;

      case 'n':
      case 'N':
        Toolbar.toggleTheme();
        break;
    }
  };

  // ── Sidebar focus helpers ──────────────────────────────────────────────

  const _syncSidebarFocus = () => {
    const items = document.querySelectorAll('.person-item');
    items.forEach((item, i) => {
      if (_focus === 'sidebar' && i === _sidebarFocusIdx) {
        item.focus();
      }
    });
  };

  const _blurSidebar = () => {
    document.querySelectorAll('.person-item').forEach(item => item.blur());
  };

  // ── Mouse scroll ──────────────────────────────────────────────────────

  const _initMouseScroll = () => {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    grid.addEventListener('wheel', (e) => {
      e.preventDefault();
      const { timeView, dayView } = State.get();

      // Horizontal scroll → navigate days (in 3-day view)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (dayView === '3day') {
          if (e.deltaX > 30)  State.navigate('next');
          if (e.deltaX < -30) State.navigate('prev');
        }
        return;
      }

      // Vertical scroll — only meaningful in 5h band mode
      if (timeView === '5hour') {
        if (e.deltaY > 50)  State.shiftBand('down');
        if (e.deltaY < -50) State.shiftBand('up');
      }
    }, { passive: false });
  };

  return { init };
})();
