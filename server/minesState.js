const sessions = new Map();

const TOTAL_TILES = 25;
const HOUSE_EDGE  = 0.97; // 3% house edge

// ─── Multiplier ───────────────────────────────────────────────────────────────

export function calcMultiplier(mineCount, safeClicks) {
  if (safeClicks === 0) return 1.0;

  let prob = 1;
  for (let i = 0; i < safeClicks; i++) {
    prob *= (TOTAL_TILES - mineCount - i) / (TOTAL_TILES - i);
  }

  return Math.round((HOUSE_EDGE / prob) * 100) / 100;
}

// ─── Session management ───────────────────────────────────────────────────────

export function createSession(userId, bet, mineCount, minePositions) {
  const id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  sessions.set(id, {
    userId,
    bet,
    mineCount,
    minePositions, // Set<number>
    revealed: new Set(),
    status: 'active',
  });

  // Clean up after 15 minutes (abandoned sessions)
  setTimeout(() => sessions.delete(id), 15 * 60 * 1000);

  return id;
}

export function getSession(id) {
  return sessions.get(id) || null;
}

export function revealTile(id, index) {
  const session = sessions.get(id);
  if (!session || session.status !== 'active') return null;

  if (session.minePositions.has(index)) {
    session.status = 'lost';
    return { mine: true };
  }

  session.revealed.add(index);
  return { safe: true, safeCount: session.revealed.size };
}

export function cashOut(id) {
  const session = sessions.get(id);
  if (!session || session.status !== 'active') return null;
  session.status = 'won';
  return { safeCount: session.revealed.size };
}
