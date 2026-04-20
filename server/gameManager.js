const rooms = new Map();
const MAX_PLAYERS = 4;
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function handValue(hand) {
  let total = 0, aces = 0;
  for (const c of hand) {
    if (c.rank === 'A') { aces++; total += 11; }
    else if (['J', 'Q', 'K'].includes(c.rank)) total += 10;
    else total += parseInt(c.rank, 10);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function ensureRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: [],
      dealer: { hand: [], hiddenCard: null },
      deck: [],
      phase: 'waiting',
      currentPlayerIndex: 0,
      winsCredited: false
    });
  }
  return rooms.get(roomId);
}

export function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

export function addPlayer(roomId, clientId, userId, username) {
  const room = ensureRoom(roomId);
  if (room.players.length >= MAX_PLAYERS) return { error: 'Kamer is vol (max 4 spelers)' };
  if (room.phase !== 'waiting' && room.phase !== 'results') return { error: 'Spel is al bezig' };
  if (room.players.find(p => p.userId === userId)) return { error: 'Al in deze kamer' };
  const isHost = room.players.length === 0;
  room.players.push({ clientId, userId, username, hand: [], bet: 0, status: 'waiting', isHost, result: null, winAmount: 0 });
  return { ok: true };
}

export function removePlayer(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const idx = room.players.findIndex(p => p.clientId === clientId);
  if (idx === -1) return;
  const wasHost = room.players[idx].isHost;
  room.players.splice(idx, 1);
  if (room.players.length === 0) { rooms.delete(roomId); return; }
  if (wasHost) room.players[0].isHost = true;
  if (room.phase === 'playing') {
    if (idx < room.currentPlayerIndex) {
      room.currentPlayerIndex--;
    } else if (idx === room.currentPlayerIndex) {
      if (room.currentPlayerIndex >= room.players.length) {
        playDealer(room);
      } else {
        let found = false;
        for (let i = room.currentPlayerIndex; i < room.players.length; i++) {
          if (room.players[i].status === 'playing') {
            room.currentPlayerIndex = i; found = true; break;
          }
        }
        if (!found) playDealer(room);
      }
    }
  }
}

export function startGame(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Kamer niet gevonden' };
  const host = room.players.find(p => p.isHost);
  if (!host || host.clientId !== clientId) return { error: 'Alleen de host kan starten' };
  if (room.phase !== 'waiting' && room.phase !== 'results') return { error: 'Kan nu niet starten' };
  room.phase = 'betting';
  room.winsCredited = false;
  for (const p of room.players) {
    p.hand = []; p.bet = 0; p.status = 'betting'; p.result = null; p.winAmount = 0;
  }
  return { ok: true };
}

export function placeBet(roomId, clientId, amount) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Kamer niet gevonden' };
  if (room.phase !== 'betting') return { error: 'Niet in inzetfase' };
  const player = room.players.find(p => p.clientId === clientId);
  if (!player) return { error: 'Speler niet gevonden' };
  if (player.status !== 'betting') return { error: 'Inzet al geplaatst' };
  if (amount < 1) return { error: 'Inzet moet minimaal 1 zijn' };
  player.bet = amount;
  player.status = 'ready';
  if (room.players.every(p => p.status === 'ready')) dealCards(room);
  return { ok: true };
}

function dealCards(room) {
  room.phase = 'playing';
  room.deck = shuffle(createDeck());
  for (const p of room.players) {
    p.hand = [room.deck.pop(), room.deck.pop()];
    p.status = 'playing';
  }
  room.dealer.hand = [room.deck.pop()];
  room.dealer.hiddenCard = room.deck.pop();
  room.currentPlayerIndex = 0;
}

function advanceIfNeeded(room) {
  for (let i = room.currentPlayerIndex + 1; i < room.players.length; i++) {
    if (room.players[i].status === 'playing') {
      room.currentPlayerIndex = i;
      return;
    }
  }
  playDealer(room);
}

function playDealer(room) {
  room.phase = 'dealer';
  if (room.dealer.hiddenCard) {
    room.dealer.hand.push(room.dealer.hiddenCard);
    room.dealer.hiddenCard = null;
  }
  while (handValue(room.dealer.hand) < 17 && room.deck.length > 0) {
    room.dealer.hand.push(room.deck.pop());
  }
  resolveResults(room);
}

function resolveResults(room) {
  room.phase = 'results';
  room.winsCredited = false;
  const dv = handValue(room.dealer.hand);
  const dealerBust = dv > 21;
  for (const p of room.players) {
    const pv = handValue(p.hand);
    if (pv > 21) {
      p.result = 'lose'; p.winAmount = 0;
    } else if (dealerBust || pv > dv) {
      p.result = 'win'; p.winAmount = p.bet * 2;
    } else if (pv === dv) {
      p.result = 'push'; p.winAmount = p.bet;
    } else {
      p.result = 'lose'; p.winAmount = 0;
    }
  }
}

export function hit(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Kamer niet gevonden' };
  if (room.phase !== 'playing') return { error: 'Niet in speelfase' };
  const current = room.players[room.currentPlayerIndex];
  if (!current || current.clientId !== clientId) return { error: 'Niet jouw beurt' };
  current.hand.push(room.deck.pop());
  if (handValue(current.hand) > 21) {
    current.status = 'busted';
    advanceIfNeeded(room);
  }
  return { ok: true };
}

export function stand(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Kamer niet gevonden' };
  if (room.phase !== 'playing') return { error: 'Niet in speelfase' };
  const current = room.players[room.currentPlayerIndex];
  if (!current || current.clientId !== clientId) return { error: 'Niet jouw beurt' };
  current.status = 'stood';
  advanceIfNeeded(room);
  return { ok: true };
}

export function markWinsCredited(roomId) {
  const room = rooms.get(roomId);
  if (room) room.winsCredited = true;
}

export function snapshot(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const showFull = room.phase === 'dealer' || room.phase === 'results';
  return {
    id: room.id,
    phase: room.phase,
    currentPlayerIndex: room.currentPlayerIndex,
    players: room.players.map(p => ({
      username: p.username,
      hand: p.hand,
      bet: p.bet,
      status: p.status,
      isHost: p.isHost,
      result: p.result,
      winAmount: p.winAmount,
      handValue: handValue(p.hand)
    })),
    dealer: {
      hand: room.dealer.hand,
      hasHiddenCard: !showFull && room.dealer.hiddenCard !== null,
      handValue: handValue(room.dealer.hand)
    }
  };
}
