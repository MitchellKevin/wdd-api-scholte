import dotenv from 'dotenv';
import jwkToPem from 'jwk-to-pem';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { saveScore, getScore } from '../../../server/db.js';

dotenv.config();

const AUTH0_DOMAIN = process.env.VITE_AUTH0_DOMAIN || process.env.DOMAIN_NAME;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || process.env.VITE_AUTH0_CLIENT_ID || process.env.CLIENT_ID;

let jwksCache = null;
let jwksFetchedAt = 0;

async function getJwks(){
  const now = Date.now();
  if(jwksCache && (now - jwksFetchedAt) < 60_000) return jwksCache;
  const res = await fetch(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`);
  const j = await res.json();
  jwksCache = j; jwksFetchedAt = now; return j;
}

async function verifyToken(authHeader){
  if(!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Missing token');
  const token = authHeader.slice(7);
  const decoded = jwt.decode(token, { complete: true });
  if(!decoded || !decoded.header) throw new Error('Invalid token');
  const kid = decoded.header.kid;
  const jwks = await getJwks();
  const key = (jwks.keys||[]).find(k=>k.kid === kid);
  if(!key) throw new Error('Unknown kid');
  const pem = jwkToPem(key);
  if(!AUTH0_AUDIENCE){
    return reject(new Error('Server not configured with AUTH0_AUDIENCE or VITE_AUTH0_CLIENT_ID'));
  }
  return new Promise((resolve, reject)=>{
    jwt.verify(token, pem, { algorithms: ['RS256'], audience: AUTH0_AUDIENCE, issuer: `https://${AUTH0_DOMAIN}/` }, (err, payload)=>{
      if(err) reject(err); else resolve(payload);
    });
  });
}

export async function post({ request, headers }){
  try{
    const payload = await verifyToken(headers.authorization || headers.Authorization);
    const body = await request.json();
    const score = Number(body.score) || 0;
    const userSub = payload.sub;
    if(!userSub) return new Response(JSON.stringify({ error: 'no user' }), { status: 400 });
    saveScore(userSub, score);
    return new Response(JSON.stringify({ ok:true }), { status: 200 });
  }catch(e){
    console.error('score.post err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 401 });
  }
}

export async function get({ headers, request }){
  try{
    const payload = await verifyToken(headers.authorization || headers.Authorization);
    const userSub = payload.sub;
    if(!userSub) return new Response(JSON.stringify({ error: 'no user' }), { status: 400 });
    const r = getScore(userSub);
    return new Response(JSON.stringify({ score: r ? r.score : 0, updated_at: r ? r.updated_at : null }), { status: 200 });
  }catch(e){
    console.error('score.get err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 401 });
  }
}
