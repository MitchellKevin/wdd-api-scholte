const token = sessionStorage.getItem('token');
if (!token) { location.href = '/login'; }

// ─── State ────────────────────────────────────────────────────────────────────

let gameId       = null;
let mineCount    = 3;
let currentBet   = 1;
let gameActive   = false;

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const bankEl          = document.getElementById('bank');
const minesGrid       = document.getElementById('minesGrid');
const multiplierBar   = document.getElementById('multiplierBar');
const multiplierValue = document.getElementById('multiplierValue');
const winPreview      = document.getElementById('winPreview');
const betAmountEl     = document.getElementById('betAmount');
const ctrlSetup       = document.getElementById('ctrlSetup');
const ctrlGame        = document.getElementById('ctrlGame');
const startBtn        = document.getElementById('startBtn');
const cashoutBtn      = document.getElementById('cashoutBtn');
const cashoutAmountEl = document.getElementById('cashoutAmount');
const gameMsg         = document.getElementById('gameMsg');
const errorMsg        = document.getElementById('errorMsg');

// ─── Balance ──────────────────────────────────────────────────────────────────

async function loadBalance() {
  try {
    const r = await fetch('/api/balance.json', { headers: { Authorization: 'Bearer ' + token } });
    if (!r.ok) return;
    const d = await r.json();
    if (bankEl && typeof d.balance === 'number') bankEl.textContent = d.balance.toLocaleString('nl-NL');
  } catch {}
}

loadBalance();

// ─── Grid ─────────────────────────────────────────────────────────────────────

function buildGrid(interactive = false) {
  minesGrid.innerHTML = '';
  for (let i = 0; i < 25; i++) {
    const btn = document.createElement('button');
    btn.className = 'mine-tile';
    btn.dataset.index = i;
    btn.disabled = !interactive;
    btn.addEventListener('click', () => onTileClick(i, btn));
    minesGrid.appendChild(btn);
  }
}

function getTile(index) {
  return minesGrid.querySelector(`[data-index="${index}"]`);
}

function revealGem(btn) {
  btn.disabled = true;
  btn.innerHTML = '💎';
  btn.classList.add('gem');
}

function revealMine(btn, isHit = false) {
  btn.disabled = true;
  btn.innerHTML = '💣';
  btn.classList.add(isHit ? 'mine-hit' : 'mine-dim');
}

function disableAllTiles() {
  minesGrid.querySelectorAll('.mine-tile').forEach(b => { b.disabled = true; });
}

function enableUnrevealedTiles() {
  minesGrid.querySelectorAll('.mine-tile:not(.gem):not(.mine-hit):not(.mine-dim)').forEach(b => { b.disabled = false; });
}

// ─── Multiplier display ───────────────────────────────────────────────────────

function updateMultiplierDisplay(mult) {
  if (multiplierValue) multiplierValue.textContent = mult.toFixed(2) + '×';
  const payout = Math.floor(currentBet * mult);
  if (winPreview) winPreview.textContent = `= ${payout.toLocaleString('nl-NL')} EC`;
  if (cashoutAmountEl) cashoutAmountEl.textContent = payout.toLocaleString('nl-NL');
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function api(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ─── Game flow ────────────────────────────────────────────────────────────────

async function startGame() {
  const bet = parseInt(betAmountEl?.value, 10);
  if (!bet || bet < 1) { showError('Ongeldige inzet'); return; }

  currentBet = bet;
  startBtn.disabled = true;

  try {
    const d = await api('/api/mines/start.json', { bet, mineCount });
    if (d.error) { showError(d.error); startBtn.disabled = false; return; }

    gameId = d.gameId;
    gameActive = true;

    buildGrid(true);
    updateMultiplierDisplay(1.0);

    if (multiplierBar) multiplierBar.style.display = 'flex';
    if (ctrlSetup)     ctrlSetup.style.display = 'none';
    if (ctrlGame)      { ctrlGame.style.display = 'flex'; cashoutBtn.disabled = true; }
    if (gameMsg)       gameMsg.textContent = `${mineCount} mijn${mineCount > 1 ? 'en' : ''} verborgen — klik een tegel!`;

    loadBalance();
  } catch {
    showError('Verbindingsfout');
    startBtn.disabled = false;
  }
}

async function onTileClick(index, btn) {
  if (!gameActive || !gameId || btn.disabled) return;

  disableAllTiles();

  try {
    const d = await api('/api/mines/reveal.json', { gameId, index });
    if (d.error) { showError(d.error); enableUnrevealedTiles(); return; }

    if (d.mine) {
      revealMine(btn, true);
      d.minePositions?.forEach(pos => { if (pos !== index) revealMine(getTile(pos), false); });

      gameActive = false;
      if (gameMsg) gameMsg.textContent = '💥 Boem! Verloren.';
      if (cashoutBtn) cashoutBtn.disabled = true;
      if (window.Sound) { Sound.playLose(); Sound.say.dealerWins(); }

      setTimeout(resetToSetup, 2800);
    } else {
      revealGem(btn);
      updateMultiplierDisplay(d.multiplier);
      if (gameMsg) gameMsg.textContent = `${d.safeCount} veilig · ${d.multiplier.toFixed(2)}× multiplier`;
      if (cashoutBtn) cashoutBtn.disabled = false;
      if (window.Sound) Sound.playCard();

      enableUnrevealedTiles();

      // All safe tiles found → auto cashout
      if (d.safeCount >= 25 - mineCount) {
        await cashOut();
      }
    }
  } catch {
    showError('Verbindingsfout');
    enableUnrevealedTiles();
  }
}

async function cashOut() {
  if (!gameActive || !gameId) return;

  gameActive = false;
  disableAllTiles();
  if (cashoutBtn) cashoutBtn.disabled = true;

  try {
    const d = await api('/api/mines/cashout.json', { gameId });
    if (d.error) { showError(d.error); return; }

    if (gameMsg) gameMsg.textContent = `✓ Uitbetaald: ${d.winAmount.toLocaleString('nl-NL')} EC (${d.multiplier.toFixed(2)}×)`;
    if (window.Sound) { Sound.playWin(); Sound.playCashRegister(); }

    d.minePositions?.forEach(pos => revealMine(getTile(pos), false));

    loadBalance();
    setTimeout(resetToSetup, 2500);
  } catch {
    showError('Verbindingsfout');
  }
}

function resetToSetup() {
  gameId = null;
  gameActive = false;

  buildGrid(false);
  updateMultiplierDisplay(1.0);

  if (multiplierBar) multiplierBar.style.display = 'none';
  if (ctrlSetup)     { ctrlSetup.style.display = 'flex'; startBtn.disabled = false; }
  if (ctrlGame)      ctrlGame.style.display = 'none';
}

function showError(message) {
  if (!errorMsg) return;
  errorMsg.textContent = message;
  errorMsg.style.display = 'block';
  clearTimeout(errorMsg._timer);
  errorMsg._timer = setTimeout(() => { errorMsg.style.display = 'none'; }, 4000);
}

// ─── Button handlers ──────────────────────────────────────────────────────────

startBtn?.addEventListener('click', startGame);
cashoutBtn?.addEventListener('click', () => cashOut());

document.querySelectorAll('.chip-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (betAmountEl) betAmountEl.value = btn.dataset.bet;
    if (window.Sound) Sound.playChip();
  });
});

document.querySelectorAll('.mine-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    mineCount = parseInt(btn.dataset.mines, 10);
    document.querySelectorAll('.mine-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (window.Sound) Sound.playChip();
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

buildGrid(false);
