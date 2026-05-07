import { getSession as getAuthSession, getTokenFromRequest } from '../../../../lib/auth.js';
import { getSession as getMinesSession, revealTile, calcMultiplier } from '../../../../server/minesState.js';

export async function POST({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getAuthSession(token);
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { gameId, index } = await request.json();

    if (typeof index !== 'number' || index < 0 || index > 24) return json({ error: 'Ongeldig vakje' }, 400);

    const session = getMinesSession(gameId);
    if (!session)                                return json({ error: 'Spel niet gevonden' }, 404);
    if (session.userId !== String(user._id))     return json({ error: 'Onbevoegd' }, 403);
    if (session.status !== 'active')             return json({ error: 'Spel al afgelopen' }, 400);
    if (session.revealed.has(index))             return json({ error: 'Al onthuld' }, 400);

    const result = revealTile(gameId, index);
    if (!result) return json({ error: 'Fout bij onthullen' }, 500);

    if (result.mine) {
      return json({ mine: true, minePositions: [...session.minePositions] });
    }

    const multiplier = calcMultiplier(session.mineCount, result.safeCount);
    return json({ safe: true, safeCount: result.safeCount, multiplier });
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
