const token = sessionStorage.getItem('token');
if (!token) { location.href = '/login'; }

const params = new URLSearchParams(location.search);
const roomId = params.get('room');
if (!roomId || !/^\d+$/.test(roomId)) { location.href = '/'; }

// ─── Card helpers ─────────────────────────────────────────────────────────────

function isRed(card) { return card.suit === '♥' || card.suit === '♦'; }

function makeCardEl(card, hidden = false, small = false) {
  const el = document.createElement('div');
  if (hidden) {
    el.className = 'card back' + (small ? ' card-small' : '');
  } else {
    el.className = 'card' + (isRed(card) ? ' red' : '') + (small ? ' card-small' : '');
    el.innerHTML = `<div class="rank">${card.rank}</div><div class="suit-center">${card.suit}</div><div class="suit">${card.suit}</div>`;
  }
  return el;
}

function renderHand(container, cards, hasHiddenCard = false, small = false) {
  const oldCount = parseInt(container.dataset.soundCount || '0', 10);
  container.innerHTML = '';
  container.dataset.soundCount = cards.length;
  cards.forEach((card, i) => {
    const el = makeCardEl(card, false, small);
    el.style.animationDelay = `${i * 100}ms`;
    container.appendChild(el);
  });
  if (hasHiddenCard) {
    const el = makeCardEl(null, true, small);
    el.style.animationDelay = `${cards.length * 100}ms`;
    container.appendChild(el);
  }
  // Play card sound only for newly added cards
  if (window.Sound && cards.length > oldCount) {
    for (let i = oldCount; i < cards.length; i++) {
      setTimeout(() => Sound.playCard(), (i - oldCount) * 110);
    }
  }
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const bankEl          = document.getElementById('bank');
const roomDisplay     = document.getElementById('roomDisplay');
const statusBanner    = document.getElementById('statusBanner');
const dealerHandEl    = document.getElementById('dealerHand');
const dealerScoreEl   = document.getElementById('dealerScore');
const dealerBadge     = document.getElementById('dealerScoreBadge');
const otherPlayersLeft  = document.getElementById('otherPlayersLeft');
const otherPlayersRight = document.getElementById('otherPlayersRight');
const myHandEl        = document.getElementById('myHand');
const myScoreEl       = document.getElementById('myScore');
const myScoreBadge    = document.getElementById('myScoreBadge');
const myLabel         = document.getElementById('myLabel');
const myZone          = document.getElementById('myZone');

const ctrlWaiting  = document.getElementById('ctrlWaiting');
const ctrlBetting  = document.getElementById('ctrlBetting');
const ctrlPlaying  = document.getElementById('ctrlPlaying');
const ctrlResults  = document.getElementById('ctrlResults');

const playerListEl = document.getElementById('playerList');
const startBtn     = document.getElementById('startBtn');
const waitMsg      = document.getElementById('waitMsg');
const betAmountEl  = document.getElementById('betAmount');
const betBtn       = document.getElementById('betBtn');
const betWaitMsg   = document.getElementById('betWaitMsg');
const hitBtn       = document.getElementById('hitBtn');
const standBtn     = document.getElementById('standBtn');
const turnMsg      = document.getElementById('turnMsg');
const resultMsg    = document.getElementById('resultMsg');
const playAgainBtn = document.getElementById('playAgainBtn');
const errorMsg     = document.getElementById('errorMsg');

if (roomDisplay) roomDisplay.textContent = roomId;

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

// ─── WebSocket ────────────────────────────────────────────────────────────────

const proto = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${proto}://${location.host}`);

let myUsername = null;
let isHost = false;
let _lastPhase  = null;
let _lastResult = null;

ws.addEventListener('open', () => {
  if (statusBanner) statusBanner.textContent = 'Verbonden — kamer laden...';
  ws.send(JSON.stringify({ type: 'JOIN_ROOM', token, roomId }));
});

ws.addEventListener('close', () => {
  if (statusBanner) {
    statusBanner.textContent = 'Verbinding verbroken — ververs de pagina';
    statusBanner.classList.add('disconnected');
    statusBanner.style.display = 'block';
  }
});

ws.addEventListener('message', (e) => {
  let msg;
  try { msg = JSON.parse(e.data); } catch { return; }

  switch (msg.type) {
    case 'WELCOME': break;
    case 'ROOM_UPDATE':
      myUsername = msg.myUsername;
      renderRoom(msg);
      break;
    case 'ERROR':
      showError(msg.message);
      break;
  }
});

function send(data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderRoom(msg) {
  if (statusBanner) statusBanner.textContent = '';

  const myPlayer = msg.players.find(p => p.username === myUsername);
  const others   = msg.players.filter(p => p.username !== myUsername);
  isHost = myPlayer?.isHost ?? false;

  // Phase-transition sounds
  if (window.Sound) {
    if (msg.phase !== _lastPhase) {
      if (msg.phase === 'betting') Sound.say.placeBets();
      else if (msg.phase === 'dealer') Sound.say.noMoreBets();
      _lastPhase = msg.phase;
    }
    if (msg.phase === 'results' && myPlayer?.result && myPlayer.result !== _lastResult) {
      _lastResult = myPlayer.result;
      if (myPlayer.result === 'win')       { Sound.playWin();  Sound.say.playerWins(); }
      else if (myPlayer.result === 'lose') { Sound.playLose(); Sound.say.dealerWins(); }
      else                                 { Sound.say.push(); }
    }
    if (msg.phase !== 'results') _lastResult = null;
  }

  // Dealer
  renderHand(dealerHandEl, msg.dealer.hand, msg.dealer.hasHiddenCard);
  const dv = msg.dealer.handValue;
  if (dealerScoreEl) dealerScoreEl.textContent = dv || '–';
  if (dealerBadge) dealerBadge.className = 'score-badge' + (dv > 21 ? ' bust' : '');

  // Other players
  renderOtherPlayers(others, msg.currentPlayerIndex, msg.players, msg.phase);

  // My hand
  const myIndex = msg.players.findIndex(p => p.username === myUsername);
  if (myPlayer) {
    renderHand(myHandEl, myPlayer.hand);
    const hv = myPlayer.handValue;
    if (myScoreEl) myScoreEl.textContent = hv || 0;
    if (myScoreBadge) {
      myScoreBadge.className = 'score-badge' + (hv > 21 ? ' bust' : hv === 21 ? ' blackjack' : '');
    }
    if (myLabel) myLabel.textContent = myPlayer.username + (myPlayer.isHost ? ' ♛' : '');

    const isMyTurn = msg.phase === 'playing' && msg.currentPlayerIndex === myIndex;
    if (myZone) myZone.classList.toggle('active-turn', isMyTurn);
  }

  renderControls(msg, myPlayer, myIndex);
}

function renderOtherPlayers(others, currentPlayerIndex, allPlayers, phase) {
  if (!otherPlayersLeft || !otherPlayersRight) return;
  otherPlayersLeft.innerHTML = '';
  otherPlayersRight.innerHTML = '';

  others.forEach((player, i) => {
    const globalIndex = allPlayers.findIndex(p => p.username === player.username);
    const isCurrentTurn = phase === 'playing' && currentPlayerIndex === globalIndex;

    const statusLabels = { waiting: 'Wachten', betting: 'Inzetten...', ready: 'Klaar', playing: 'Speelt', stood: 'Stand', busted: 'Bust!' };
    const resultLabels = { win: 'Gewonnen!', lose: 'Verloren', push: 'Gelijkspel' };
    const statusText = player.result
      ? resultLabels[player.result] || player.status
      : statusLabels[player.status] || player.status;

    const div = document.createElement('div');
    div.className = 'other-player' + (isCurrentTurn ? ' active-turn' : '');
    div.innerHTML = `
      <div class="other-player-name">${player.username}${player.isHost ? ' ♛' : ''}</div>
      <div class="other-hand"></div>
      <div class="other-meta">
        <span class="other-score score-badge${player.handValue > 21 ? ' bust' : ''}">${player.handValue || 0}</span>
        <span class="other-status">${statusText}${player.bet ? ` · ${player.bet} EC` : ''}</span>
      </div>
    `;

    const handEl = div.querySelector('.other-hand');
    player.hand.forEach((card, idx) => {
      const el = makeCardEl(card, false, true);
      el.style.animationDelay = `${idx * 80}ms`;
      handEl.appendChild(el);
    });

    (i % 2 === 0 ? otherPlayersLeft : otherPlayersRight).appendChild(div);
  });
}

function renderControls(msg, myPlayer, myIndex) {
  [ctrlWaiting, ctrlBetting, ctrlPlaying, ctrlResults].forEach(el => {
    if (el) el.style.display = 'none';
  });

  switch (msg.phase) {
    case 'waiting':  showWaitingControls(msg);                    break;
    case 'betting':  showBettingControls(myPlayer);               break;
    case 'playing':
    case 'dealer':   showPlayingControls(msg, myPlayer, myIndex); break;
    case 'results':  showResultsControls(msg, myPlayer);          break;
  }
}

function showWaitingControls(msg) {
  if (!ctrlWaiting) return;
  ctrlWaiting.style.display = 'flex';

  if (playerListEl) {
    playerListEl.innerHTML = msg.players
      .map(p => `<span class="player-chip">${p.username}${p.isHost ? ' ♛' : ''}</span>`)
      .join('');
  }

  if (startBtn) startBtn.style.display = isHost ? 'inline-block' : 'none';
  if (waitMsg) {
    waitMsg.textContent = isHost ? 'Klaar om te starten!' : 'Wachten op de host...';
  }
}

function showBettingControls(myPlayer) {
  if (!ctrlBetting) return;
  ctrlBetting.style.display = 'flex';

  const alreadyBet = myPlayer?.status === 'ready';
  if (betBtn) betBtn.disabled = alreadyBet;
  if (betAmountEl) betAmountEl.disabled = alreadyBet;
  if (betWaitMsg) {
    betWaitMsg.textContent = alreadyBet
      ? 'Inzet geplaatst — wachten op anderen...'
      : 'Plaats je inzet!';
  }
}

function showPlayingControls(msg, myPlayer, myIndex) {
  if (!ctrlPlaying) return;
  ctrlPlaying.style.display = 'flex';

  const isMyTurn = msg.phase === 'playing' && msg.currentPlayerIndex === myIndex;
  if (hitBtn)   hitBtn.disabled   = !isMyTurn;
  if (standBtn) standBtn.disabled = !isMyTurn;

  if (turnMsg) {
    if (msg.phase === 'dealer') {
      turnMsg.textContent = 'Dealer speelt...';
    } else if (isMyTurn) {
      turnMsg.textContent = 'Jouw beurt!';
    } else {
      const cur = msg.players[msg.currentPlayerIndex];
      turnMsg.textContent = cur ? `${cur.username} is aan de beurt...` : 'Wachten...';
    }
  }
}

function showResultsControls(msg, myPlayer) {
  if (!ctrlResults) return;
  ctrlResults.style.display = 'flex';

  if (myPlayer && resultMsg) {
    const labels = { win: 'Gewonnen!', lose: 'Verloren', push: 'Gelijkspel' };
    let text = labels[myPlayer.result] || '–';
    if (myPlayer.winAmount > 0) text += ` (+${myPlayer.winAmount} EC)`;
    resultMsg.textContent = text;
    resultMsg.className = 'outcome-msg visible ' + (myPlayer.result || 'push');
  }

  if (playAgainBtn) playAgainBtn.style.display = isHost ? 'inline-block' : 'none';
  loadBalance();
}

function showError(message) {
  if (!errorMsg) return;
  errorMsg.textContent = message;
  errorMsg.style.display = 'block';
  clearTimeout(errorMsg._timer);
  errorMsg._timer = setTimeout(() => { errorMsg.style.display = 'none'; }, 4000);
}

// ─── Button handlers ──────────────────────────────────────────────────────────

startBtn?.addEventListener('click',    () => send({ type: 'START_GAME' }));
hitBtn?.addEventListener('click',      () => send({ type: 'HIT' }));
standBtn?.addEventListener('click',    () => send({ type: 'STAND' }));
playAgainBtn?.addEventListener('click',() => send({ type: 'PLAY_AGAIN' }));

betBtn?.addEventListener('click', () => {
  const amount = parseInt(betAmountEl?.value, 10);
  if (!amount || amount < 1) { showError('Ongeldige inzet'); return; }
  if (window.Sound) Sound.playChip();
  send({ type: 'PLACE_BET', amount });
});

document.querySelectorAll('.chip-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (betAmountEl) betAmountEl.value = btn.dataset.set;
    if (window.Sound) Sound.playChip();
  });
});
