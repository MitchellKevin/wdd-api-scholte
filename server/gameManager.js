// Minimal in-memory blackjack game manager

const tables = new Map();

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

function handValue(hand){
  let total=0, aces=0;
  for(const c of hand){
    if(!c || typeof c.rank !== 'string'){
      console.warn('[GM] unexpected card', c);
      continue;
    }
    if(c.rank === 'A'){ aces++; total += 11; }
    else if(['J','Q','K'].includes(c.rank)) total += 10;
    else {
      const v = parseInt(c.rank,10);
      if(Number.isNaN(v)){
        console.warn('[GM] unknown rank', c.rank);
      } else {
        total += v;
      }
    }
  }
  while(total>21 && aces>0){ total -=10; aces--; }
  return total;
}

function ensureTable(id){
  if(!tables.has(id)){
    tables.set(id, {
      players: [], // array {id, displayName, isHost, hand:[], stood:boolean, busted:boolean}
      dealer: { hand: [] },
      deck: [],
      phase: 'waiting', // waiting, playing, dealer, finished
      currentIndex: 0
    });
  }
  return tables.get(id);
}

function snapshot(tableId){
  const t = tables.get(tableId);
  if(!t) return null;
  return {
    phase: t.phase,
    dealer: { hand: t.dealer.hand.slice() },
    players: t.players.map(p=>({ id: p.id, displayName: p.displayName, isHost: p.isHost, hand: p.hand.slice(), stood: !!p.stood, busted: !!p.busted }))
  };
}

function addPlayer(tableId, client){
  const t = ensureTable(tableId);
  if(t.players.find(p=>p.id === client.id)) return;
  t.players.push({ id: client.id, displayName: client.displayName, isHost: client.isHost, hand: [], stood:false, busted:false });
}

function removePlayer(tableId, clientId){
  const t = tables.get(tableId);
  if(!t) return;
  t.players = t.players.filter(p=>p.id !== clientId);
  // if host left, assign host to first player
  if(!t.players.some(p=>p.isHost) && t.players.length>0) t.players[0].isHost = true;
}

function startHand(tableId){
  const t = ensureTable(tableId);
  t.deck = createDeck(); shuffle(t.deck);
  t.dealer.hand = [];
  t.players.forEach(p=>{ p.hand = []; p.stood = false; p.busted = false; });

  // deal two cards each
  for(let i=0;i<2;i++){
    for(const p of t.players) p.hand.push(t.deck.pop());
    t.dealer.hand.push(t.deck.pop());
  }
  t.phase = 'playing';
  t.currentIndex = 0;
  // move currentIndex to first active player
  advanceToNextActive(t);
  return snapshot(tableId);
}

function advanceToNextActive(t){
  const n = t.players.length;
  for(let i=0;i<n;i++){
    const idx = (t.currentIndex + i) % n;
    const p = t.players[idx];
    if(p && !p.stood && !p.busted){ t.currentIndex = idx; return; }
  }
  // no active players
  t.currentIndex = -1;
}

function playerHit(tableId, clientId){
  const t = tables.get(tableId); if(!t) return null;
  const p = t.players.find(x=>x.id === clientId); if(!p) return null;
  if(t.phase !== 'playing') return snapshot(tableId);
  p.hand.push(t.deck.pop());
  const val = handValue(p.hand);
  if(val>21) p.busted = true;
  // if busted or reached 21, move to next
  if(p.busted || val>=21){
    // advance
    if(t.currentIndex === t.players.findIndex(x=>x.id===clientId)){
      // move to next player
      t.currentIndex = (t.currentIndex + 1) % Math.max(1,t.players.length);
      advanceToNextActive(t);
    }
  }
  // if no active players => dealer plays
  if(t.currentIndex === -1) runDealer(t);
  return snapshot(tableId);
}

function playerStand(tableId, clientId){
  const t = tables.get(tableId); if(!t) return null;
  const p = t.players.find(x=>x.id === clientId); if(!p) return null;
  p.stood = true;
  // if it was their turn, advance
  if(t.currentIndex === t.players.findIndex(x=>x.id===clientId)){
    t.currentIndex = (t.currentIndex + 1) % Math.max(1,t.players.length);
    advanceToNextActive(t);
  }
  if(t.currentIndex === -1) runDealer(t);
  return snapshot(tableId);
}

function runDealer(t){
  t.phase = 'dealer';
  let dv = handValue(t.dealer.hand);
  console.log('[GM] dealer starts with', t.dealer.hand.map(c=>c.rank+c.suit), 'value', dv);
  // draw until dealer reaches soft/hard 17 or deck exhausted
  while(dv < 17 && t.deck.length > 0){
    const card = t.deck.pop();
    if(!card){ break; }
    t.dealer.hand.push(card);
    dv = handValue(t.dealer.hand);
    console.log('[GM] dealer drew', card.rank + card.suit, 'new value', dv);
  }
  // compute results (optional): mark winners in player objects
  for(const p of t.players){
    const pv = handValue(p.hand);
    p.result = '';
    if(pv>21) p.result = 'lose';
    else if(dv>21) p.result = 'win';
    else if(pv === dv) p.result = 'push';
    else if(pv>dv) p.result = 'win';
    else p.result = 'lose';
  }
  t.phase = 'finished';
}

function handleAction(tableId, clientId, msg){
  // msg.action: 'DEAL'|'HIT'|'STAND'
  const t = ensureTable(tableId);
  if(msg.action === 'DEAL'){
    return startHand(tableId);
  }
  if(msg.action === 'HIT'){
    return playerHit(tableId, clientId);
  }
  if(msg.action === 'STAND'){
    return playerStand(tableId, clientId);
  }
  return snapshot(tableId);
}

export default {
  addPlayer,
  removePlayer,
  handleAction,
  snapshot
};
