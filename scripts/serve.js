import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = (await import('node:url')).fileURLToPath(new URL('../docs', import.meta.url));
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // También probar GitHub Pages bajo el subdirectorio del repositorio.
    const relative = pathname.replace(/^\/1INF36-0881-L5\//, '/');
    const file = path.resolve(root, '.' + (relative.endsWith('/') ? relative + 'index.html' : relative));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.setHeader('Content-Type', ({ '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.html':'text/html; charset=utf-8' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end('No encontrado'); }
}).listen(4173, '127.0.0.1', () => console.log('Avisa Campus: http://127.0.0.1:4173/1INF36-0881-L5/'));
