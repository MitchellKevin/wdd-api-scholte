// // Minimal in-memory Texas Hold'em manager (single implementation)

// const tables = new Map();

// const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
// const suits = ['♠','♥','♦','♣'];

// function createDeck(){
//   const d = [];
//   for(const s of suits) for(const r of ranks) d.push({rank:r,suit:s});
//   return d;
// }

// function shuffle(deck){
//   for(let i=deck.length-1;i>0;i--){
//     const j = Math.floor(Math.random()*(i+1));
//     [deck[i],deck[j]] = [deck[j],deck[i]];
//   }
// }

// function ensureTable(id){
//   if(!tables.has(id)){
//     tables.set(id, {
//       players: [], // {id, displayName, isHost, hand:[], folded:false}
//       deck: [],
//       community: [],
//       phase: 'waiting', // waiting, preflop, flop, turn, river, showdown
//     });
//   }
//   return tables.get(id);
// }

// function snapshot(tableId){
//   const t = tables.get(tableId);
//   if(!t) return null;
//   return {
//     phase: t.phase,
//     community: (t.community || []).slice(),
//     players: t.players.map(p=>({ id: p.id, displayName: p.displayName, isHost: p.isHost, hand: (p.hand||[]).slice(), folded: !!p.folded }))
//   };
// }

// function addPlayer(tableId, client){
//   const t = ensureTable(tableId);
//   if(t.players.find(p=>p.id===client.id)) return;
//   t.players.push({ id: client.id, displayName: client.displayName, isHost: client.isHost, hand: [], folded:false });
// }

// function removePlayer(tableId, clientId){
//   const t = tables.get(tableId);
//   if(!t) return;
//   t.players = t.players.filter(p=>p.id !== clientId);
//   if(!t.players.some(p=>p.isHost) && t.players.length>0) t.players[0].isHost = true;
// }

// function startHand(tableId){
//   const t = ensureTable(tableId);
//   t.deck = createDeck(); shuffle(t.deck);
//   t.community = [];
//   t.players.forEach(p=>{ p.hand = []; p.folded = false; });
//   // deal two cards each
//   for(let i=0;i<2;i++){
//     for(const p of t.players){ p.hand.push(t.deck.pop()); }
//   }
//   t.phase = 'preflop';
//   return snapshot(tableId);
// }

// function nextStreet(tableId){
//   const t = tables.get(tableId); if(!t) return null;
//   if(t.phase === 'preflop'){
//     // flop: deal 3
//     t.community.push(t.deck.pop(), t.deck.pop(), t.deck.pop());
//     t.phase = 'flop';
//   } else if(t.phase === 'flop'){
//     t.community.push(t.deck.pop()); t.phase = 'turn';
//   } else if(t.phase === 'turn'){
//     t.community.push(t.deck.pop()); t.phase = 'river';
//   } else if(t.phase === 'river'){
//     t.phase = 'showdown';
//   }
//   return snapshot(tableId);
// }

// function playerFold(tableId, clientId){
//   const t = tables.get(tableId); if(!t) return null;
//   const p = t.players.find(x=>x.id===clientId); if(!p) return null;
//   p.folded = true;
//   return snapshot(tableId);
// }

// function handleAction(tableId, clientId, msg){
//   // actions: DEAL, NEXT, FOLD
//   const t = ensureTable(tableId);
//   const act = (msg.action||'').toUpperCase();
//   if(act === 'DEAL') return startHand(tableId);
//   if(act === 'NEXT') return nextStreet(tableId);
//   if(act === 'FOLD') return playerFold(tableId, clientId);
//   return snapshot(tableId);
// }

// export default {
//   addPlayer,
//   removePlayer,
//   handleAction,
//   snapshot
// };
