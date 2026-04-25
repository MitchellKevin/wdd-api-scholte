import { getSession as getAuthSession, getTokenFromRequest } from '../../../../lib/auth.js';
import { getSession as getMinesSession, cashOut, calcMultiplier } from '../../../../server/minesState.js';
import { creditCoins } from '../../../../server/db.js';

export async function POST({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getAuthSession(token);
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { gameId } = await request.json();

    const session = getMinesSession(gameId);
    if (!session)                            return json({ error: 'Spel niet gevonden' }, 404);
    if (session.userId !== String(user._id)) return json({ error: 'Onbevoegd' }, 403);
    if (session.status !== 'active')         return json({ error: 'Spel al afgelopen' }, 400);
    if (session.revealed.size === 0)         return json({ error: 'Onthuld eerst een tegel' }, 400);

    const result = cashOut(gameId);
    if (!result) return json({ error: 'Cashout mislukt' }, 500);

    const multiplier = calcMultiplier(session.mineCount, result.safeCount);
    const winAmount  = Math.floor(session.bet * multiplier);

    await creditCoins(session.userId, winAmount);

    return json({
      winAmount,
      multiplier,
      minePositions: [...session.minePositions],
    });
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
