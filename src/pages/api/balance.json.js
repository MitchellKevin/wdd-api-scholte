import { getSession, getTokenFromRequest } from '../../../lib/auth.js';
import { getBalance, setBalance } from '../../../server/db.js';

export async function GET({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const balance = await getBalance(String(user._id));
    return new Response(JSON.stringify({ balance }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const body = await request.json();
    const amount = Number(body.balance);
    if (!Number.isFinite(amount) || amount < 0) {
      return new Response(JSON.stringify({ error: 'invalid balance' }), { status: 400 });
    }
    await setBalance(String(user._id), amount);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}
