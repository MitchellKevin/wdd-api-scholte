const rooms = new Map();

const MAX_PLAYERS = 4;
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ─── Deck helpers ────────────────────────────────────────────────────────────

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffle(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  return shuffled;
}

function handValue(hand) {
  let total = 0;
  let aceCount = 0;

  for (const card of hand) {
    if (card.rank === 'A') {
      aceCount++;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank, 10);
    }
  }

  // Count aces as 1 instead of 11 to avoid going over 21
  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount--;
  }

  return total;
}

// ─── Room management ─────────────────────────────────────────────────────────

function createRoom(roomId) {
  return {
    id: roomId,
    players: [],
    dealer: { hand: [], hiddenCard: null },
    deck: [],
    phase: 'waiting',
    currentPlayerIndex: 0,
    winsCredited: false
  };
}

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, createRoom(roomId));
  }
  return rooms.get(roomId);
}

export function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

// ─── Player actions ──────────────────────────────────────────────────────────

export function addPlayer(roomId, clientId, userId, username) {
  const room = getOrCreateRoom(roomId);

  if (room.players.length >= MAX_PLAYERS) {
    return { error: 'Kamer is vol (max 4 spelers)' };
  }

  const gameIsRunning = room.phase !== 'waiting' && room.phase !== 'results' && room.phase !== 'betting';
  if (gameIsRunning) {
    return { error: 'Spel is al bezig' };
  }

  const alreadyInRoom = room.players.find(p => p.userId === userId);
  if (alreadyInRoom) {
    return { error: 'Al in deze kamer' };
  }

  const isHost = room.players.length === 0;
  room.players.push({
    clientId,
    userId,
    username,
    hand: [],
    bet: 0,
    status: room.phase === 'betting' ? 'betting' : 'waiting',
    isHost,
    result: null,
    winAmount: 0
  });

  return { ok: true };
}

export function removePlayer(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const playerIndex = room.players.findIndex(p => p.clientId === clientId);
  if (playerIndex === -1) return;

  const wasHost = room.players[playerIndex].isHost;
  room.players.splice(playerIndex, 1);

  // Delete the room if empty
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return;
  }

  // Assign host to next player if the host left
  if (wasHost) {
    room.players[0].isHost = true;
  }

  // Fix the current player index if the game is running
  if (room.phase === 'playing') {
    if (playerIndex < room.currentPlayerIndex) {
      room.currentPlayerIndex--;
    } else if (playerIndex === room.currentPlayerIndex) {
      advanceToNextPlayer(room);
    }
  }
}

// ─── Game flow ───────────────────────────────────────────────────────────────

export function startGame(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Kamer niet gevonden' };

  const host = room.players.find(p => p.isHost);
  if (!host || host.clientId !== clientId) {
    return { error: 'Alleen de host kan starten' };
  }

  const canStart = room.phase === 'waiting' || room.phase === 'results';
  if (!canStart) {
    return { error: 'Kan nu niet starten' };
  }

  room.phase = 'betting';
  room.winsCredited = false;

  for (const player of room.players) {
    player.hand = [];
    player.bet = 0;
    player.status = 'betting';
    player.result = null;
    player.winAmount = 0;
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

  const everyoneReady = room.players.every(p => p.status === 'ready');
  if (everyoneReady) {
    dealCards(room);
  }

  return { ok: true };
}

export function hit(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Kamer niet gevonden' };
  if (room.phase !== 'playing') return { error: 'Niet in speelfase' };

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.clientId !== clientId) {
    return { error: 'Niet jouw beurt' };
  }

  currentPlayer.hand.push(room.deck.pop());

  const isBusted = handValue(currentPlayer.hand) > 21;
  if (isBusted) {
    currentPlayer.status = 'busted';
    advanceToNextPlayer(room);
  }

  return { ok: true };
}

export function stand(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Kamer niet gevonden' };
  if (room.phase !== 'playing') return { error: 'Niet in speelfase' };

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.clientId !== clientId) {
    return { error: 'Niet jouw beurt' };
  }

  currentPlayer.status = 'stood';
  advanceToNextPlayer(room);

  return { ok: true };
}

// ─── Internal game logic ─────────────────────────────────────────────────────

function dealCards(room) {
  room.phase = 'playing';
  room.deck = shuffle(createDeck());
  room.currentPlayerIndex = 0;

  for (const player of room.players) {
    player.hand = [room.deck.pop(), room.deck.pop()];
    player.status = 'playing';
  }

  room.dealer.hand = [room.deck.pop()];
  room.dealer.hiddenCard = room.deck.pop();
}

function advanceToNextPlayer(room) {
  // Find the next player who still needs to play
  for (let i = room.currentPlayerIndex + 1; i < room.players.length; i++) {
    if (room.players[i].status === 'playing') {
      room.currentPlayerIndex = i;
      return;
    }
  }

  // No more players — dealer plays
  playDealer(room);
}

function playDealer(room) {
  room.phase = 'dealer';

  // Reveal the hidden card
  if (room.dealer.hiddenCard) {
    room.dealer.hand.push(room.dealer.hiddenCard);
    room.dealer.hiddenCard = null;
  }

  // Dealer draws until 17 or higher (standard blackjack rule)
  while (handValue(room.dealer.hand) < 17 && room.deck.length > 0) {
    room.dealer.hand.push(room.deck.pop());
  }

  resolveResults(room);
}

function resolveResults(room) {
  room.phase = 'results';
  room.winsCredited = false;

  const dealerTotal = handValue(room.dealer.hand);
  const dealerBusted = dealerTotal > 21;

  for (const player of room.players) {
    const playerTotal = handValue(player.hand);

    if (playerTotal > 21) {
      player.result = 'lose';
      player.winAmount = 0;
    } else if (dealerBusted || playerTotal > dealerTotal) {
      player.result = 'win';
      player.winAmount = player.bet * 2;
    } else if (playerTotal === dealerTotal) {
      player.result = 'push';
      player.winAmount = player.bet;
    } else {
      player.result = 'lose';
      player.winAmount = 0;
    }
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function markWinsCredited(roomId) {
  const room = rooms.get(roomId);
  if (room) room.winsCredited = true;
}

export function snapshot(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const revealDealerHand = room.phase === 'dealer' || room.phase === 'results';

  return {
    id: room.id,
    phase: room.phase,
    currentPlayerIndex: room.currentPlayerIndex,
    players: room.players.map(player => ({
      username: player.username,
      hand: player.hand,
      bet: player.bet,
      status: player.status,
      isHost: player.isHost,
      result: player.result,
      winAmount: player.winAmount,
      handValue: handValue(player.hand)
    })),
    dealer: {
      hand: room.dealer.hand,
      hasHiddenCard: !revealDealerHand && room.dealer.hiddenCard !== null,
      handValue: handValue(room.dealer.hand)
    }
  };
}
