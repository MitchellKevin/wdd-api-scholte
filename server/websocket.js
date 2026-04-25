import { WebSocketServer } from 'ws';
import { verifyTokenRaw } from '../lib/auth.js';
import * as gameManager from './gameManager.js';
import * as pokerManager from './pokerManager.js';
import { creditCoins, deductCoins } from './db.js';

const clients = new Map();

function generateClientId() {
  return Math.random().toString(36).slice(2, 10);
}

export function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket) => {
    const clientId = generateClientId();
    clients.set(clientId, { socket, roomId: null, game: null, userId: null, username: null });

    safeSend(socket, { type: 'WELCOME', clientId });

    socket.on('message', async (raw) => {
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return;
      }
      await handleMessage(clientId, message);
    });

    socket.on('close', async () => {
      const client = clients.get(clientId);

      if (client?.roomId) {
        if (client.game === 'poker') {
          pokerManager.removePlayer(client.roomId, clientId);
          broadcastPokerRoomUpdate(client.roomId);
        } else {
          gameManager.removePlayer(client.roomId, clientId);
          broadcastRoomUpdate(client.roomId);
        }
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
      // ── Blackjack ────────────────────────────────────────────────────────
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

      // ── Poker ─────────────────────────────────────────────────────────────
      case 'POKER_JOIN_ROOM':
        await handlePokerJoinRoom(clientId, client, message);
        break;
      case 'POKER_START_GAME':
        handlePokerStartGame(clientId, client);
        break;
      case 'POKER_PLACE_ANTE':
        await handlePokerPlaceAnte(clientId, client, message);
        break;
      case 'POKER_FOLD':
        await handlePokerFold(clientId, client);
        break;
      case 'POKER_CHECK':
        await handlePokerCheck(clientId, client);
        break;
      case 'POKER_CALL':
        await handlePokerCall(clientId, client);
        break;
      case 'POKER_RAISE':
        await handlePokerRaise(clientId, client, message);
        break;
      case 'POKER_PLAY_AGAIN':
        handlePokerPlayAgain(clientId, client);
        break;

      case 'PING':
        safeSend(client.socket, { type: 'PONG' });
        break;
    }
  }

  // ─── Blackjack handlers ───────────────────────────────────────────────────

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

    if (client.roomId) {
      if (client.game === 'poker') {
        pokerManager.removePlayer(client.roomId, clientId);
        broadcastPokerRoomUpdate(client.roomId);
      } else {
        gameManager.removePlayer(client.roomId, clientId);
        broadcastRoomUpdate(client.roomId);
      }
    }

    client.roomId = roomId;
    client.game = 'blackjack';
    client.userId = payload.sub;
    client.username = payload.username;

    const result = gameManager.addPlayer(roomId, clientId, payload.sub, payload.username);
    if (result.error) {
      client.roomId = null;
      client.game = null;
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

    const coinsDeducted = await deductCoins(client.userId, amount);
    if (!coinsDeducted) {
      sendError(clientId, 'Niet genoeg coins');
      return;
    }

    const result = gameManager.placeBet(client.roomId, clientId, amount);
    if (result.error) {
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

  // ─── Poker handlers ───────────────────────────────────────────────────────

  async function handlePokerJoinRoom(clientId, client, message) {
    const payload = verifyTokenRaw(message.token);
    if (!payload) { sendError(clientId, 'Niet ingelogd'); return; }

    const roomId = String(message.roomId || '').trim();
    if (!roomId || !/^\d+$/.test(roomId)) {
      sendError(clientId, 'Ongeldig kamer-nummer (alleen cijfers)');
      return;
    }

    if (client.roomId) {
      if (client.game === 'poker') {
        pokerManager.removePlayer(client.roomId, clientId);
        broadcastPokerRoomUpdate(client.roomId);
      } else {
        gameManager.removePlayer(client.roomId, clientId);
        broadcastRoomUpdate(client.roomId);
      }
    }

    client.roomId = roomId;
    client.game = 'poker';
    client.userId = payload.sub;
    client.username = payload.username;

    const result = pokerManager.addPlayer(roomId, clientId, payload.sub, payload.username);
    if (result.error) {
      client.roomId = null;
      client.game = null;
      sendError(clientId, result.error);
      return;
    }

    broadcastPokerRoomUpdate(roomId);
  }

  function handlePokerStartGame(clientId, client) {
    if (!client.roomId) return;
    const result = pokerManager.startGame(client.roomId, clientId);
    if (result.error) { sendError(clientId, result.error); return; }
    broadcastPokerRoomUpdate(client.roomId);
  }

  async function handlePokerPlaceAnte(clientId, client, message) {
    if (!client.roomId) return;

    const amount = parseInt(message.amount, 10);
    if (!amount || amount < 1) { sendError(clientId, 'Ongeldige inzet'); return; }

    const ok = await deductCoins(client.userId, amount);
    if (!ok) { sendError(clientId, 'Niet genoeg coins'); return; }

    const result = pokerManager.placeAnte(client.roomId, clientId, amount);
    if (result.error) {
      await creditCoins(client.userId, amount);
      sendError(clientId, result.error);
      return;
    }

    const room = pokerManager.getRoom(client.roomId);
    if (room?.phase === 'results') await creditPokerWinnings(room);

    broadcastPokerRoomUpdate(client.roomId);
  }

  async function handlePokerFold(clientId, client) {
    if (!client.roomId) return;
    const result = pokerManager.playerFold(client.roomId, clientId);
    if (result.error) { sendError(clientId, result.error); return; }

    const room = pokerManager.getRoom(client.roomId);
    if (room?.phase === 'results') await creditPokerWinnings(room);

    broadcastPokerRoomUpdate(client.roomId);
  }

  async function handlePokerCheck(clientId, client) {
    if (!client.roomId) return;
    const result = pokerManager.playerCheck(client.roomId, clientId);
    if (result.error) { sendError(clientId, result.error); return; }

    const room = pokerManager.getRoom(client.roomId);
    if (room?.phase === 'results') await creditPokerWinnings(room);

    broadcastPokerRoomUpdate(client.roomId);
  }

  async function handlePokerCall(clientId, client) {
    if (!client.roomId) return;

    const room = pokerManager.getRoom(client.roomId);
    const player = room?.players.find(p => p.clientId === clientId);
    if (!room || !player) return;

    const callAmount = room.currentBet - player.streetBet;
    if (callAmount > 0) {
      const ok = await deductCoins(client.userId, callAmount);
      if (!ok) { sendError(clientId, 'Niet genoeg coins'); return; }
    }

    const result = pokerManager.playerCall(client.roomId, clientId);
    if (result.error) {
      if (callAmount > 0) await creditCoins(client.userId, callAmount);
      sendError(clientId, result.error);
      return;
    }

    const updatedRoom = pokerManager.getRoom(client.roomId);
    if (updatedRoom?.phase === 'results') await creditPokerWinnings(updatedRoom);

    broadcastPokerRoomUpdate(client.roomId);
  }

  async function handlePokerRaise(clientId, client, message) {
    if (!client.roomId) return;

    const raiseBy = parseInt(message.raiseBy, 10);
    if (!raiseBy || raiseBy < 1) { sendError(clientId, 'Ongeldige raise'); return; }

    const room = pokerManager.getRoom(client.roomId);
    const player = room?.players.find(p => p.clientId === clientId);
    if (!room || !player) return;

    const callAmount = room.currentBet - player.streetBet;
    const totalCost = callAmount + raiseBy;

    const ok = await deductCoins(client.userId, totalCost);
    if (!ok) { sendError(clientId, 'Niet genoeg coins'); return; }

    const result = pokerManager.playerRaise(client.roomId, clientId, raiseBy);
    if (result.error) {
      await creditCoins(client.userId, totalCost);
      sendError(clientId, result.error);
      return;
    }

    const updatedRoom = pokerManager.getRoom(client.roomId);
    if (updatedRoom?.phase === 'results') await creditPokerWinnings(updatedRoom);

    broadcastPokerRoomUpdate(client.roomId);
  }

  function handlePokerPlayAgain(clientId, client) {
    if (!client.roomId) return;
    const result = pokerManager.startGame(client.roomId, clientId);
    if (result.error) { sendError(clientId, result.error); return; }
    broadcastPokerRoomUpdate(client.roomId);
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

  async function creditPokerWinnings(room) {
    if (room.winsCredited) return;
    pokerManager.markWinsCredited(room.id);
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
      if (client.roomId === roomId && client.game !== 'poker') {
        safeSend(client.socket, { type: 'ROOM_UPDATE', ...roomSnapshot, myUsername: client.username });
      }
    }
  }

  function broadcastPokerRoomUpdate(roomId) {
    const room = pokerManager.getRoom(roomId);
    if (!room) return;

    const revealHands = room.phase === 'results';

    for (const [, client] of clients) {
      if (client.roomId !== roomId || client.game !== 'poker') continue;

      const players = room.players.map(p => {
        const isMe = p.username === client.username;
        const showHand = isMe || (revealHands && p.status !== 'folded');
        const hasCards = ['playing', 'folded'].includes(p.status);

        let handResult = null;
        if (revealHands) {
          handResult = p.handResult;
        } else if (isMe && p.hand?.length >= 2 && room.community.length >= 3) {
          handResult = pokerManager.getBestHand(p.hand, room.community);
        }

        return {
          username: p.username,
          hand: showHand ? p.hand : [],
          hasCards,
          ante: p.ante,
          streetBet: p.streetBet,
          totalBet: p.totalBet,
          status: p.status,
          isHost: p.isHost,
          result: p.result,
          winAmount: p.winAmount,
          handResult,
        };
      });

      safeSend(client.socket, {
        type: 'POKER_ROOM_UPDATE',
        id: room.id,
        phase: room.phase,
        pot: room.pot,
        currentBet: room.currentBet,
        currentPlayerIndex: room.currentPlayerIndex,
        community: room.community,
        players,
        myUsername: client.username,
      });
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
