// helper to save and load authenticated user score
export async function saveScoreToServer(token, score){
  const res = await fetch('/api/score.json', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ score }) });
  return res.json();
}

export async function loadScoreFromServer(token){
  const res = await fetch('/api/score.json', { method: 'GET', headers: { 'Authorization': 'Bearer ' + token } });
  return res.json();
}
