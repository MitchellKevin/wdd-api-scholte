async function loadAccount() {
  const token = sessionStorage.getItem('token');
  if (!token) { document.getElementById('not-logged').style.display = 'block'; return; }
  const res = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + token }, credentials: 'include' });
  if (!res.ok) { sessionStorage.removeItem('token'); document.getElementById('not-logged').style.display = 'block'; return; }
  const me = await res.json();
  document.getElementById('user-name').textContent = me.username;
  document.getElementById('user-coins').textContent = (me.coins_amount ?? 0).toLocaleString('nl-NL');
  document.getElementById('user-created').textContent = me.createdAt ? new Date(me.createdAt).toLocaleDateString('nl-NL') : '–';
  const avatarEl = document.getElementById('avatar-initials');
  if (me.username.toLowerCase().includes('cyd')) {
    avatarEl.innerHTML = '<img src="/easter-egg.png" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  } else {
    avatarEl.textContent = me.username.slice(0, 2).toUpperCase();
  }
  document.getElementById('account-card').style.display = 'block';
}

document.getElementById('reward-btn')?.addEventListener('click', async () => {
  const token = sessionStorage.getItem('token');
  const msg = document.getElementById('reward-msg');
  try {
    const res = await fetch('/api/daily-reward', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    if (data.claimed) {
      msg.className = 'ok'; msg.textContent = data.message;
      loadAccount();
    } else {
      const next = data.nextClaimAt ? ' Morgen weer: ' + new Date(data.nextClaimAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '';
      msg.className = 'err'; msg.textContent = data.message + next;
    }
  } catch {
    msg.className = 'err'; msg.textContent = 'Fout bij claimen';
  }
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
  sessionStorage.removeItem('token');
  document.cookie = 'session=; Path=/; Max-Age=0';
  location.href = '/login';
});

loadAccount();

window.addEventListener('pageshow', (e) => { if (e.persisted) loadAccount(); });
