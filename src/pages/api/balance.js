import { getSession } from '../../lib/auth.js';

// 🔴 Replace with a real DB — this resets on server restart
const balances = new Map();

export async function GET({ cookies }) {
  const user = await getSession(cookies.get('session')?.value);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const balance = balances.get(user.sub) ?? 500;
  return Response.json({ balance });
}

export async function POST({ request, cookies }) {
  const user = await getSession(cookies.get('session')?.value);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { balance } = await request.json();
  balances.set(user.sub, balance);
  return Response.json({ ok: true });
}