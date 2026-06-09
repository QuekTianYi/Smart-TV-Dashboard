/**
 * sky.js — ambient sky background that changes with time of day
 *
 * When enabled (toggled from sidebar), renders a gradient behind the calendar
 * that transitions through dawn → day → dusk → night colours, plus a
 * sun or moon that arcs across the screen.
 */

const Sky = (() => {

  // Key time points → [topColor, horizonColor]
  const _STOPS = [
    [  0, '#05091a', '#0a1428' ],  // midnight
    [  4, '#050a1c', '#0d1230' ],  // deep night
    [  5, '#0c1230', '#1c1f4a' ],  // pre-dawn
    [  6, '#1a2660', '#e8603a' ],  // sunrise
    [  7, '#2a5090', '#f09060' ],  // early morning
    [  9, '#3070b8', '#90c0e8' ],  // morning
    [ 12, '#2a80c0', '#a8d8f8' ],  // noon
    [ 15, '#2a70b0', '#90c0e8' ],  // afternoon
    [ 17, '#2a5090', '#f09060' ],  // late afternoon
    [ 18, '#1a2660', '#e8603a' ],  // sunset
    [ 19, '#140e30', '#4a2040' ],  // dusk
    [ 21, '#08091a', '#180e28' ],  // early night
    [ 24, '#05091a', '#0a1428' ],  // midnight
  ];

  const SUNRISE_H = 6;
  const SUNSET_H  = 18;

  let _el    = null;  // sky-layer div
  let _timer = null;

  // ── Colour helpers ──────────────────────────────────────────────────────

  const _hex2rgb = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];

  const _lerp = (a, b, t) => Math.round(a + (b - a) * t);

  const _lerpColor = (c1, c2, t) => {
    const [r1,g1,b1] = _hex2rgb(c1);
    const [r2,g2,b2] = _hex2rgb(c2);
    return `rgb(${_lerp(r1,r2,t)},${_lerp(g1,g2,t)},${_lerp(b1,b2,t)})`;
  };

  const _gradientForHour = (h) => {
    // Find surrounding stops
    let lo = _STOPS[0], hi = _STOPS[_STOPS.length - 1];
    for (let i = 0; i < _STOPS.length - 1; i++) {
      if (_STOPS[i][0] <= h && h <= _STOPS[i + 1][0]) {
        lo = _STOPS[i]; hi = _STOPS[i + 1]; break;
      }
    }
    const t    = (h - lo[0]) / (hi[0] - lo[0] || 1);
    const top  = _lerpColor(lo[1], hi[1], t);
    const bot  = _lerpColor(lo[2], hi[2], t);
    return `linear-gradient(to bottom, ${top}, ${bot})`;
  };

  // ── Sun / Moon ──────────────────────────────────────────────────────────

  const _celestialInfo = (now) => {
    const h = now.getHours() + now.getMinutes() / 60;
    const isDay = h >= SUNRISE_H && h <= SUNSET_H;

    let progress; // 0 = just rising, 1 = just setting
    if (isDay) {
      progress = (h - SUNRISE_H) / (SUNSET_H - SUNRISE_H);
    } else {
      const NIGHT_LEN = 24 - (SUNSET_H - SUNRISE_H); // 12h
      const hNight    = h >= SUNSET_H ? h - SUNSET_H : h + (24 - SUNSET_H);
      progress = hNight / NIGHT_LEN;
    }

    // Arc: x goes 0→1 linearly, y follows sin arch (peaks at progress=0.5)
    const xPct = 5 + progress * 90;                        // 5% → 95%
    const yPct = 85 - Math.sin(progress * Math.PI) * 70;   // 85% at edges, ~15% at peak

    return { isDay, xPct, yPct };
  };

  // ── DOM ────────────────────────────────────────────────────────────────

  const _buildLayer = () => {
    const el = document.createElement('div');
    el.className = 'sky-layer';
    el.innerHTML = `
      <div class="sky-body" id="sky-body">
        <div class="sky-glow" id="sky-glow"></div>
      </div>
    `;
    return el;
  };

  const _update = () => {
    if (!_el) return;
    const now  = new Date();
    const h    = now.getHours() + now.getMinutes() / 60;
    const info = _celestialInfo(now);

    _el.style.background = _gradientForHour(h);

    const body = document.getElementById('sky-body');
    const glow = document.getElementById('sky-glow');
    if (!body || !glow) return;

    body.style.left = `${info.xPct}%`;
    body.style.top  = `${info.yPct}%`;

    if (info.isDay) {
      body.classList.remove('moon');
      body.classList.add('sun');
      glow.style.opacity = '1';
    } else {
      body.classList.remove('sun');
      body.classList.add('moon');
      glow.style.opacity = '0';
    }
  };

  // ── Sidebar indicator ──────────────────────────────────────────────────

  const getSkyIcon = () => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return (h >= SUNRISE_H && h <= SUNSET_H) ? '☀' : '🌙';
  };

  // ── Public API ─────────────────────────────────────────────────────────

  const enable = () => {
    if (_el) return;
    const main = document.getElementById('main');
    if (!main) return;
    _el = _buildLayer();
    main.insertBefore(_el, main.firstChild);
    _update();
    _timer = setInterval(_update, 60_000);
  };

  const disable = () => {
    if (_el) { _el.remove(); _el = null; }
    if (_timer) { clearInterval(_timer); _timer = null; }
  };

  const toggle = () => {
    const enabled = !_el;
    enabled ? enable() : disable();
    try { localStorage.setItem('skyEnabled', enabled ? '1' : '0'); } catch (_) {}
    return enabled;
  };

  const isEnabled = () => !!_el;

  const init = () => {
    const saved = localStorage.getItem('skyEnabled');
    if (saved === '1') enable();
  };

  return { init, enable, disable, toggle, isEnabled, getSkyIcon };
})();
