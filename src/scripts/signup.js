const btn = document.getElementById('btn');
const msg = document.getElementById('msg');

async function signup() {
  if (!btn || !msg) return;
  btn.disabled = true; btn.textContent = 'Bezig...';
  msg.textContent = ''; msg.className = '';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  try {
    const res = await fetch('/api/signup', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      msg.className = 'ok'; msg.textContent = 'Account aangemaakt! Je wordt doorgestuurd...';
      setTimeout(() => { location.href = '/login'; }, 800);
    } else {
      msg.className = 'err'; msg.textContent = data.message || 'Registratie mislukt';
    }
  } catch {
    msg.className = 'err'; msg.textContent = 'Netwerkfout, probeer opnieuw';
  } finally {
    btn.disabled = false; btn.textContent = 'Account aanmaken';
  }
}

btn?.addEventListener('click', signup);
document.addEventListener('keydown', e => { if (e.key === 'Enter') signup(); });
