import { getSession, getTokenFromRequest } from '../../../lib/auth.js';

export async function GET({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    return new Response(JSON.stringify({
      id: String(user._id),
      username: user.username,
      coins_amount: user.coins_amount ?? 0,
      createdAt: user.createdAt || null
    }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}
