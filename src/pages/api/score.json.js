import { saveScore, getScore } from '../../../server/db.js';
import { getSession, getTokenFromRequest } from '../../../lib/auth.js';

export async function POST({ request }){
  try{
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if(!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const body = await request.json();
    const score = Number(body.score) || 0;
    const userSub = String(user._id);
    saveScore(userSub, score);
    return new Response(JSON.stringify({ ok:true }), { status: 200 });
  }catch(e){
    console.error('score.post err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 500 });
  }
}

export async function GET({ request }){
  try{
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if(!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const userSub = String(user._id);
    const r = getScore(userSub);
    return new Response(JSON.stringify({ score: r ? r.score : 0, updated_at: r ? r.updated_at : null }), { status: 200 });
  }catch(e){
    console.error('score.get err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 500 });
  }
}
