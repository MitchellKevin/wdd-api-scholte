const btn = document.getElementById('btn');
const msg = document.getElementById('msg');

async function login() {
  if (!btn || !msg) return;
  btn.disabled = true; btn.textContent = 'Bezig...';
  msg.textContent = ''; msg.className = '';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  try {
    const res = await fetch('/api/login', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      sessionStorage.setItem('token', data.token);
      if (data.dailyReward) sessionStorage.setItem('dailyReward', 'Dagelijkse beloning: +3 EC-Punten!');
      msg.className = 'ok'; msg.textContent = 'Ingelogd! Je wordt doorgestuurd...';
      setTimeout(() => { location.href = '/'; }, 600);
    } else {
      msg.className = 'err'; msg.textContent = data.message || 'Inloggen mislukt';
    }
  } catch {
    msg.className = 'err'; msg.textContent = 'Netwerkfout, probeer opnieuw';
  } finally {
    btn.disabled = false; btn.textContent = 'Inloggen';
  }
}

btn?.addEventListener('click', login);
document.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
