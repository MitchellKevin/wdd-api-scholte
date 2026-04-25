import { getSession as getAuthSession, getTokenFromRequest } from '../../../../lib/auth.js';
import { deductCoins } from '../../../../server/db.js';
import { createSession, calcMultiplier } from '../../../../server/minesState.js';

export async function POST({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getAuthSession(token);
    if (!user) return json({ error: 'unauthorized' }, 401);

    const body = await request.json();
    const bet       = parseInt(body.bet, 10);
    const mineCount = parseInt(body.mineCount, 10);

    if (!bet || bet < 1)                          return json({ error: 'Ongeldige inzet' }, 400);
    if (!mineCount || mineCount < 1 || mineCount > 24) return json({ error: 'Ongeldig aantal mijnen (1–24)' }, 400);

    const deducted = await deductCoins(String(user._id), bet);
    if (!deducted) return json({ error: 'Niet genoeg coins' }, 400);

    // Generate random mine positions
    const positions = new Set();
    while (positions.size < mineCount) {
      positions.add(Math.floor(Math.random() * 25));
    }

    const gameId = createSession(String(user._id), bet, mineCount, positions);

    return json({ gameId, multiplier: calcMultiplier(mineCount, 0) });
  } catch (e) {
    return json({ error: e?.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
