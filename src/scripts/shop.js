if (new URLSearchParams(location.search).get('payment') === 'success') {
  document.getElementById('success-banner').style.display = 'flex';

  // Webhook als fallback: controleer zelf of de betaling verwerkt is
  const savedPaymentId = sessionStorage.getItem('pendingMolliePaymentId');
  if (savedPaymentId) {
    sessionStorage.removeItem('pendingMolliePaymentId');

    const token = sessionStorage.getItem('token');
    if (token) {
      fetch('/api/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ molliePaymentId: savedPaymentId })
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.credited) {
            console.log('check-payment: ' + data.coins + ' coins bijgeschreven via fallback');
          }
        })
        .catch(function(err) {
          console.error('check-payment fout:', err);
        });
    }
  }
}

document.querySelectorAll('[data-pkg]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const token = sessionStorage.getItem('token');
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
        if (data.molliePaymentId) {
          sessionStorage.setItem('pendingMolliePaymentId', data.molliePaymentId);
        }
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
