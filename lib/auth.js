import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDb } from '../server/mongodb.js';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';
const SESSION_EXPIRES = process.env.SESSION_EXPIRES || '7d';

export function createSession(user) {
  return jwt.sign(
    { sub: String(user._id), username: user.username },
    SESSION_SECRET,
    { algorithm: 'HS256', expiresIn: SESSION_EXPIRES }
  );
}

export async function getSession(tokenOrCookie) {
  if (!tokenOrCookie) return null;
  const token = tokenOrCookie.startsWith('Bearer ') ? tokenOrCookie.slice(7) : tokenOrCookie;
  try {
    const payload = jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'] });
    const db = await getDb();
    return await db.collection('users').findOne(
      { _id: new ObjectId(payload.sub) },
      { projection: { password: 0 } }
    ) || null;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request) {
  try {
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(s => s.trim()).filter(Boolean).map(s => {
        const eq = s.indexOf('=');
        return [s.slice(0, eq), s.slice(eq + 1)];
      })
    );
    return cookies.session || null;
  } catch {
    return null;
  }
}

export function verifyTokenRaw(token) {
  try {
    return jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}
