import bcrypt from 'bcryptjs';
import { getDB } from '../../../server/mongodb.js';
import { createSession } from '../../../lib/auth.js';

export async function POST({ request }) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ message: 'Gebruikersnaam en wachtwoord zijn verplicht' }),
        { status: 400 }
      );
    }

    const db = await getDB();
    const user = await db.collection('users').findOne({ username });

    if (!user) {
      return new Response(
        JSON.stringify({ message: 'Gebruiker niet gevonden' }),
        { status: 401 }
      );
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.password);
    if (!passwordIsCorrect) {
      return new Response(
        JSON.stringify({ message: 'Verkeerd wachtwoord' }),
        { status: 401 }
      );
    }

    // Give 1000 bonus coins if the user hasn't logged in today yet
    const dailyRewardGiven = await givesDailyRewardIfEligible(db, user);

    const token = createSession(user);

    return new Response(
      JSON.stringify({ message: 'Ingelogd', token, dailyReward: dailyRewardGiven }),
      {
        status: 200,
        headers: { 'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Server fout: ' + error?.message }),
      { status: 500 }
    );
  }
}

async function givesDailyRewardIfEligible(db, user) {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const lastRewardDate = user.lastDailyReward
    ? new Date(user.lastDailyReward).toISOString().slice(0, 10)
    : null;

  const alreadyReceivedToday = lastRewardDate === today;
  if (alreadyReceivedToday) return false;

  await db.collection('users').updateOne(
    { _id: user._id },
    { $inc: { coins_amount: 1000 }, $set: { lastDailyReward: new Date() } }
  );

  return true;
}
