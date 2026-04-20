import bcrypt from 'bcryptjs';
import { getDB } from '../../../server/mongodb.js';
import { createSession } from '../../../lib/auth.js';

export async function POST({ request }) {
  try {
    const { username, password } = await request.json();
    if (!username || !password)
      return new Response(JSON.stringify({ message: 'Gebruikersnaam en wachtwoord zijn verplicht' }), { status: 400 });

    const db = await getDB();
    const user = await db.collection('users').findOne({ username });
    if (!user)
      return new Response(JSON.stringify({ message: 'Gebruiker niet gevonden' }), { status: 401 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return new Response(JSON.stringify({ message: 'Verkeerd wachtwoord' }), { status: 401 });

    // Daily reward check
    const now = new Date();
    const lastReward = user.lastDailyReward ? new Date(user.lastDailyReward) : null;
    const sameDay = lastReward && lastReward.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    let dailyReward = false;
    if (!sameDay) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $inc: { coins_amount: 1000 }, $set: { lastDailyReward: now } }
      );
      dailyReward = true;
    }

    const token = createSession(user);
    return new Response(JSON.stringify({ message: 'Ingelogd', token, dailyReward }), {
      status: 200,
      headers: { 'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
    });
  } catch (e) {
    return new Response(JSON.stringify({ message: 'Server fout: ' + e?.message }), { status: 500 });
  }
}
