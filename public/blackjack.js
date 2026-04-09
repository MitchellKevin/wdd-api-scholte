// Minimal single-player Blackjack vs dealer (no network)
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const suits = ['♠','♥','♦','♣'];

function createDeck(){
  const d = [];
  for(const s of suits) for(const r of ranks) d.push({rank:r,suit:s});
  return d;
}

function shuffle(deck){
  for(let i=deck.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]] = [deck[j],deck[i]];
  }
}

function cardValue(card){
  if(!card || typeof card.rank !== 'string') return 0;
  if(card.rank === 'A') return 11;
  if(['J','Q','K'].includes(card.rank)) return 10;
  const v = parseInt(card.rank,10);
  return Number.isNaN(v) ? 0 : v;
}

function handValue(hand){
  let total=0, aces=0;
  for(const c of hand){
    if(c.rank === 'A'){ aces++; total += 11; } else total += cardValue(c);
  }
  while(total>21 && aces>0){ total -=10; aces--; }
  return total;
}

function makeCardEl(card){
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `<div class="rank">${card.rank}</div><div class="suit">${card.suit}</div>`;
  return el;
}

let deck = [];
let dealer = { hand: [] };
let player = { hand: [] };
let bank = 1000;
let bet = 50;

// read join params if provided (from /table redirect)
const BJ_PARAMS = (typeof window !== 'undefined' && window._BJ_PARAMS) ? window._BJ_PARAMS : { room: '', name: '', host: false };
if (BJ_PARAMS && BJ_PARAMS.name) {
  // show small welcome
  if (typeof messageEl !== 'undefined' && messageEl) messageEl.textContent = 'Welcome ' + BJ_PARAMS.name + (BJ_PARAMS.host ? ' (host)' : '');
}

const dealerHandEl = document.getElementById('dealerHand');
const playerHandEl = document.getElementById('playerHand');
const dealerScoreEl = document.getElementById('dealerScore');
const playerScoreEl = document.getElementById('playerScore');
const bankEl = document.getElementById('bank');
const messageEl = document.getElementById('message');

const dealBtn = document.getElementById('dealBtn');
const hitBtn = document.getElementById('hitBtn');
const standBtn = document.getElementById('standBtn');
const newBtn = document.getElementById('newBtn');
const betInput = document.getElementById('betAmount');

// Defensive checks: if any required element is missing, show error and stop.
function fatal(msg){
  console.error('Blackjack fatal:', msg);
  if(messageEl) messageEl.textContent = 'Error: ' + msg;
  // disable controls if present
  if(dealBtn) dealBtn.disabled = true;
  if(hitBtn) hitBtn.disabled = true;
  if(standBtn) standBtn.disabled = true;
  throw new Error(msg);
}

if(!dealerHandEl || !playerHandEl || !dealerScoreEl || !playerScoreEl || !bankEl || !messageEl) {
  fatal('Missing required DOM elements for Blackjack page.');
}

if(!dealBtn || !hitBtn || !standBtn || !newBtn || !betInput) {
  fatal('Missing control elements (buttons or bet input).');
}

function resetTable(){
  deck = createDeck(); shuffle(deck);
  dealer.hand = [];
  player.hand = [];
  dealerHandEl.innerHTML = '';
  playerHandEl.innerHTML = '';
  dealerScoreEl.textContent = '-';
  playerScoreEl.textContent = '0';
  messageEl.textContent = '';
  hitBtn.disabled = true;
  standBtn.disabled = true;
}

function dealInitial(){
  bet = Math.max(1, Math.min(bank, Number(betInput.value) || 1));
  bank -= bet; bankEl.textContent = String(bank);

  player.hand.push(deck.pop());
  dealer.hand.push(deck.pop());
  player.hand.push(deck.pop());
  dealer.hand.push(deck.pop());

  renderHands(true);

  const pval = handValue(player.hand);
  playerScoreEl.textContent = String(pval);
  if(pval === 21){
    finishHand();
  } else {
    hitBtn.disabled = false; standBtn.disabled = false;
  }
}

function renderHands(hideDealerHole = false){
  dealerHandEl.innerHTML = '';
  playerHandEl.innerHTML = '';

  dealer.hand.forEach((c,i)=>{
    const el = makeCardEl(c);
    if(hideDealerHole && i===0){ el.classList.add('back'); el.innerHTML = ''; }
    dealerHandEl.appendChild(el);
  });

  player.hand.forEach(c=> playerHandEl.appendChild(makeCardEl(c)));
}

function playerHit(){
  player.hand.push(deck.pop());
  renderHands(true);
  const pv = handValue(player.hand);
  playerScoreEl.textContent = String(pv);
  if(pv>21) finishHand();
}

function dealerPlay(){
  renderHands(false);
  let dv = handValue(dealer.hand);
  dealerScoreEl.textContent = String(dv);
  // draw until dealer 17+ or deck empty
  while(dv < 17 && deck.length > 0){
    const card = deck.pop();
    if(!card) break;
    dealer.hand.push(card);
    dv = handValue(dealer.hand);
    dealerScoreEl.textContent = String(dv);
    renderHands(false); // update UI each draw so multiple cards show
  }
}

