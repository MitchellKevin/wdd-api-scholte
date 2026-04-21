import { handler as ssrHandler } from './dist/server/entry.mjs';
import { attachWebSocket } from './server/websocket.js';
import http from 'node:http';

const port = process.env.PORT || 4321;

const server = http.createServer(ssrHandler);

attachWebSocket(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
