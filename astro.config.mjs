 import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { attachWebSocket } from './server/websocket.js';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: {
    setup(server) {
      attachWebSocket(server);
    }
  }
});

