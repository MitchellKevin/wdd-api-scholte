// Minimal single-player Blackjack vs dealer
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

function isRed(card){ return card.suit === '♥' || card.suit === '♦'; }

function makeCardInner(card){
  return `<div class="rank">${card.rank}</div><div class="suit-center">${card.suit}</div><div class="suit">${card.suit}</div>`;
}

function makeCardEl(card, hidden = false){
  const el = document.createElement('div');
  if(hidden){
    el.className = 'card back';
  } else {
    el.className = 'card' + (isRed(card) ? ' red' : '');
    el.innerHTML = makeCardInner(card);
  }
  return el;
}

function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

let deck = [];
let dealer = { hand: [] };
let player = { hand: [] };
let bank = 0;
let bet = 50;
let pendingSave = null;
let holeRevealed = false;

function getToken(){
  try { return localStorage.getItem('token'); } catch(e){ return null; }
}

async function loadBalance(){
  try{
    const token = getToken();
    if(!token) return;
    const res = await fetch('/api/balance.json', { method: 'GET', headers: { 'Authorization': 'Bearer ' + token } });
    if(!res.ok) return;
    const j = await res.json();
    if(j && typeof j.balance === 'number'){
      bank = j.balance;
      if(bankEl) bankEl.textContent = bank.toLocaleString('nl-NL');
      if(dealBtn) dealBtn.disabled = false;
    }
  } catch(e){ console.warn('loadBalance failed', e); }
}

function saveBalance(){
  const token = getToken();
  if(!token) return Promise.resolve();
  pendingSave = window.pendingSave = fetch('/api/balance.json', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ balance: bank })
  }).then(r => {
    if(!r.ok) console.warn('saveBalance HTTP error', r.status);
  }).catch(e => console.warn('saveBalance failed', e));
  return pendingSave;
}

const dealerHandEl  = document.getElementById('dealerHand');
const playerHandEl  = document.getElementById('playerHand');
const dealerScoreEl = document.getElementById('dealerScore');
const playerScoreEl = document.getElementById('playerScore');
const bankEl        = document.getElementById('bank');
const messageEl     = document.getElementById('message');
const dealerBadge   = document.getElementById('dealerScoreBadge');
const playerBadge   = document.getElementById('playerScoreBadge');

const dealBtn  = document.getElementById('dealBtn');
const hitBtn   = document.getElementById('hitBtn');
const standBtn = document.getElementById('standBtn');
const newBtn   = document.getElementById('newBtn');
const betInput = document.getElementById('betAmount');

function fatal(msg){
  console.error('Blackjack fatal:', msg);
  if(messageEl) messageEl.textContent = 'Error: ' + msg;
  if(dealBtn) dealBtn.disabled = true;
  if(hitBtn) hitBtn.disabled = true;
  if(standBtn) standBtn.disabled = true;
  throw new Error(msg);
}

if(!dealerHandEl || !playerHandEl || !dealerScoreEl || !playerScoreEl || !bankEl || !messageEl){
  fatal('Missing required DOM elements.');
}
if(!dealBtn || !hitBtn || !standBtn || !newBtn || !betInput){
  fatal('Missing control elements.');
}

// ── Smart incremental render ──────────────────────────────────────────────
function renderHands(hideDealerHole = false){
  const dEl = dealerHandEl;
  const pEl = playerHandEl;

  // ── Dealer ──
  const dCount = dEl.children.length;
  const dLen   = dealer.hand.length;

  // Reveal hole card in-place when going from hidden → show
  if(!hideDealerHole && !holeRevealed && dCount > 0){
    const holeEl = dEl.children[0];
    if(holeEl && holeEl.classList.contains('back')){
      holeEl.className = 'card flip-reveal' + (isRed(dealer.hand[0]) ? ' red' : '');
      holeEl.innerHTML = makeCardInner(dealer.hand[0]);
      holeRevealed = true;
    }
  }

  // Add new dealer cards
  if(dCount < dLen){
    for(let i = dCount; i < dLen; i++){
      const el = makeCardEl(dealer.hand[i], hideDealerHole && i === 0);
      // Initial deal: stagger dealer cards at offset +200ms per card
      el.style.animationDelay = dCount === 0 ? `${i * 220}ms` : `${(i - dCount) * 280}ms`;
      dEl.appendChild(el);
    }
  }

  // ── Player ──
  const pCount = pEl.children.length;
  const pLen   = player.hand.length;

  if(pCount < pLen){
    for(let i = pCount; i < pLen; i++){
      const el = makeCardEl(player.hand[i]);
      el.style.animationDelay = pCount === 0 ? `${i * 220}ms` : '0ms';
      pEl.appendChild(el);
    }
  }
}

function setScore(el, badge, value, opts = {}){
  el.textContent = String(value);
  if(!badge) return;
  badge.className = 'score-badge';
  if(opts.bust)      badge.classList.add('bust');
  else if(opts.bj)   badge.classList.add('blackjack');
  else if(opts.good) badge.classList.add('good');
}

function showOutcome(text, type = 'push'){
  if(!messageEl) return;
  messageEl.className = 'outcome-msg ' + type;
  messageEl.textContent = text;
  // Force reflow to retrigger transition
  void messageEl.offsetWidth;
  messageEl.classList.add('visible');
}

