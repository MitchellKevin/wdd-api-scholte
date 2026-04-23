import bcrypt from 'bcryptjs';
import { getDB } from '../../../server/mongodb.js';
import { createSession } from '../../../lib/auth.js';

export async function POST({ request }) {
  try {
    const { username, password } = await request.json();
    if (!username || !password)
      return new Response(JSON.stringify({ message: 'Gebruikersnaam en wachtwoord zijn verplicht' }), { status: 400 });
    if (username.length < 3 || username.length > 20)
      return new Response(JSON.stringify({ message: 'Gebruikersnaam moet 3-20 tekens zijn' }), { status: 400 });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return new Response(JSON.stringify({ message: 'Gebruikersnaam mag alleen letters, cijfers en _ bevatten' }), { status: 400 });
    if (password.length < 6)
      return new Response(JSON.stringify({ message: 'Wachtwoord moet minimaal 6 tekens zijn' }), { status: 400 });

    const db = await getDB();
    const existing = await db.collection('users').findOne({ username });
    if (existing)
      return new Response(JSON.stringify({ message: 'Gebruikersnaam al in gebruik' }), { status: 409 });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({
      username,
      password: hash,
      coins_amount: 60,
      lastDailyReward: null,
      createdAt: new Date()
    });

    const token = createSession({ _id: result.insertedId, username });
    return new Response(JSON.stringify({ message: 'Account aangemaakt', token }), {
      status: 201,
      headers: { 'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
    });
  } catch (e) {
    return new Response(JSON.stringify({ message: 'Server fout: ' + e?.message }), { status: 500 });
  }
}
