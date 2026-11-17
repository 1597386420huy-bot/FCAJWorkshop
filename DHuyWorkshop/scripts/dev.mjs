import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, loadConfig } from './lib/site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const args = process.argv.slice(2);
const watch = !args.includes('--no-watch');
const portArg = args.find((a) => a.startsWith('--port='));
let port = Number(portArg?.split('=')[1] || process.env.PORT || 1313);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const RELOAD_SNIPPET = '<script>new EventSource("/__reload").onmessage=function(){location.reload()}</script>';
const clients = new Set();

function rebuild() {
  try {
    const { pages } = build(root);
    console.log(`[${new Date().toLocaleTimeString('en-US')}] Built ${pages} pages`);
    for (const res of clients) res.write('data: reload\n\n');
  } catch (error) {
    console.error('Build error:', error.message);
  }
}

function send(res, status, body, type = 'text/plain; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const base = loadConfig(root).baseURL;
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }
  if (pathname === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (base && pathname.startsWith(base)) pathname = pathname.slice(base.length) || '/';
  let file = path.join(publicDir, path.normalize(pathname));
  if (!file.startsWith(publicDir)) return send(res, 403, 'Forbidden');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!pathname.endsWith('/')) return send(res, 301, '', 'text/plain', { Location: `${base}${pathname}/` });
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) {
    const notFound = path.join(publicDir, '404.html');
    return send(res, 404, fs.existsSync(notFound) ? fs.readFileSync(notFound, 'utf8') : 'Page not found', 'text/html; charset=utf-8');
  }
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  if (type.startsWith('text/html')) {
    const html = fs.readFileSync(file, 'utf8');
    return send(res, 200, watch ? html.replace('</body>', `${RELOAD_SNIPPET}</body>`) : html, type);
  }
  send(res, 200, fs.readFileSync(file), type);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
    port += 1;
    server.listen(port);
  } else throw error;
});

server.on('listening', () => {
  console.log(`\n  Report site running at:  http://localhost:${port}/\n  Press Ctrl+C to stop.\n`);
});

rebuild();
server.listen(port);

if (watch) {
  let timer;
  const onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  };
  for (const target of ['content', 'layouts', 'static', 'config.json']) {
    const full = path.join(root, target);
    if (fs.existsSync(full)) fs.watch(full, { recursive: true }, onChange);
  }
}
