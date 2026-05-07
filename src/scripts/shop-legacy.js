const PACKAGES = [
  { id: 'p1', coins: 60, price_cents: 260, price_eur: '€2,60' },
  { id: 'p5', coins: 120, price_cents: 510, price_eur: '€5,10' },
  { id: 'p10', coins: 180, price_cents: 760, price_eur: '€7,60' }
];

function renderPackages(){
  const root = document.getElementById('packages');
  for(const p of PACKAGES){
    const el = document.createElement('div'); el.className = 'pkg';
    el.innerHTML = `
      <h3>${p.coins.toLocaleString()} coins</h3>
      <div class="coins">${p.coins.toLocaleString()}</div>
      <div class="price">Price: ${p.price_eur}</div>
      <button data-id="${p.id}">Buy</button>
    `;
    root.appendChild(el);
  }
}

async function createPayment(packageId){
  try{
    // include auth token if available so the server can attach the purchase to the user
    let headers = { 'Content-Type': 'application/json' };
    if(window.getAuthToken) {
      try{ const t = await window.getAuthToken(); if(t) headers['Authorization'] = `Bearer ${t}`; }catch(e){}
    }
    const res = await fetch('/api/create-payment.json', { method: 'POST', headers, body: JSON.stringify({ packageId }) });
    const j = await res.json();
    if(res.ok && j.paymentUrl){
      // redirect to payment URL (stub or real provider)
      window.location.href = j.paymentUrl;
    }else{
      alert('Failed to create payment: ' + (j.error || JSON.stringify(j)));
    }
  }catch(err){
    console.error(err); alert('Network error creating payment');
  }
}

function attach(){
  document.getElementById('packages').addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-id]');
    if(!btn) return;
    const id = btn.dataset.id;
    btn.disabled = true; btn.textContent = 'Creating...';
    createPayment(id).finally(()=>{ btn.disabled = false; btn.textContent = 'Buy'; });
  });
}

document.addEventListener('DOMContentLoaded', ()=>{ renderPackages(); attach(); });
