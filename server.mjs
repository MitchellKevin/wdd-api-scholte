import 'dotenv/config';
import { handler as ssrHandler } from './dist/server/entry.mjs';
import { attachWebSocket } from './server/websocket.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, 'dist/client');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

function serveStatic(req, res, next) {
  const filePath = path.join(clientDir, req.url.split('?')[0]);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  } else {
    next();
  }
}

const port = process.env.PORT || 4321;

const server = http.createServer((req, res) => {
  serveStatic(req, res, () => ssrHandler(req, res));
});

attachWebSocket(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
