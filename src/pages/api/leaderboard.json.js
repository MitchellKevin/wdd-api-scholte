import { getTopPlayers } from '../../../server/db.js';

export async function GET() {
  try {
    const players = await getTopPlayers(10);
    const top = players.map((p, i) => ({
      rank: i + 1,
      username: p.username,
      coins_amount: p.coins_amount ?? 0,
    }));
    return new Response(JSON.stringify({ top }), { status: 200 });
  } catch (e) {
    console.error('leaderboard err', e?.message);
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}
