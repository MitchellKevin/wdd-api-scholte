import { WebSocketServer } from 'ws';
import { verifyTokenRaw } from '../lib/auth.js';
import * as gameManager from './gameManager.js';
import { creditCoins, deductCoins } from './db.js';

// Keeps track of all connected clients
const clients = new Map();

function generateClientId() {
  return Math.random().toString(36).slice(2, 10);
}

export function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket) => {
    const clientId = generateClientId();
    clients.set(clientId, { socket, roomId: null, userId: null, username: null });

    // Tell the client their assigned ID
    safeSend(socket, { type: 'WELCOME', clientId });

    socket.on('message', async (raw) => {
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return; // Ignore invalid JSON
      }
      await handleMessage(clientId, message);
    });

    socket.on('close', async () => {
      const client = clients.get(clientId);

      if (client?.roomId) {
        gameManager.removePlayer(client.roomId, clientId);
        broadcastRoomUpdate(client.roomId);
      }

      clients.delete(clientId);
    });
  });

  // ─── Message handler ──────────────────────────────────────────────────────

  async function handleMessage(clientId, message) {
    if (!message?.type) return;

    const client = clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'JOIN_ROOM':
        await handleJoinRoom(clientId, client, message);
        break;

      case 'START_GAME':
        handleStartGame(clientId, client);
        break;

      case 'PLACE_BET':
        await handlePlaceBet(clientId, client, message);
        break;

      case 'HIT':
        await handleHit(clientId, client);
        break;

      case 'STAND':
        await handleStand(clientId, client);
        break;

      case 'PLAY_AGAIN':
        handlePlayAgain(clientId, client);
        break;

      case 'PING':
        safeSend(client.socket, { type: 'PONG' });
        break;
    }
  }

  // ─── Action handlers ──────────────────────────────────────────────────────

  async function handleJoinRoom(clientId, client, message) {
    const payload = verifyTokenRaw(message.token);
    if (!payload) {
      sendError(clientId, 'Niet ingelogd');
      return;
    }

    const roomId = String(message.roomId || '').trim();
    if (!roomId || !/^\d+$/.test(roomId)) {
      sendError(clientId, 'Ongeldig kamer-nummer (alleen cijfers)');
      return;
    }

    // Leave current room before joining a new one
    if (client.roomId) {
      gameManager.removePlayer(client.roomId, clientId);
      broadcastRoomUpdate(client.roomId);
    }

    client.roomId = roomId;
    client.userId = payload.sub;
    client.username = payload.username;

    const result = gameManager.addPlayer(roomId, clientId, payload.sub, payload.username);
    if (result.error) {
      client.roomId = null;
      sendError(clientId, result.error);
      return;
    }

    broadcastRoomUpdate(roomId);
  }

  function handleStartGame(clientId, client) {
    if (!client.roomId) return;

    const result = gameManager.startGame(client.roomId, clientId);
    if (result.error) {
      sendError(clientId, result.error);
      return;
    }

    broadcastRoomUpdate(client.roomId);
  }

  async function handlePlaceBet(clientId, client, message) {
    if (!client.roomId) return;

    const amount = parseInt(message.amount, 10);
    if (!amount || amount < 1) {
      sendError(clientId, 'Ongeldige inzet');
      return;
    }

    // Deduct coins before confirming the bet
    const coinsDeducted = await deductCoins(client.userId, amount);
    if (!coinsDeducted) {
      sendError(clientId, 'Niet genoeg coins');
      return;
    }

    const result = gameManager.placeBet(client.roomId, clientId, amount);
    if (result.error) {
      // Refund the coins if the bet was rejected
      await creditCoins(client.userId, amount);
      sendError(clientId, result.error);
      return;
    }

    const room = gameManager.getRoom(client.roomId);
    if (room?.phase === 'results') {
      await creditWinnings(room);
    }

    broadcastRoomUpdate(client.roomId);
  }

  async function handleHit(clientId, client) {
    if (!client.roomId) return;

    const result = gameManager.hit(client.roomId, clientId);
    if (result.error) {
      sendError(clientId, result.error);
      return;
    }

    const room = gameManager.getRoom(client.roomId);
    if (room?.phase === 'results') {
      await creditWinnings(room);
    }

    broadcastRoomUpdate(client.roomId);
  }

  async function handleStand(clientId, client) {
    if (!client.roomId) return;

    const result = gameManager.stand(client.roomId, clientId);
    if (result.error) {
      sendError(clientId, result.error);
      return;
    }

    const room = gameManager.getRoom(client.roomId);
    if (room?.phase === 'results') {
      await creditWinnings(room);
    }

    broadcastRoomUpdate(client.roomId);
  }

  function handlePlayAgain(clientId, client) {
    if (!client.roomId) return;

    const result = gameManager.startGame(client.roomId, clientId);
    if (result.error) {
      sendError(clientId, result.error);
      return;
    }

    broadcastRoomUpdate(client.roomId);
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  async function creditWinnings(room) {
    if (room.winsCredited) return;

    gameManager.markWinsCredited(room.id);

    for (const player of room.players) {
      if (player.winAmount > 0) {
        await creditCoins(player.userId, player.winAmount);
      }
    }
  }

  function broadcastRoomUpdate(roomId) {
    const roomSnapshot = gameManager.snapshot(roomId);
    if (!roomSnapshot) return;

    for (const [, client] of clients) {
      if (client.roomId === roomId) {
        safeSend(client.socket, { type: 'ROOM_UPDATE', ...roomSnapshot, myUsername: client.username });
      }
    }
  }

  function sendError(clientId, message) {
    const client = clients.get(clientId);
    if (client) {
      safeSend(client.socket, { type: 'ERROR', message });
    }
  }

  function safeSend(socket, message) {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // Client disconnected mid-send, ignore
    }
  }
}
