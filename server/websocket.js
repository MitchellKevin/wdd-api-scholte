import { WebSocketServer } from 'ws';
import { verifyTokenRaw } from '../lib/auth.js';
import * as gm from './gameManager.js';
import { creditCoins, deductCoins } from './db.js';

const clients = new Map();

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket) => {
    const clientId = genId();
    clients.set(clientId, { socket, roomId: null, userId: null, username: null });
    safeSend(socket, { type: 'WELCOME', clientId });

    socket.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(String(raw)); } catch { return; }
      await handleMessage(clientId, msg);
    });

    socket.on('close', async () => {
      const c = clients.get(clientId);
      if (c?.roomId) {
        gm.removePlayer(c.roomId, clientId);
        broadcastRoom(c.roomId);
      }
      clients.delete(clientId);
    });
  });

  async function handleMessage(clientId, msg) {
    if (!msg?.type) return;
    const client = clients.get(clientId);
    if (!client) return;

    switch (msg.type) {
      case 'JOIN_ROOM': {
        const payload = verifyTokenRaw(msg.token);
        if (!payload) { sendErr(clientId, 'Niet ingelogd'); return; }
        const roomId = String(msg.roomId || '').trim();
        if (!roomId || !/^\d+$/.test(roomId)) { sendErr(clientId, 'Ongeldig kamer-nummer (alleen cijfers)'); return; }
        if (client.roomId) { gm.removePlayer(client.roomId, clientId); broadcastRoom(client.roomId); }
        client.roomId = roomId;
        client.userId = payload.sub;
        client.username = payload.username;
        const result = gm.addPlayer(roomId, clientId, payload.sub, payload.username);
        if (result.error) { client.roomId = null; sendErr(clientId, result.error); return; }
        broadcastRoom(roomId);
        break;
      }

      case 'START_GAME': {
        if (!client.roomId) return;
        const result = gm.startGame(client.roomId, clientId);
        if (result.error) { sendErr(clientId, result.error); return; }
        broadcastRoom(client.roomId);
        break;
      }

      case 'PLACE_BET': {
        if (!client.roomId) return;
        const amount = parseInt(msg.amount, 10);
        if (!amount || amount < 1) { sendErr(clientId, 'Ongeldige inzet'); return; }
        const deducted = await deductCoins(client.userId, amount);
        if (!deducted) { sendErr(clientId, 'Niet genoeg coins'); return; }
        const result = gm.placeBet(client.roomId, clientId, amount);
        if (result.error) {
          await creditCoins(client.userId, amount);
          sendErr(clientId, result.error); return;
        }
        const room = gm.getRoom(client.roomId);
        if (room?.phase === 'results') await creditIfNeeded(room);
        broadcastRoom(client.roomId);
        break;
      }

      case 'HIT': {
        if (!client.roomId) return;
        const result = gm.hit(client.roomId, clientId);
        if (result.error) { sendErr(clientId, result.error); return; }
        const room = gm.getRoom(client.roomId);
        if (room?.phase === 'results') await creditIfNeeded(room);
        broadcastRoom(client.roomId);
        break;
      }

      case 'STAND': {
        if (!client.roomId) return;
        const result = gm.stand(client.roomId, clientId);
        if (result.error) { sendErr(clientId, result.error); return; }
        const room = gm.getRoom(client.roomId);
        if (room?.phase === 'results') await creditIfNeeded(room);
        broadcastRoom(client.roomId);
        break;
      }

      case 'PLAY_AGAIN': {
        if (!client.roomId) return;
        const result = gm.startGame(client.roomId, clientId);
        if (result.error) { sendErr(clientId, result.error); return; }
        broadcastRoom(client.roomId);
        break;
      }

      case 'PING':
        safeSend(client.socket, { type: 'PONG' });
        break;
    }
  }

  async function creditIfNeeded(room) {
    if (room.winsCredited) return;
    gm.markWinsCredited(room.id);
    for (const p of room.players) {
      if (p.winAmount > 0) await creditCoins(p.userId, p.winAmount);
    }
  }

  function broadcastRoom(roomId) {
    const snap = gm.snapshot(roomId);
    if (!snap) return;
    for (const [, c] of clients) {
      if (c.roomId === roomId) {
        safeSend(c.socket, { type: 'ROOM_UPDATE', ...snap, myUsername: c.username });
      }
    }
  }

  function sendErr(clientId, message) {
    const c = clients.get(clientId);
    if (c) safeSend(c.socket, { type: 'ERROR', message });
  }

  function safeSend(socket, msg) {
    try { socket.send(JSON.stringify(msg)); } catch {}
  }
}
