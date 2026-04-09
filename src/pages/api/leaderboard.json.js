import { getTopScores } from '../../../server/db.js';

export function GET(){
  try{
    const top = getTopScores(10);
    return new Response(JSON.stringify({ top }), { status: 200 });
  }catch(e){
    console.error('leaderboard err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 500 });
  }
}
