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

