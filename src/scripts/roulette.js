const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

let bank = 0;
let bets = {};
let spinning = false;
let currentAngle = -Math.PI / 2; // 0 at top on load

const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const bankEl = document.getElementById('bank');
const messageEl = document.getElementById('message');
const resultNumEl = document.getElementById('resultNum');
const resultDisplay = document.getElementById('resultDisplay');
const totalBetDisplay = document.getElementById('totalBetDisplay');
const spinBtn = document.getElementById('spinBtn');
const clearBtn = document.getElementById('clearBtn');
const chipInput = document.getElementById('chipAmount');

// ── Auth ──────────────────────────────────────────────────────────────────────
function getToken() {
  try { return sessionStorage.getItem('token'); } catch(e) { return null; }
}

async function loadBalance() {
  try {
    const token = getToken();
    if (!token) return;
    const res = await fetch('/api/balance.json', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) return;
    const j = await res.json();
    if (j && typeof j.balance === 'number') {
      bank = j.balance;
      bankEl.textContent = bank.toLocaleString('nl-NL');
    }
  } catch(e) { console.warn('loadBalance failed', e); }
}

function saveBalance() {
  const token = getToken();
  if (!token) return;
  fetch('/api/balance.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ balance: bank })
  }).catch(e => console.warn('saveBalance failed', e));
}

// ── Wheel drawing ─────────────────────────────────────────────────────────────
function sectorColor(n) {
  if (n === 0) return '#1a7a3c';
  return RED_NUMS.has(n) ? '#b01020' : '#111111';
}

