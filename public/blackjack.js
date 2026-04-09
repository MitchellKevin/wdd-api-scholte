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
  if(card.rank === 'A') return 11;
  if(['J','Q','K'].includes(card.rank)) return 10;
  return parseInt(card.rank,10);
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
  while(dv < 17){
    dealer.hand.push(deck.pop());
    dv = handValue(dealer.hand);
    dealerScoreEl.textContent = String(dv);
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

dealBtn.addEventListener('click', ()=>{
  resetTable();
  dealInitial();
});

hitBtn.addEventListener('click', ()=>{
  playerHit();
});

standBtn.addEventListener('click', ()=>{
  finishHand();
});

newBtn.addEventListener('click', ()=>{
  resetTable();
});
 