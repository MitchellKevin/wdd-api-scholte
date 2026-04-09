const PACKAGES = [
  { id: 'p1', coins: 1000, price_cents: 100, price_eur: '€1' },
  { id: 'p5', coins: 5000, price_cents: 500, price_eur: '€5' },
  { id: 'p10', coins: 10000, price_cents: 1000, price_eur: '€10' },
  { id: 'p20', coins: 20000, price_cents: 2000, price_eur: '€20' },
  { id: 'p50', coins: 50000, price_cents: 5000, price_eur: '€50' },
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
    const res = await fetch('/api/create-payment.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId }) });
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
