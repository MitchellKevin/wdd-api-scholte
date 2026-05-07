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

function renderCardList(container, cards, small = false, soundTrack = true) {
  const oldCount = parseInt(container.dataset.soundCount || '0', 10);
  container.innerHTML = '';
  container.dataset.soundCount = cards.length;
  cards.forEach((card, i) => {
    const el = makeCardEl(card, false, small);
    el.style.animationDelay = `${i * 100}ms`;
    container.appendChild(el);
  });
  if (soundTrack && window.Sound && cards.length > oldCount) {
    for (let i = oldCount; i < cards.length; i++) {
      setTimeout(() => Sound.playCard(), (i - oldCount) * 110);
    }
  }
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const bankEl            = document.getElementById('bank');
const roomDisplay       = document.getElementById('roomDisplay');
const statusBanner      = document.getElementById('statusBanner');
const communityEl       = document.getElementById('communityCards');
const potEl             = document.getElementById('potAmount');
const currentBetEl      = document.getElementById('currentBetAmount');
const otherPlayersLeft  = document.getElementById('otherPlayersLeft');
const otherPlayersRight = document.getElementById('otherPlayersRight');
const myHandEl          = document.getElementById('myHand');
const myHandNameEl      = document.getElementById('myHandName');
const myLabel           = document.getElementById('myLabel');
const myZone            = document.getElementById('myZone');

const ctrlWaiting  = document.getElementById('ctrlWaiting');
const ctrlAntes    = document.getElementById('ctrlAntes');
const ctrlPlaying  = document.getElementById('ctrlPlaying');
const ctrlResults  = document.getElementById('ctrlResults');

const playerListEl  = document.getElementById('playerList');
const startBtn      = document.getElementById('startBtn');
const waitMsg       = document.getElementById('waitMsg');
const anteAmountEl  = document.getElementById('anteAmount');
const anteBtn       = document.getElementById('anteBtn');
const anteWaitMsg   = document.getElementById('anteWaitMsg');
const foldBtn       = document.getElementById('foldBtn');
const checkCallBtn  = document.getElementById('checkCallBtn');
const raiseAmountEl = document.getElementById('raiseAmount');
const raiseBtn      = document.getElementById('raiseBtn');
const turnMsg       = document.getElementById('turnMsg');
const resultMsg     = document.getElementById('resultMsg');
const playAgainBtn  = document.getElementById('playAgainBtn');
const errorMsg      = document.getElementById('errorMsg');

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
let _lastPhase = null;
let _lastResult = null;

ws.addEventListener('open', () => {
  if (statusBanner) statusBanner.textContent = 'Verbonden — tafel laden...';
  ws.send(JSON.stringify({ type: 'POKER_JOIN_ROOM', token, roomId }));
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
    case 'POKER_ROOM_UPDATE':
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

  // Phase transition sounds
  if (window.Sound) {
    if (msg.phase !== _lastPhase) {
      if (msg.phase === 'antes') Sound.say.placeBets();
      else if (msg.phase === 'preflop') { Sound.playShuffle(); setTimeout(() => Sound.say.goodLuck(), 600); }
      else if (msg.phase === 'flop')   Sound.say.noMoreBets();
      _lastPhase = msg.phase;
    }
    if (msg.phase === 'results' && myPlayer?.result && myPlayer.result !== _lastResult) {
      _lastResult = myPlayer.result;
      if (myPlayer.result === 'win')      { Sound.playWin(); Sound.say.bigWinner(); }
      else if (myPlayer.result === 'lose') { Sound.playLose(); Sound.say.dealerWins(); }
      else                                 { Sound.say.push(); }
    }
    if (msg.phase !== 'results') _lastResult = null;
  }

  // Community cards
  if (communityEl) {
    renderCardList(communityEl, msg.community, false, true);
  }

  if (potEl) potEl.textContent = msg.pot?.toLocaleString('nl-NL') ?? '0';
  if (currentBetEl) currentBetEl.textContent = msg.currentBet ?? '0';

  // Other players
  renderOtherPlayers(others, msg.currentPlayerIndex, msg.players, msg.phase);

  // My hole cards
  const myIndex = msg.players.findIndex(p => p.username === myUsername);
  if (myPlayer) {
    if (myHandEl) renderCardList(myHandEl, myPlayer.hand || [], false, false);

    // Hand name badge
    const showBadge = myPlayer.handResult && ['preflop','flop','turn','river','results'].includes(msg.phase);
    if (myHandNameEl) {
      if (showBadge) {
        myHandNameEl.textContent = myPlayer.handResult.name;
        myHandNameEl.style.display = '';
      } else {
        myHandNameEl.style.display = 'none';
      }
    }

    if (myLabel) myLabel.textContent = myPlayer.username + (myPlayer.isHost ? ' ♛' : '');

    const isMyTurn = ['preflop','flop','turn','river'].includes(msg.phase) && msg.currentPlayerIndex === myIndex;
    if (myZone) myZone.classList.toggle('active-turn', isMyTurn);
  }

  renderControls(msg, myPlayer, myIndex);
}

function renderOtherPlayers(others, currentPlayerIndex, allPlayers, phase) {
  if (!otherPlayersLeft || !otherPlayersRight) return;
  otherPlayersLeft.innerHTML = '';
  otherPlayersRight.innerHTML = '';

  const playingPhases = ['preflop', 'flop', 'turn', 'river'];
  const isResults = phase === 'results';

  others.forEach((player, i) => {
    const globalIndex = allPlayers.findIndex(p => p.username === player.username);
    const isCurrentTurn = playingPhases.includes(phase) && currentPlayerIndex === globalIndex;
    const isFolded = player.status === 'folded';

    const statusMap = {
      waiting: 'Wachten', antes: 'Inzetten...', ready: 'Klaar ✓',
      playing: 'Speelt', folded: 'Gefolded',
    };
    const resultMap = { win: 'Gewonnen! 🏆', lose: 'Verloren', tie: 'Gelijkspel' };
    const statusText = player.result
      ? (resultMap[player.result] || player.status)
      : (statusMap[player.status] || player.status);

    const betBadge = player.streetBet > 0
      ? `<span class="player-chip">${player.streetBet} EC</span>`
      : player.ante > 0
      ? `<span class="player-chip">Ante: ${player.ante}</span>`
      : '';

    const handNameBadge = isResults && player.handResult && !isFolded
      ? `<div class="hand-name-small">${player.handResult.name}</div>`
      : '';

    const div = document.createElement('div');
    div.className = 'other-player'
      + (isCurrentTurn ? ' active-turn' : '')
      + (isFolded ? ' folded' : '');

    div.innerHTML = `
      <div class="other-player-name">${player.username}${player.isHost ? ' ♛' : ''}</div>
      <div class="other-hand"></div>
      ${handNameBadge}
      <div class="other-meta">
        <span class="other-status">${statusText}</span>
        ${betBadge}
      </div>
    `;

    const handEl = div.querySelector('.other-hand');

    if (isResults && player.hand?.length > 0 && !isFolded) {
      // Show revealed cards at results
      player.hand.forEach((card, idx) => {
        const el = makeCardEl(card, false, true);
        el.style.animationDelay = `${idx * 80}ms`;
        handEl.appendChild(el);
      });
    } else if (playingPhases.includes(phase) && !isFolded && player.hasCards) {
      // Show 2 card backs during play
      for (let j = 0; j < 2; j++) {
        const el = makeCardEl(null, true, true);
        el.style.animationDelay = `${j * 80}ms`;
        handEl.appendChild(el);
      }
    }

    (i % 2 === 0 ? otherPlayersLeft : otherPlayersRight).appendChild(div);
  });
}

function renderControls(msg, myPlayer, myIndex) {
  [ctrlWaiting, ctrlAntes, ctrlPlaying, ctrlResults].forEach(el => {
    if (el) el.style.display = 'none';
  });

  switch (msg.phase) {
    case 'waiting': showWaitingControls(msg);                     break;
    case 'antes':   showAntesControls(myPlayer);                  break;
    case 'preflop':
    case 'flop':
    case 'turn':
    case 'river':   showPlayingControls(msg, myPlayer, myIndex);  break;
    case 'results': showResultsControls(msg, myPlayer);           break;
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

  const canStart = isHost && msg.players.length >= 2;
  if (startBtn) startBtn.style.display = canStart ? 'inline-block' : 'none';
  if (waitMsg) {
    waitMsg.textContent = isHost
      ? (msg.players.length < 2 ? 'Wachten op meer spelers (min. 2)...' : 'Klaar om te starten!')
      : 'Wachten op de host...';
  }
}

function showAntesControls(myPlayer) {
  if (!ctrlAntes) return;
  ctrlAntes.style.display = 'flex';

  const alreadyPlaced = myPlayer?.status === 'ready';
  if (anteBtn) anteBtn.disabled = alreadyPlaced;
  if (anteAmountEl) anteAmountEl.disabled = alreadyPlaced;
  if (anteWaitMsg) {
    anteWaitMsg.textContent = alreadyPlaced
      ? 'Inzet geplaatst — wachten op anderen...'
      : 'Plaats je inzet voor deze hand!';
  }
}

function showPlayingControls(msg, myPlayer, myIndex) {
  if (!ctrlPlaying) return;
  ctrlPlaying.style.display = 'flex';

  const isMyTurn = msg.currentPlayerIndex === myIndex && myPlayer?.status === 'playing';
  const callAmount = isMyTurn ? Math.max(0, msg.currentBet - (myPlayer?.streetBet || 0)) : 0;
  const canCheck = isMyTurn && callAmount === 0;

  if (foldBtn) foldBtn.disabled = !isMyTurn;
  if (raiseBtn) raiseBtn.disabled = !isMyTurn;
  if (raiseAmountEl) raiseAmountEl.disabled = !isMyTurn;

  if (checkCallBtn) {
    checkCallBtn.disabled = !isMyTurn;
    if (canCheck) {
      checkCallBtn.textContent = 'Check';
      checkCallBtn.className = 'btn-action btn-check';
      checkCallBtn.dataset.action = 'check';
    } else {
      checkCallBtn.textContent = `Call ${callAmount} EC`;
      checkCallBtn.className = 'btn-action btn-call';
      checkCallBtn.dataset.action = 'call';
    }
  }

  if (turnMsg) {
    if (isMyTurn) {
      turnMsg.textContent = callAmount > 0
        ? `Jouw beurt — ${callAmount} EC te callen`
        : 'Jouw beurt!';
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
    const labels = { win: 'Gewonnen!', lose: 'Verloren', tie: 'Gelijkspel' };
    let text = labels[myPlayer.result] || '–';
    if (myPlayer.winAmount > 0) text += ` (+${myPlayer.winAmount} EC)`;
    if (myPlayer.handResult?.name && myPlayer.handResult.name !== '–') {
      text += ` — ${myPlayer.handResult.name}`;
    }
    resultMsg.textContent = text;
    const cls = myPlayer.result === 'tie' ? 'push' : (myPlayer.result || 'push');
    resultMsg.className = 'outcome-msg visible ' + cls;
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

startBtn?.addEventListener('click',     () => send({ type: 'POKER_START_GAME' }));
playAgainBtn?.addEventListener('click', () => send({ type: 'POKER_PLAY_AGAIN' }));
foldBtn?.addEventListener('click',      () => send({ type: 'POKER_FOLD' }));

checkCallBtn?.addEventListener('click', () => {
  if (checkCallBtn.dataset.action === 'call') {
    send({ type: 'POKER_CALL' });
  } else {
    send({ type: 'POKER_CHECK' });
  }
});

raiseBtn?.addEventListener('click', () => {
  const raiseBy = parseInt(raiseAmountEl?.value, 10);
  if (!raiseBy || raiseBy < 1) { showError('Ongeldige raise — minimaal 1 EC'); return; }
  if (window.Sound) Sound.playChip();
  send({ type: 'POKER_RAISE', raiseBy });
});

anteBtn?.addEventListener('click', () => {
  const amount = parseInt(anteAmountEl?.value, 10);
  if (!amount || amount < 1) { showError('Ongeldige inzet'); return; }
  if (window.Sound) Sound.playChip();
  send({ type: 'POKER_PLACE_ANTE', amount });
});

document.querySelectorAll('.ante-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    if (anteAmountEl) anteAmountEl.value = btn.dataset.set;
    if (window.Sound) Sound.playChip();
  });
});
