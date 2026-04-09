import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDb } from '../server/mongodb.js';

dotenv.config();
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';
const SESSION_EXPIRES = process.env.SESSION_EXPIRES || '7d';

export function createSession(user){
  // user should be an object with at least { _id, email }
  const payload = { sub: String(user._id), email: user.email };
  return jwt.sign(payload, SESSION_SECRET, { algorithm: 'HS256', expiresIn: SESSION_EXPIRES });
}

export async function getSession(tokenOrCookie){
  if(!tokenOrCookie) return null;
  const token = tokenOrCookie.startsWith('Bearer ') ? tokenOrCookie.slice(7) : tokenOrCookie;
  try{
    const payload = jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'] });
    // fetch user from DB
    const db = await getDb();
    const u = await db.collection('users').findOne({ _id: new ObjectId(payload.sub) }, { projection: { password:0 } });
    return u || null;
  }catch(e){
    return null;
  }
}

export function getTokenFromRequest(request){
  // prefer Authorization header, fall back to cookie named 'session'
  try{
    const auth = request.headers.get('authorization');
    if(auth && auth.startsWith('Bearer ')) return auth.slice(7);
    // cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(s=>s.trim()).filter(Boolean).map(s=>{ const k = s.split('=')[0]; const v = s.split('=').slice(1).join('='); return [k,v]; }));
    if(cookies.session) return cookies.session;
    return null;
  }catch(e){ return null; }
}