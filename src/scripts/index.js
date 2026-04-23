function loadUser() {
  const token = sessionStorage.getItem('token');
  if (!token) {
    const notLogged = document.getElementById('not-logged');
    const loggedIn = document.getElementById('logged-in');
    if (notLogged) notLogged.style.display = 'block';
    if (loggedIn) loggedIn.style.display = 'none';
    return;
  }
  fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => {
      const usernameEl = document.getElementById('username');
      const ECPointsEl = document.getElementById('EC-Punten');
      const loggedIn = document.getElementById('logged-in');
      if (usernameEl) usernameEl.textContent = d.username;
      if (ECPointsEl) ECPointsEl.textContent = (d.coins_amount ?? 0).toLocaleString('nl-NL');
      if (loggedIn) loggedIn.style.display = 'block';
    })
    .catch(() => { sessionStorage.removeItem('token'); location.reload(); });
}

loadUser();

window.addEventListener('pageshow', (e) => { if (e.persisted) loadUser(); });

{
  const dailyMsg = sessionStorage.getItem('dailyReward');
  if (dailyMsg) {
    const el = document.getElementById('daily-msg');
    if (el) { el.textContent = dailyMsg; el.style.display = 'block'; }
    sessionStorage.removeItem('dailyReward');
  }
}

function goToMultiplayer() {
  const roomInput = document.getElementById('roomInput');
  const msg = document.getElementById('msg');
  const room = roomInput?.value.trim();
  if (!room || !/^\d+$/.test(room)) { msg.textContent = 'Gebruik alleen cijfers voor het kamer-nummer.'; return; }
  msg.textContent = '';
  location.href = '/multiplayer?room=' + encodeURIComponent(room);
}

document.getElementById('soloBtn')?.addEventListener('click', () => { location.href = '/blackjack'; });
document.getElementById('multiBtn')?.addEventListener('click', goToMultiplayer);
document.getElementById('roomInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') goToMultiplayer(); });