function drawWheel(angle) {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 5;
  const innerR = R * 0.3;
  const n = WHEEL_ORDER.length;
  const step = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, W, H);

  // Gold outer rim
  ctx.beginPath();
  ctx.arc(cx, cy, R + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE600';
  ctx.fill();

  // Sectors
  for (let i = 0; i < n; i++) {
    const startA = angle + i * step - step / 2;
    const endA = startA + step;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, startA, endA);
    ctx.closePath();
    ctx.fillStyle = sectorColor(WHEEL_ORDER[i]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Number labels
  const fontSize = Math.max(7, Math.floor(R * 0.088));
  for (let i = 0; i < n; i++) {
    const midA = angle + i * step;
    const labelR = R * 0.73;
    const tx = cx + labelR * Math.cos(midA);
    const ty = cy + labelR * Math.sin(midA);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midA + Math.PI / 2);
    ctx.fillStyle = '#FFE600';
    ctx.font = `bold ${fontSize}px Open Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(WHEEL_ORDER[i]), 0, 0);
    ctx.restore();
  }

  // Hub
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0e1e';
  ctx.fill();
  ctx.strokeStyle = '#FFE600';
  ctx.lineWidth = 2;
  ctx.stroke();

  // CMD text
  ctx.fillStyle = '#FFE600';
  ctx.font = `bold ${Math.max(10, Math.floor(R * 0.125))}px Open Sans, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CMD', cx, cy);
}

// ── Spin animation ────────────────────────────────────────────────────────────
function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

function getTargetAngle(resultIdx) {
  const step = (Math.PI * 2) / WHEEL_ORDER.length;
  const desiredAngle = -Math.PI / 2 - resultIdx * step;
  // Find positive remainder so the wheel always spins forward
  const diff = desiredAngle - currentAngle;
  let remainder = ((diff % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (remainder < 0.3) remainder += Math.PI * 2;
  const extraSpins = (5 + Math.floor(Math.random() * 4)) * Math.PI * 2;
  return currentAngle + remainder + extraSpins;
}

function animate(targetAngle, duration, onDone) {
  const startAngle = currentAngle;
  const delta = targetAngle - startAngle;
  const startTime = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - startTime) / duration);
    currentAngle = startAngle + delta * easeOut(t);
    drawWheel(currentAngle);
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      // Normalize to keep angle values manageable
      currentAngle = ((targetAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      drawWheel(currentAngle);
      onDone();
    }
  }
  requestAnimationFrame(frame);
}

// ── Bet management ────────────────────────────────────────────────────────────
function getTotalBet() {
  return Object.values(bets).reduce((s, v) => s + v, 0);
}

function updateTotalDisplay() {
  if (totalBetDisplay) totalBetDisplay.textContent = getTotalBet().toLocaleString('nl-NL');
}

function updateCellChip(betType) {
  const el = document.querySelector(`[data-bet="${betType}"]`);
  if (!el) return;
  let chip = el.querySelector('.bet-chip');
  const amount = bets[betType] || 0;
  if (amount > 0) {
    if (!chip) {
      chip = document.createElement('span');
      chip.className = 'bet-chip';
      el.appendChild(chip);
    }
    chip.textContent = amount;
  } else if (chip) {
    chip.remove();
  }
}

function placeBet(betType) {
  const chip = Math.max(1, Number(chipInput.value) || 1);
  if (chip > bank - getTotalBet()) {
    if (window.Sound) window.Sound.playLose();
    return;
  }
  bets[betType] = (bets[betType] || 0) + chip;
  updateCellChip(betType);
  updateTotalDisplay();
  if (window.Sound) window.Sound.playChip();
}

function clearBets() {
  bets = {};
  document.querySelectorAll('.bet-chip').forEach(c => c.remove());
  updateTotalDisplay();
}

// ── Outcome calculation ───────────────────────────────────────────────────────
function checkWin(betType, result) {
  if (betType.startsWith('straight-')) {
    return result === parseInt(betType.slice(9), 10) ? 35 : -1;
  }
  if (betType === 'red')     return result !== 0 && RED_NUMS.has(result) ? 1 : -1;
  if (betType === 'black')   return result !== 0 && !RED_NUMS.has(result) ? 1 : -1;
  if (betType === 'odd')     return result !== 0 && result % 2 === 1 ? 1 : -1;
  if (betType === 'even')    return result !== 0 && result % 2 === 0 ? 1 : -1;
  if (betType === 'low')     return result >= 1 && result <= 18 ? 1 : -1;
  if (betType === 'high')    return result >= 19 && result <= 36 ? 1 : -1;
  if (betType === 'dozen-1') return result >= 1  && result <= 12 ? 2 : -1;
  if (betType === 'dozen-2') return result >= 13 && result <= 24 ? 2 : -1;
  if (betType === 'dozen-3') return result >= 25 && result <= 36 ? 2 : -1;
  return -1;
}

function resolveAllBets(result) {
  let totalStake = 0;
  let totalReturn = 0;
  for (const [type, amount] of Object.entries(bets)) {
    if (amount <= 0) continue;
    totalStake += amount;
    const mult = checkWin(type, result);
    if (mult > 0) totalReturn += amount * (mult + 1);
  }
  bank -= totalStake;
  bank += totalReturn;
  return totalReturn - totalStake;
}

// ── Result display ────────────────────────────────────────────────────────────
function showResult(result, net) {
  if (resultDisplay) resultDisplay.style.visibility = 'visible';
  if (resultNumEl) {
    resultNumEl.textContent = result;
    resultNumEl.className = 'result-num ' +
      (result === 0 ? 'color-green' : RED_NUMS.has(result) ? 'color-red' : 'color-black');
  }

  if (!messageEl) return;
  let text, type;
  if (net > 0)      { text = `+${net.toLocaleString('nl-NL')} gewonnen!`; type = 'win'; }
  else if (net < 0) { text = `${net.toLocaleString('nl-NL')} verloren`;   type = 'lose'; }
  else              { text = 'Quitte';                                      type = 'push'; }

  messageEl.className = 'outcome-msg ' + type;
  messageEl.textContent = text;
  void messageEl.offsetWidth;
  messageEl.classList.add('visible');

  if (window.Sound) {
    if (net > 0)      { window.Sound.playWin(); window.Sound.playCashRegister(); }
    else if (net < 0) { window.Sound.playLose(); }
  }
}

function hideMessage() {
  if (messageEl) messageEl.classList.remove('visible');
}

// ── Spin ──────────────────────────────────────────────────────────────────────
function doSpin() {
  if (spinning) return;
  if (getTotalBet() < 1) {
    messageEl.className = 'outcome-msg push';
    messageEl.textContent = 'Plaats eerst een inzet';
    void messageEl.offsetWidth;
    messageEl.classList.add('visible');
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  clearBtn.disabled = true;
  if (resultDisplay) resultDisplay.style.visibility = 'hidden';
  hideMessage();

  if (window.Sound) {
    window.Sound.playShuffle();
    window.Sound.say.noMoreBets();
  }

  const result = Math.floor(Math.random() * 37);
  const targetAngle = getTargetAngle(WHEEL_ORDER.indexOf(result));

  animate(targetAngle, 5000, () => {
    if (window.Sound) window.Sound.playSwoosh();

    const net = resolveAllBets(result);
    bankEl.textContent = bank.toLocaleString('nl-NL');
    showResult(result, net);
    saveBalance();

    clearBets();
    spinning = false;
    spinBtn.disabled = false;
    clearBtn.disabled = false;

    if (window.Sound) setTimeout(() => window.Sound.say.placeBets(), 1400);
  });
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.querySelectorAll('[data-bet]').forEach(el => {
  el.addEventListener('click', () => { if (!spinning) placeBet(el.dataset.bet); });
});

document.querySelectorAll('.chip-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    chipInput.value = btn.dataset.set;
    if (window.Sound) window.Sound.playChip();
  });
});

if (spinBtn)  spinBtn.addEventListener('click', doSpin);
if (clearBtn) clearBtn.addEventListener('click', () => { if (!spinning) { clearBets(); if (window.Sound) window.Sound.playChip(); } });

// ── Init ──────────────────────────────────────────────────────────────────────
drawWheel(currentAngle);
loadBalance();
