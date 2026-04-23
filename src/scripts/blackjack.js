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

// Split / double state
let isSplit = false;
let splitHandArr = [];
let splitBet = 0;
let activeSide = 'main'; // 'main' | 'split'

function getToken(){
  try { return sessionStorage.getItem('token'); } catch(e){ return null; }
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
const splitHandEl   = document.getElementById('splitHand');
const splitHandWrap = document.getElementById('splitHandWrap');
const playerHandCol = document.getElementById('playerHandCol');
const dealerScoreEl = document.getElementById('dealerScore');
const playerScoreEl = document.getElementById('playerScore');
const splitScoreEl  = document.getElementById('splitScore');
const bankEl        = document.getElementById('bank');
const messageEl     = document.getElementById('message');
const dealerBadge   = document.getElementById('dealerScoreBadge');
const playerBadge   = document.getElementById('playerScoreBadge');
const splitBadge    = document.getElementById('splitScoreBadge');

const dealBtn   = document.getElementById('dealBtn');
const hitBtn    = document.getElementById('hitBtn');
const standBtn  = document.getElementById('standBtn');
const doubleBtn = document.getElementById('doubleBtn');
const splitBtn  = document.getElementById('splitBtn');
const newBtn    = document.getElementById('newBtn');
const betInput  = document.getElementById('betAmount');

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

  if(!hideDealerHole && !holeRevealed && dCount > 0){
    const holeEl = dEl.children[0];
    if(holeEl && holeEl.classList.contains('back')){
      holeEl.className = 'card flip-reveal' + (isRed(dealer.hand[0]) ? ' red' : '');
      holeEl.innerHTML = makeCardInner(dealer.hand[0]);
      holeRevealed = true;
    }
  }

  if(dCount < dLen){
    for(let i = dCount; i < dLen; i++){
      const el = makeCardEl(dealer.hand[i], hideDealerHole && i === 0);
      el.style.animationDelay = dCount === 0 ? `${i * 220}ms` : `${(i - dCount) * 280}ms`;
      dEl.appendChild(el);
    }
  }

  // ── Player main hand ──
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

function renderSplitHand(){
  if(!splitHandEl) return;
  const existing = splitHandEl.children.length;
  for(let i = existing; i < splitHandArr.length; i++){
    const el = makeCardEl(splitHandArr[i]);
    el.style.animationDelay = '0ms';
    splitHandEl.appendChild(el);
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

function updateActionBtns(phase){
  const playing = phase === 'playing';
  hitBtn.disabled = !playing;
  standBtn.disabled = !playing;

  if(playing){
    const activeHand = activeSide === 'main' ? player.hand : splitHandArr;
    const activeBetAmt = activeSide === 'main' ? bet : splitBet;
    doubleBtn.disabled = activeHand.length !== 2 || bank < activeBetAmt;
    splitBtn.disabled  = isSplit || activeSide !== 'main' ||
                         player.hand.length !== 2 ||
                         player.hand[0].rank !== player.hand[1].rank ||
                         bank < bet;
  } else {
    doubleBtn.disabled = true;
    splitBtn.disabled  = true;
  }
}

function updateHandHighlight(){
  if(!playerHandCol || !splitHandWrap) return;
  if(isSplit){
    playerHandCol.classList.toggle('active-hand', activeSide === 'main');
    splitHandWrap.classList.toggle('active-hand', activeSide === 'split');
  } else {
    playerHandCol.classList.remove('active-hand');
    splitHandWrap.classList.remove('active-hand');
  }
}

// ── Game logic ─────────────────────────────────────────────────────────────
function resetTable(){
  deck = createDeck(); shuffle(deck);
  dealer.hand = [];
  player.hand = [];
  holeRevealed = false;
  isSplit = false;
  splitHandArr = [];
  splitBet = 0;
  activeSide = 'main';

  dealerHandEl.innerHTML = '';
  playerHandEl.innerHTML = '';
  if(splitHandEl) splitHandEl.innerHTML = '';
  if(splitHandWrap){ splitHandWrap.style.display = 'none'; splitHandWrap.classList.remove('active-hand','done-hand'); }
  if(playerHandCol){ playerHandCol.classList.remove('active-hand','done-hand'); }

  setScore(dealerScoreEl, dealerBadge, '–');
  setScore(playerScoreEl, playerBadge, '0');
  if(splitScoreEl && splitBadge) setScore(splitScoreEl, splitBadge, '0');
  hideOutcome();
  updateActionBtns('done');
}

function dealInitial(){
  bet = Math.max(1, Math.min(bank, Number(betInput.value) || 1));
  bank -= bet;
  bankEl.textContent = bank.toLocaleString('nl-NL');

  player.hand.push(deck.pop());
  dealer.hand.push(deck.pop());
  player.hand.push(deck.pop());
  dealer.hand.push(deck.pop());

  renderHands(true);

  const pCards = playerHandEl.querySelectorAll('.card');
  const dCards = dealerHandEl.querySelectorAll('.card');
  if(pCards[0]) pCards[0].style.animationDelay = '0ms';
  if(dCards[0]) dCards[0].style.animationDelay = '180ms';
  if(pCards[1]) pCards[1].style.animationDelay = '360ms';
  if(dCards[1]) dCards[1].style.animationDelay = '540ms';

  const pval = handValue(player.hand);
  setScore(playerScoreEl, playerBadge, pval, { bj: pval === 21 });
  if(pval === 21){
    finishHand();
  } else {
    updateActionBtns('playing');
  }
}

function playerHit(){
  const activeHand = activeSide === 'main' ? player.hand : splitHandArr;
  activeHand.push(deck.pop());

  if(activeSide === 'main'){
    renderHands(true);
    const pv = handValue(player.hand);
    setScore(playerScoreEl, playerBadge, pv, { bust: pv > 21 });
    if(pv > 21) finishHand(); else updateActionBtns('playing');
  } else {
    renderSplitHand();
    const sv = handValue(splitHandArr);
    setScore(splitScoreEl, splitBadge, sv, { bust: sv > 21 });
    if(sv > 21) finishHand(); else updateActionBtns('playing');
  }
}

function doDouble(){
  const activeBetAmt = activeSide === 'main' ? bet : splitBet;
  bank -= activeBetAmt;
  if(activeSide === 'main') bet *= 2; else splitBet *= 2;
  bankEl.textContent = bank.toLocaleString('nl-NL');

  const activeHand = activeSide === 'main' ? player.hand : splitHandArr;
  activeHand.push(deck.pop());

  if(activeSide === 'main'){
    renderHands(true);
    const pv = handValue(player.hand);
    setScore(playerScoreEl, playerBadge, pv, { bust: pv > 21 });
  } else {
    renderSplitHand();
    const sv = handValue(splitHandArr);
    setScore(splitScoreEl, splitBadge, sv, { bust: sv > 21 });
  }
  finishHand();
}

function doSplit(){
  const secondCard = player.hand.pop();
  splitHandArr = [secondCard];
  splitBet = bet;
  bank -= bet;
  isSplit = true;
  activeSide = 'main';

  // Deal one new card to each hand
  player.hand.push(deck.pop());
  splitHandArr.push(deck.pop());

  // Show split area
  if(splitHandWrap) splitHandWrap.style.display = '';

  // Re-render both hands from scratch
  playerHandEl.innerHTML = '';
  renderHands(true);
  if(splitHandEl) splitHandEl.innerHTML = '';
  renderSplitHand();

  setScore(playerScoreEl, playerBadge, handValue(player.hand));
  setScore(splitScoreEl, splitBadge, handValue(splitHandArr));
  bankEl.textContent = bank.toLocaleString('nl-NL');

  updateHandHighlight();
  updateActionBtns('playing');
}

async function dealerPlay(){
  renderHands(false);
  let dv = handValue(dealer.hand);
  setScore(dealerScoreEl, dealerBadge, dv);

  await delay(480);

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

function resolveHand(pv, dv, handLen, handEl, currentBet, allowBJ = true){
  let payout = 0;
  let outcome = '';
  let type = 'push';

  if(pv > 21){
    outcome = 'Bust — verloren';
    type = 'lose';
    flashCards(handEl, 'lose');
  } else if(dv === 21 && dealer.hand.length === 2){
    outcome = 'Dealer blackjack — verloren!';
    type = 'lose';
  } else if(dv > 21){
    outcome = 'Dealer bust — gewonnen!';
    type = 'win';
    payout = currentBet * 2;
    flashCards(handEl, 'win');
  } else if(pv === dv){
    outcome = 'Gelijkspel';
    type = 'push';
    payout = currentBet;
  } else if(allowBJ && pv === 21 && handLen === 2){
    outcome = 'Blackjack! +1.5×';
    type = 'bj';
    payout = Math.floor(currentBet * 2.5);
    flashCards(handEl, 'win');
  } else if(pv > dv){
    outcome = 'Je wint!';
    type = 'win';
    payout = currentBet * 2;
    flashCards(handEl, 'win');
  } else {
    outcome = 'Dealer wint';
    type = 'lose';
    flashCards(handEl, 'lose');
  }

  return { payout, outcome, type };
}

async function finishSplitAndDealer(){
  await dealerPlay();

  const dv = handValue(dealer.hand);
  setScore(dealerScoreEl, dealerBadge, dv, { bust: dv > 21 });

  if(isSplit){
    const pv = handValue(player.hand);
    const sv = handValue(splitHandArr);
    setScore(playerScoreEl, playerBadge, pv, { bust: pv > 21 });
    setScore(splitScoreEl, splitBadge, sv, { bust: sv > 21 });

    // Split hands don't get BJ bonus (standard casino rule)
    const r1 = resolveHand(pv, dv, player.hand.length, playerHandEl, bet, false);
    const r2 = resolveHand(sv, dv, splitHandArr.length, splitHandEl, splitBet, false);

    bank += r1.payout + r2.payout;

    let combinedOutcome;
    if(r1.type === r2.type){
      const labels = { win: 'Beide gewonnen!', lose: 'Beide verloren', push: 'Beide gelijkspel' };
      combinedOutcome = labels[r1.type] || `${r1.outcome} | ${r2.outcome}`;
    } else {
      combinedOutcome = `Hand 1: ${r1.outcome} | Hand 2: ${r2.outcome}`;
    }

    const totalReturn = r1.payout + r2.payout;
    const totalStake  = bet + splitBet;
    const overallType = totalReturn > totalStake ? 'win' : totalReturn === totalStake ? 'push' : 'lose';
    showOutcome(combinedOutcome, overallType);
  } else {
    const pv = handValue(player.hand);
    setScore(playerScoreEl, playerBadge, pv, { bust: pv > 21, bj: pv === 21 && player.hand.length === 2 });

    const r = resolveHand(pv, dv, player.hand.length, playerHandEl, bet, true);
    bank += r.payout;
    showOutcome(r.outcome, r.type);
  }

  bankEl.textContent = bank.toLocaleString('nl-NL');
  saveBalance();
}

async function finishHand(){
  updateActionBtns('done');

  // If on main hand during split, switch to split hand
  if(isSplit && activeSide === 'main'){
    const pv = handValue(player.hand);
    setScore(playerScoreEl, playerBadge, pv, { bust: pv > 21 });
    playerHandCol && playerHandCol.classList.add('done-hand');
    playerHandCol && playerHandCol.classList.remove('active-hand');

    activeSide = 'split';
    updateHandHighlight();

    const sv = handValue(splitHandArr);
    if(sv === 21 && splitHandArr.length === 2){
      // Auto-stand split blackjack
      await finishSplitAndDealer();
    } else {
      updateActionBtns('playing');
    }
    return;
  }

  await finishSplitAndDealer();
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

if(dealBtn)   dealBtn.addEventListener('click',  () => { resetTable(); dealInitial(); });
if(hitBtn)    hitBtn.addEventListener('click',   () => { playerHit(); });
if(standBtn)  standBtn.addEventListener('click', () => { finishHand(); });
if(doubleBtn) doubleBtn.addEventListener('click',() => { doDouble(); });
if(splitBtn)  splitBtn.addEventListener('click', () => { doSplit(); });
if(newBtn)    newBtn.addEventListener('click',   () => { resetTable(); });
