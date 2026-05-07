import { getSession, getTokenFromRequest } from '../../../lib/auth.js';
import { getDB } from '../../../server/mongodb.js';

export async function POST({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

    const now = new Date();
    const lastReward = user.lastDailyReward ? new Date(user.lastDailyReward) : null;
    const sameDay = lastReward && lastReward.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);

    if (sameDay) {
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      return new Response(JSON.stringify({
        claimed: false,
        message: 'Al geclaimd vandaag',
        nextClaimAt: tomorrow.toISOString()
      }), { status: 200 });
    }

    const db = await getDB();
    await db.collection('users').updateOne(
      { _id: user._id },
      { $inc: { coins_amount: 1 }, $set: { lastDailyReward: now } }
    );

    return new Response(JSON.stringify({
      claimed: true,
      coinsAdded: 1,
      message: '+1 coins geclaimd!'
    }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}
