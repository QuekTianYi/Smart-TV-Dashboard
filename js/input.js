/**
 * input.js — keyboard, TV remote d-pad, and mouse scroll handling
 *
 * Tizen TV remote key codes:
 *   Left = 37, Up = 38, Right = 39, Down = 40 (same as keyboard arrow keys)
 *   Enter = 13
 *   Back  = 10009
 *   Play/Pause = 415 / 19
 *
 * Focus zones (for remote/keyboard nav): 'toolbar' | 'calendar' | 'sidebar'
 *   calendar → toolbar   : double-tap ArrowUp
 *   calendar → sidebar   : double-tap the arrow key facing the sidebar
 *                          (ArrowRight/ArrowLeft, whichever CONFIG.sidebarPosition is)
 *   toolbar  → calendar  : ArrowDown
 *   toolbar  → sidebar   : ArrowLeft/ArrowRight past the button nearest the sidebar
 *   sidebar  → calendar  : ArrowLeft/ArrowRight back toward the calendar
 * A single press of an arrow key always does its normal in-zone action
 * (day nav, band scroll) — only a second press of the same key within
 * DOUBLE_TAP_MS switches focus zones.
 * Tab also cycles through all three zones, for keyboard testing in a browser.
 */

const Input = (() => {

  // Which UI zone currently has "focus" for remote nav: 'toolbar' | 'sidebar' | 'calendar'
  let _focus = 'calendar';

  // Index of focused person in sidebar (for remote nav)
  let _sidebarFocusIdx = 0;

  // Index of focused button in the toolbar (for remote nav)
  let _toolbarFocusIdx = 0;

  // Which side the sidebar renders on — determines which arrow key reaches it
  const _sidebarSide = CONFIG.sidebarPosition === 'right' ? 'right' : 'left';

  // Double-tap detection (same key pressed twice within this window = zone switch)
  const DOUBLE_TAP_MS = 400;
  let _lastKey = null;
  let _lastKeyTime = 0;

  const _isDoubleTap = (key) => {
    const now = Date.now();
    const isDouble = _lastKey === key && (now - _lastKeyTime) < DOUBLE_TAP_MS;
    _lastKey = isDouble ? null : key;
    _lastKeyTime = now;
    return isDouble;
  };

  const init = () => {
    document.addEventListener('keydown', _onKeyDown);
    _initMouseScroll();
  };

  // ── Keyboard / Remote ─────────────────────────────────────────────────

  const _onKeyDown = (e) => {
    // Tab cycles focus through toolbar → calendar → sidebar (keyboard only —
    // TV remotes don't send Tab, but the zone switches below cover those)
    if (e.key === 'Tab') {
      e.preventDefault();
      const order = ['toolbar', 'calendar', 'sidebar'];
      _focus = order[(order.indexOf(_focus) + 1) % order.length];
      _syncFocus();
      return;
    }

    if (_focus === 'toolbar') {
      _handleToolbarKey(e);
    } else if (_focus === 'sidebar') {
      _handleSidebarKey(e);
    } else {
      _handleCalendarKey(e);
    }
  };

  // ── Toolbar ────────────────────────────────────────────────────────────

  const _handleToolbarKey = (e) => {
    const buttons = _toolbarButtons();
    if (!buttons.length) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (_sidebarSide === 'left' && _toolbarFocusIdx === 0) {
          _focus = 'sidebar';
        } else {
          _toolbarFocusIdx = Utils.clamp(_toolbarFocusIdx - 1, 0, buttons.length - 1);
        }
        _syncFocus();
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (_sidebarSide === 'right' && _toolbarFocusIdx === buttons.length - 1) {
          _focus = 'sidebar';
        } else {
          _toolbarFocusIdx = Utils.clamp(_toolbarFocusIdx + 1, 0, buttons.length - 1);
        }
        _syncFocus();
        break;

      case 'ArrowDown':
        e.preventDefault();
        _focus = 'calendar';
        _syncFocus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        buttons[_toolbarFocusIdx].click();
        break;
    }
  };

  // ── Sidebar ────────────────────────────────────────────────────────────

  const _handleSidebarKey = (e) => {
    const people = CONFIG.people;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        _sidebarFocusIdx = Utils.clamp(_sidebarFocusIdx - 1, 0, people.length - 1);
        _syncFocus();
        break;

      case 'ArrowDown':
        e.preventDefault();
        _sidebarFocusIdx = Utils.clamp(_sidebarFocusIdx + 1, 0, people.length - 1);
        _syncFocus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        State.togglePerson(_sidebarFocusIdx);
        break;

      case 'ArrowLeft':
        if (_sidebarSide === 'right') {
          e.preventDefault();
          _focus = 'calendar';
          _syncFocus();
        }
        break;

      case 'ArrowRight':
        if (_sidebarSide === 'left') {
          e.preventDefault();
          _focus = 'calendar';
          _syncFocus();
        }
        break;
    }
  };

  const _handleCalendarKey = (e) => {
    const { timeView, bandStartHour } = State.get();

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (_sidebarSide === 'left' && _isDoubleTap('ArrowLeft')) {
          _focus = 'sidebar';
          _syncFocus();
        } else {
          State.navigate('prev');
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (_sidebarSide === 'right' && _isDoubleTap('ArrowRight')) {
          _focus = 'sidebar';
          _syncFocus();
        } else {
          State.navigate('next');
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (_isDoubleTap('ArrowUp')) {
          _focus = 'toolbar';
          _syncFocus();
        } else if (timeView === '5hour' && bandStartHour > 0) {
          State.shiftBand('up');
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (timeView === '5hour') State.shiftBand('down');
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

  // ── Focus helpers ──────────────────────────────────────────────────────

  const _toolbarButtons = () => Array.from(document.querySelectorAll('.toolbar-btn[data-action]'));

  /** Apply the DOM focus (and its :focus styling) for the current zone */
  const _syncFocus = () => {
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }

    if (_focus === 'sidebar') {
      const items = document.querySelectorAll('.person-item');
      if (items[_sidebarFocusIdx]) items[_sidebarFocusIdx].focus();
    } else if (_focus === 'toolbar') {
      const buttons = _toolbarButtons();
      if (buttons[_toolbarFocusIdx]) buttons[_toolbarFocusIdx].focus();
    }
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
