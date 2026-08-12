import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.SOLWORLDZ_RELEASE_ROOT || 'dist/solworldz');
const port = Number(process.env.SOLWORLDZ_RELEASE_PORT || 8088);
const host = '127.0.0.1';

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml']
]);

function resolveRequest(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, requested);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

const server = http.createServer((req, res) => {
  const file = resolveRequest(req.url || '/');
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, host, () => console.log(`Serving ${root} at http://${host}:${port}/`));

for (const signal of ['SIGINT', 'SIGTERM']) signal && process.on(signal, () => server.close(() => process.exit(0)));
