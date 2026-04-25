const pokerRooms = new Map();
const MAX_PLAYERS = 6;

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// ─── Deck ─────────────────────────────────────────────────────────────────────

function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ suit, rank });
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

// ─── Hand evaluation ──────────────────────────────────────────────────────────

function cardValue(rank) {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank, 10);
}

function combinations(arr, k) {
  const result = [];
  function helper(start, combo) {
    if (combo.length === k) { result.push([...combo]); return; }
    for (let i = start; i <= arr.length - (k - combo.length); i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

function evaluateFive(cards) {
  const vals = cards.map(c => cardValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = new Set(suits).size === 1;

  let isStraight = false;
  let straightTop = 0;
  const uniqVals = [...new Set(vals)];
  if (uniqVals.length === 5 && uniqVals[0] - uniqVals[4] === 4) {
    isStraight = true;
    straightTop = uniqVals[0];
  }
  // Wheel: A-2-3-4-5
  if (vals[0] === 14 && vals[1] === 5 && vals[2] === 4 && vals[3] === 3 && vals[4] === 2) {
    isStraight = true;
    straightTop = 5;
  }

  const freq = {};
  for (const v of vals) freq[v] = (freq[v] || 0) + 1;
  const groups = Object.entries(freq)
    .map(([v, c]) => [+v, c])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const freqs = groups.map(g => g[1]);
  const groupVals = groups.map(g => g[0]);

  let rank, name, tiebreakers;

  if (isFlush && isStraight) {
    rank = straightTop === 14 ? 9 : 8;
    name = straightTop === 14 ? 'Royal Flush' : 'Straight Flush';
    tiebreakers = [straightTop];
  } else if (freqs[0] === 4) {
    rank = 7; name = 'Four of a Kind'; tiebreakers = [...groupVals];
  } else if (freqs[0] === 3 && freqs[1] === 2) {
    rank = 6; name = 'Full House'; tiebreakers = [...groupVals];
  } else if (isFlush) {
    rank = 5; name = 'Flush'; tiebreakers = [...vals];
  } else if (isStraight) {
    rank = 4; name = 'Straight'; tiebreakers = [straightTop];
  } else if (freqs[0] === 3) {
    rank = 3; name = 'Three of a Kind'; tiebreakers = [...groupVals];
  } else if (freqs[0] === 2 && freqs[1] === 2) {
    rank = 2; name = 'Two Pair'; tiebreakers = [...groupVals];
  } else if (freqs[0] === 2) {
    rank = 1; name = 'Pair'; tiebreakers = [...groupVals];
  } else {
    rank = 0; name = 'High Card'; tiebreakers = [...vals];
  }

  return { rank, name, tiebreakers };
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.tiebreakers.length, b.tiebreakers.length); i++) {
    if (a.tiebreakers[i] !== b.tiebreakers[i]) return a.tiebreakers[i] - b.tiebreakers[i];
  }
  return 0;
}

export function getBestHand(holeCards, community) {
  const all = [...holeCards, ...community];
  if (all.length < 5) return { rank: -1, name: '–', tiebreakers: [] };
  const combos = combinations(all, 5);
  let best = null;
  for (const combo of combos) {
    const h = evaluateFive(combo);
    if (!best || compareHands(h, best) > 0) best = h;
  }
  return best;
}

// ─── Room management ──────────────────────────────────────────────────────────

function createRoom(roomId) {
  return {
    id: roomId,
    phase: 'waiting',
    players: [],
    community: [],
    deck: [],
    pot: 0,
    currentBet: 0,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    winsCredited: false,
  };
}

function getOrCreateRoom(roomId) {
  if (!pokerRooms.has(roomId)) pokerRooms.set(roomId, createRoom(roomId));
  return pokerRooms.get(roomId);
}

export function getRoom(roomId) {
  return pokerRooms.get(roomId) || null;
}

export function addPlayer(roomId, clientId, userId, username) {
  const room = getOrCreateRoom(roomId);

  if (room.players.length >= MAX_PLAYERS) return { error: 'Tafel is vol (max 6 spelers)' };
  if (!['waiting', 'results'].includes(room.phase)) return { error: 'Spel is al bezig' };
  if (room.players.find(p => p.userId === userId)) return { error: 'Al aan deze tafel' };

  const isHost = room.players.length === 0;
  room.players.push({
    clientId, userId, username, isHost,
    hand: [],
    ante: 0,
    streetBet: 0,
    totalBet: 0,
    status: 'waiting',
    hasActed: false,
    result: null,
    winAmount: 0,
    handResult: null,
  });
  return { ok: true };
}

export function removePlayer(roomId, clientId) {
  const room = pokerRooms.get(roomId);
  if (!room) return;
  const idx = room.players.findIndex(p => p.clientId === clientId);
  if (idx === -1) return;

  const wasHost = room.players[idx].isHost;
  room.players.splice(idx, 1);

  if (room.players.length === 0) { pokerRooms.delete(roomId); return; }
  if (wasHost) room.players[0].isHost = true;

  if (['preflop', 'flop', 'turn', 'river'].includes(room.phase)) {
    if (idx < room.currentPlayerIndex) room.currentPlayerIndex--;
    else if (idx === room.currentPlayerIndex) advanceBettingTurn(room);
  }
}

// ─── Game flow ────────────────────────────────────────────────────────────────

export function startGame(roomId, clientId) {
  const room = pokerRooms.get(roomId);
  if (!room) return { error: 'Tafel niet gevonden' };

  const host = room.players.find(p => p.isHost);
  if (!host || host.clientId !== clientId) return { error: 'Alleen de host kan starten' };
  if (!['waiting', 'results'].includes(room.phase)) return { error: 'Kan nu niet starten' };

  room.phase = 'antes';
  room.pot = 0;
  room.winsCredited = false;
  room.community = [];

  for (const player of room.players) {
    player.hand = [];
    player.ante = 0;
    player.streetBet = 0;
    player.totalBet = 0;
    player.status = 'antes';
    player.hasActed = false;
    player.result = null;
    player.winAmount = 0;
    player.handResult = null;
  }

  return { ok: true };
}

export function placeAnte(roomId, clientId, amount) {
  const room = pokerRooms.get(roomId);
  if (!room) return { error: 'Tafel niet gevonden' };
  if (room.phase !== 'antes') return { error: 'Niet in inzetfase' };

  const player = room.players.find(p => p.clientId === clientId);
  if (!player) return { error: 'Speler niet gevonden' };
  if (player.status !== 'antes') return { error: 'Inzet al geplaatst' };
  if (amount < 1) return { error: 'Inzet moet minimaal 1 zijn' };

  player.ante = amount;
  player.totalBet = amount;
  player.status = 'ready';
  room.pot += amount;

  if (room.players.every(p => p.status === 'ready')) {
    dealPreflop(room);
  }

  return { ok: true };
}

export function playerFold(roomId, clientId) {
  const room = pokerRooms.get(roomId);
  if (!room) return { error: 'Tafel niet gevonden' };
  if (!['preflop', 'flop', 'turn', 'river'].includes(room.phase)) return { error: 'Kan nu niet folden' };

  const current = room.players[room.currentPlayerIndex];
  if (!current || current.clientId !== clientId) return { error: 'Niet jouw beurt' };

  current.status = 'folded';
  current.hasActed = true;

  advanceBettingTurn(room);
  return { ok: true };
}

export function playerCheck(roomId, clientId) {
  const room = pokerRooms.get(roomId);
  if (!room) return { error: 'Tafel niet gevonden' };
  if (!['preflop', 'flop', 'turn', 'river'].includes(room.phase)) return { error: 'Kan nu niet checken' };

  const current = room.players[room.currentPlayerIndex];
  if (!current || current.clientId !== clientId) return { error: 'Niet jouw beurt' };
  if (current.streetBet < room.currentBet) return { error: 'Je kunt niet checken — er is een bod' };

  current.hasActed = true;
  advanceBettingTurn(room);
  return { ok: true };
}

export function playerCall(roomId, clientId) {
  const room = pokerRooms.get(roomId);
  if (!room) return { error: 'Tafel niet gevonden' };
  if (!['preflop', 'flop', 'turn', 'river'].includes(room.phase)) return { error: 'Kan nu niet callen' };

  const current = room.players[room.currentPlayerIndex];
  if (!current || current.clientId !== clientId) return { error: 'Niet jouw beurt' };

  const callAmount = room.currentBet - current.streetBet;
  if (callAmount <= 0) return { error: 'Niets te callen — gebruik check' };

  current.streetBet = room.currentBet;
  current.totalBet += callAmount;
  room.pot += callAmount;
  current.hasActed = true;

  advanceBettingTurn(room);
  return { ok: true, callAmount };
}

export function playerRaise(roomId, clientId, raiseBy) {
  const room = pokerRooms.get(roomId);
  if (!room) return { error: 'Tafel niet gevonden' };
  if (!['preflop', 'flop', 'turn', 'river'].includes(room.phase)) return { error: 'Kan nu niet raisen' };

  const current = room.players[room.currentPlayerIndex];
  if (!current || current.clientId !== clientId) return { error: 'Niet jouw beurt' };
  if (raiseBy < 1) return { error: 'Raise moet minimaal 1 zijn' };

  const callAmount = room.currentBet - current.streetBet;
  const totalAdd = callAmount + raiseBy;

  current.streetBet += totalAdd;
  current.totalBet += totalAdd;
  room.pot += totalAdd;
  room.currentBet = current.streetBet;
  current.hasActed = true;

  for (const player of room.players) {
    if (player.clientId !== clientId && player.status === 'playing') {
      player.hasActed = false;
    }
  }

  advanceBettingTurn(room);
  return { ok: true, totalAdd };
}

// ─── Internal game logic ──────────────────────────────────────────────────────

function dealPreflop(room) {
  room.deck = shuffle(createDeck());
  room.community = [];
  room.currentBet = 0;
  room.phase = 'preflop';

  for (const player of room.players) {
    player.hand = [room.deck.pop(), room.deck.pop()];
    player.status = 'playing';
    player.streetBet = 0;
    player.hasActed = false;
  }

  room.currentPlayerIndex = findNextActive(room, room.dealerIndex);
}

function advanceBettingTurn(room) {
  const active = room.players.filter(p => p.status === 'playing');

  if (active.length <= 1) {
    if (active.length === 1) {
      active[0].result = 'win';
      active[0].winAmount = room.pot;
      for (const player of room.players) {
        if (player.status === 'folded') {
          player.result = 'lose';
          player.winAmount = 0;
        }
      }
    }
    room.phase = 'results';
    room.winsCredited = false;
    return;
  }

  const roundComplete = active.every(p => p.hasActed && p.streetBet >= room.currentBet);
  if (roundComplete) {
    advanceStreet(room);
    return;
  }

  room.currentPlayerIndex = findNextToAct(room);
}

function findNextActive(room, fromIndex) {
  for (let i = 1; i <= room.players.length; i++) {
    const idx = (fromIndex + i) % room.players.length;
    if (room.players[idx].status === 'playing') return idx;
  }
  return 0;
}

function findNextToAct(room) {
  const start = room.currentPlayerIndex;
  for (let i = 1; i <= room.players.length; i++) {
    const idx = (start + i) % room.players.length;
    const p = room.players[idx];
    if (p.status !== 'playing') continue;
    if (!p.hasActed || p.streetBet < room.currentBet) return idx;
  }
  return start;
}

function advanceStreet(room) {
  for (const player of room.players) {
    if (player.status === 'playing') {
      player.streetBet = 0;
      player.hasActed = false;
    }
  }
  room.currentBet = 0;

  if (room.phase === 'preflop') {
    room.community.push(room.deck.pop(), room.deck.pop(), room.deck.pop());
    room.phase = 'flop';
  } else if (room.phase === 'flop') {
    room.community.push(room.deck.pop());
    room.phase = 'turn';
  } else if (room.phase === 'turn') {
    room.community.push(room.deck.pop());
    room.phase = 'river';
  } else if (room.phase === 'river') {
    resolveShowdown(room);
    return;
  }

  room.currentPlayerIndex = findNextActive(room, room.dealerIndex);
}

function resolveShowdown(room) {
  room.phase = 'results';
  room.winsCredited = false;

  const activePlayers = room.players.filter(p => p.status === 'playing');

  for (const player of activePlayers) {
    player.handResult = getBestHand(player.hand, room.community);
  }

  let best = null;
  for (const player of activePlayers) {
    if (!best || compareHands(player.handResult, best) > 0) {
      best = player.handResult;
    }
  }

  const winners = activePlayers.filter(p => compareHands(p.handResult, best) === 0);
  const winShare = Math.floor(room.pot / winners.length);

  for (const player of room.players) {
    if (winners.find(w => w.clientId === player.clientId)) {
      player.result = winners.length > 1 ? 'tie' : 'win';
      player.winAmount = winShare;
    } else {
      player.result = 'lose';
      player.winAmount = 0;
    }
  }

  room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function markWinsCredited(roomId) {
  const room = pokerRooms.get(roomId);
  if (room) room.winsCredited = true;
}