function hideOutcome(){
  if(!messageEl) return;
  messageEl.classList.remove('visible');
}

function flashCards(handEl, type){
  Array.from(handEl.children).forEach(c => {
    c.classList.remove('card-win', 'card-lose');
    void c.offsetWidth;
    c.classList.add(type === 'win' ? 'card-win' : 'card-lose');
  });
}

// ── Game logic ─────────────────────────────────────────────────────────────
function resetTable(){
  deck = createDeck(); shuffle(deck);
  dealer.hand = [];
  player.hand = [];
  holeRevealed = false;
  dealerHandEl.innerHTML = '';
  playerHandEl.innerHTML = '';
  setScore(dealerScoreEl, dealerBadge, '–');
  setScore(playerScoreEl, playerBadge, '0');
  hideOutcome();
  hitBtn.disabled = true;
  standBtn.disabled = true;
}

function dealInitial(){
  bet = Math.max(1, Math.min(bank, Number(betInput.value) || 1));
  bank -= bet;
  bankEl.textContent = bank.toLocaleString('nl-NL');

  // Push cards: player1, dealer1, player2, dealer2
  player.hand.push(deck.pop());
  dealer.hand.push(deck.pop());
  player.hand.push(deck.pop());
  dealer.hand.push(deck.pop());

  renderHands(true);

  // Override delays for alternating deal order (p0, d0, p1, d1)
  const pCards = playerHandEl.querySelectorAll('.card');
  const dCards = dealerHandEl.querySelectorAll('.card');
  if(pCards[0]) pCards[0].style.animationDelay = '0ms';
  if(dCards[0]) dCards[0].style.animationDelay = '180ms';
  if(pCards[1]) pCards[1].style.animationDelay = '360ms';
  if(dCards[1]) dCards[1].style.animationDelay = '540ms';

  const pval = handValue(player.hand);
  const dval = handValue(dealer.hand);
  setScore(playerScoreEl, playerBadge, pval, { bj: pval === 21 });
  if(pval === 21, dval === 21){
    finishHand();
  } else {
    hitBtn.disabled = false;
    standBtn.disabled = false;
  }
}

function playerHit(){
  player.hand.push(deck.pop());
  renderHands(true);
  const pv = handValue(player.hand);
  setScore(playerScoreEl, playerBadge, pv, { bust: pv > 21 });
  if(pv > 21) finishHand();
}

async function dealerPlay(){
  // Reveal hole card with flip animation
  renderHands(false);
  let dv = handValue(dealer.hand);
  setScore(dealerScoreEl, dealerBadge, dv);

  await delay(480); // wait for flip

  while(dv < 17 && deck.length > 0){
    const card = deck.pop();
    if(!card) break;
    dealer.hand.push(card);
    dv = handValue(dealer.hand);
    renderHands(false);
    setScore(dealerScoreEl, dealerBadge, dv, { bust: dv > 21 });
    await delay(420);
  }
}

async function finishHand(){
  hitBtn.disabled = true;
  standBtn.disabled = true;
  await dealerPlay();

  const pv = handValue(player.hand);
  const dv = handValue(dealer.hand);
  setScore(dealerScoreEl, dealerBadge, dv, { bust: dv > 21 });
  setScore(playerScoreEl, playerBadge, pv, { bust: pv > 21, bj: pv === 21 && player.hand.length === 2 });

  let outcome = '';
  let type = 'push';

  if(pv > 21){
    outcome = 'Bust — verloren';
    type = 'lose';
    flashCards(playerHandEl, 'lose');
  }else if(dv === 21 && dealer.hand.length === 2){
    outcome = 'Dealer blackjack — verloren!';
    type = 'lose';
    flashCards(dealerHandEl, 'bj');
  } else if(dv > 21){
    outcome = 'Dealer bust — gewonnen!';
    type = 'win';
    bank += bet * 2;
    flashCards(playerHandEl, 'win');
  } else if(pv === dv){
    outcome = 'Gelijkspel';
    type = 'push';
    bank += bet;
  } else if(pv === 21 && player.hand.length === 2){
    outcome = 'Blackjack! +1.5x';
    type = 'bj';
    bank += Math.floor(bet * 2.5);
    flashCards(playerHandEl, 'win');
  } else if(pv > dv){
    outcome = 'Je wint!';
    type = 'win';
    bank += bet * 2;
    flashCards(playerHandEl, 'win');
  } else {
    outcome = 'Dealer wint';
    type = 'lose';
    flashCards(playerHandEl, 'lose');
  }

  bankEl.textContent = bank.toLocaleString('nl-NL');
  showOutcome(outcome, type);
  saveBalance();
}

// ── Chip quick-set ─────────────────────────────────────────────────────────
document.querySelectorAll('.chip-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if(betInput) betInput.value = btn.dataset.set;
  });
});

// ── Controls ───────────────────────────────────────────────────────────────
resetTable();
loadBalance().catch(() => {});

if(dealBtn) dealBtn.addEventListener('click', () => {
  resetTable();
  dealInitial();
});

if(hitBtn) hitBtn.addEventListener('click', () => { playerHit(); });

if(standBtn) standBtn.addEventListener('click', () => { finishHand(); });

if(newBtn) newBtn.addEventListener('click', () => { resetTable(); });
