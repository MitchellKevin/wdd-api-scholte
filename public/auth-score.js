// helper to save and load authenticated user score
export async function saveScoreToServer(token, score){
  const t = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  const res = await fetch('/api/score.json', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + t }, body: JSON.stringify({ score }) });
  return res.json();
}

export async function loadScoreFromServer(token){
  const t = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  const res = await fetch('/api/score.json', { method: 'GET', headers: { 'Authorization': 'Bearer ' + t } });
  return res.json();
}
