if (new URLSearchParams(location.search).get('payment') === 'success') {
  document.getElementById('success-banner').style.display = 'flex';
}

document.querySelectorAll('[data-pkg]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    const msg = document.getElementById('msg');
    if (!token) { location.href = '/login'; return; }
    btn.disabled = true; btn.textContent = 'Bezig...';
    msg.textContent = ''; msg.className = '';
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ packageId: btn.dataset.pkg })
      });
      const data = await res.json();
      if (res.ok && data.paymentUrl) {
        location.href = data.paymentUrl;
      } else {
        msg.className = 'err'; msg.textContent = data.error || 'Betaling mislukt';
        btn.disabled = false; btn.textContent = 'Kopen';
      }
    } catch {
      msg.className = 'err'; msg.textContent = 'Netwerkfout';
      btn.disabled = false; btn.textContent = 'Kopen';
    }
  });
});