function finishHand(){
  hitBtn.disabled = true; standBtn.disabled = true;
  dealerPlay();
  const pv = handValue(player.hand);
  const dv = handValue(dealer.hand);
  dealerScoreEl.textContent = String(dv);
  playerScoreEl.textContent = String(pv);

  let outcome = '';
  if(pv>21){ outcome = 'You busted — lose'; }
  else if(dv>21){ outcome = 'Dealer busted — you win'; bank += bet*2; }
  else if(pv === dv){ outcome = 'Push'; bank += bet; }
  else if(pv === 21 && player.hand.length === 2){ outcome = 'Blackjack! You win 1.5x'; bank += Math.floor(bet * 2.5); }
  else if(pv > dv){ outcome = 'You win!'; bank += bet*2; }
  else { outcome = 'Dealer wins'; }

  bankEl.textContent = String(bank);
  messageEl.textContent = outcome;
}

// event bindings
resetTable();

// if arrived via join, auto-deal a hand for convenience
try{
  if(BJ_PARAMS && BJ_PARAMS.name){
    // small delay to let UI render
    setTimeout(()=>{
      if (dealBtn && !dealBtn.disabled) {
        dealBtn.click();
      } else if (dealBtn) {
        // enable and click
        dealBtn.disabled = false; dealBtn.click();
      }
    }, 250);
  }
}catch(e){ /* ignore */ }

// Multiplayer: if room provided, connect to server and use server state
let socket = null;
let isMultiplayer = !!(BJ_PARAMS && BJ_PARAMS.room);
let myClientId = null;
let lastRawMsgEl = null;

function applySnapshot(snap){
  if(!snap) return;
  // render dealer
  dealer.hand = snap.dealer ? (snap.dealer.hand || []) : [];
  // find our player by client id (fallback to name)
  let me = null;
  if (snap.clientId && snap.players) me = (snap.players || []).find(p => p.id === snap.clientId);
  if(!me) me = (snap.players || []).find(p => p.displayName === (BJ_PARAMS && BJ_PARAMS.name));
  if(me){ player.hand = me.hand.slice(); }
  // else if not found, keep local
  renderHands(snap.phase !== 'finished');
  dealerScoreEl.textContent = dealer.hand ? String(handValue(dealer.hand)) : '-';
  playerScoreEl.textContent = player.hand ? String(handValue(player.hand)) : '0';
  // show message
  if(snap.phase === 'finished'){
    messageEl.textContent = 'Round finished';
  } else {
    messageEl.textContent = '';
  }
}

function renderPlayerList(players){
  const el = document.getElementById('playerList');
  if(!el) return;
  if(!players || players.length === 0) { el.textContent = '(none yet)'; return; }
  el.innerHTML = '';
  players.forEach(p=>{
    const d = document.createElement('div');
    d.textContent = (p.displayName || 'Unknown') + (p.isHost ? ' (host)' : '') + (p.id === myClientId ? ' ← you' : '');
    el.appendChild(d);
  });
}

if(isMultiplayer){
  const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = wsProto + '://' + location.host + '/ws';
  socket = new WebSocket(wsUrl);
  socket.addEventListener('open', ()=>{
    console.log('BJ socket open');
    // join table on blackjack page
    const room = BJ_PARAMS.room;
    const name = BJ_PARAMS.name || ('Guest-' + Math.random().toString(36).slice(2,6));
    socket.send(JSON.stringify({ type: 'JOIN_TABLE', tableId: room, displayName: name, host: BJ_PARAMS.host }));
  const statusEl = document.getElementById('message'); if(statusEl) statusEl.textContent = 'WS open, joined ' + room;
  });

  socket.addEventListener('message', (ev)=>{
    let msg; try{ msg = JSON.parse(ev.data); }catch(e){return;}
    console.log('BJ WS RX', msg);
    // show raw message
    if(!lastRawMsgEl) lastRawMsgEl = document.getElementById('playerList');
    if(lastRawMsgEl) lastRawMsgEl.dataset.last = JSON.stringify(msg);
    if(msg.type === 'WELCOME' && msg.clientId){
      myClientId = msg.clientId;
      console.log('assigned clientId', myClientId);
    }
    if(msg.type === 'TABLE_UPDATE'){
      applySnapshot({ phase: msg.phase, dealer: msg.dealer, players: msg.players, clientId: myClientId });
      renderPlayerList(msg.players || []);
      const statusEl = document.getElementById('message'); if(statusEl) statusEl.textContent = 'Received TABLE_UPDATE: ' + (msg.players?msg.players.length:0) + ' players';
    }
  });

  // actions send to server
  if (dealBtn) dealBtn.addEventListener('click', ()=>{
    socket.send(JSON.stringify({ type: 'PLAYER_ACTION', action: 'DEAL' }));
  });
  if (hitBtn) hitBtn.addEventListener('click', ()=>{
    socket.send(JSON.stringify({ type: 'PLAYER_ACTION', action: 'HIT' }));
  });
  if (standBtn) standBtn.addEventListener('click', ()=>{
    socket.send(JSON.stringify({ type: 'PLAYER_ACTION', action: 'STAND' }));
  });
} else {
  if (dealBtn) dealBtn.addEventListener('click', ()=>{
    resetTable();
    dealInitial();
  });

  if (hitBtn) hitBtn.addEventListener('click', ()=>{
    playerHit();
  });

  if (standBtn) standBtn.addEventListener('click', ()=>{
    finishHand();
  });
}

if (newBtn) newBtn.addEventListener('click', ()=>{
  resetTable();
});
 