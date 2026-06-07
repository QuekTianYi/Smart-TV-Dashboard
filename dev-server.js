/**
 * dev-server.js
 *
 * Local development server for household-dashboard.
 * - Serves the app at http://localhost:3000
 * - Proxies iCal requests through /proxy?url=... to bypass browser CORS
 *
 * Usage:
 *   node dev-server.js
 *
 * Requires Node.js (no npm install needed — uses built-in modules only).
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT    = 3000;
const APPDIR  = __dirname;

// ── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

// ── Server ──────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── CORS proxy endpoint: GET /proxy?url=https://... ──────────────────────
  if (pathname === '/proxy') {
    const target = parsed.query.url;

    if (!target || !/^https?:\/\//i.test(target)) {
      res.writeHead(400);
      res.end('Bad request: missing or invalid url param');
      return;
    }

    console.log(`[proxy] ${target}`);

    const targetUrl  = new URL(target);
    const transport  = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = transport.request(
      {
        hostname: targetUrl.hostname,
        path: targetUrl.pathname + targetUrl.search,
        method: 'GET',
        headers: { 'Accept': 'text/calendar', 'User-Agent': 'household-dashboard-dev/1.0' }
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type':                proxyRes.headers['content-type'] || 'text/calendar',
          'Access-Control-Allow-Origin': '*',
        });
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (e) => {
      console.error('[proxy error]', e.message);
      res.writeHead(502);
      res.end(`Proxy error: ${e.message}`);
    });

    proxyReq.end();
    return;
  }

  // ── Static file server ───────────────────────────────────────────────────
  let filePath = path.join(APPDIR, pathname === '/' ? 'index.html' : pathname);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type':                MIME[ext] || 'text/plain',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Household Dashboard dev server running`);
  console.log(`  → http://localhost:${PORT}\n`);
  console.log(`  iCal URLs are proxied automatically.`);
  console.log(`  To stop: Ctrl+C\n`);
});
