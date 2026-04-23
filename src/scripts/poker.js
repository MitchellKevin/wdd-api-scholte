// // Minimal poker client for Texas Hold'em
// const params = (typeof window !== 'undefined') ? (window._POKER_PARAMS || {}) : {};

// const playerListEl = document.getElementById('playerList');
// const communityEl = document.getElementById('community');
// const handEl = document.getElementById('hand');
// const messageEl = document.getElementById('message');

// let socket = null;
// let myClientId = null;

// function renderPlayers(players){
//   if(!playerListEl) return;
//   playerListEl.innerHTML = '';
//   if(!players || players.length===0){ playerListEl.textContent='(none yet)'; return; }
//   players.forEach(p=>{
//     const d = document.createElement('div');
//     d.textContent = (p.displayName || 'Unknown') + (p.isHost ? ' (host)' : '') + (p.id===myClientId ? ' ← you' : '') + (p.folded ? ' (folded)' : '');
//     playerListEl.appendChild(d);
//   });
// }

// function renderCommunity(cards){
//   if(!communityEl) return;
//   communityEl.innerHTML = '';
//   (cards||[]).forEach(c=>{ const d = document.createElement('div'); d.className='card'; d.textContent = c.rank + c.suit; communityEl.appendChild(d); });
// }

// function renderHand(cards){
//   if(!handEl) return;
//   handEl.innerHTML = '';
//   (cards||[]).forEach(c=>{ const d = document.createElement('div'); d.className='card'; d.textContent = c.rank + c.suit; handEl.appendChild(d); });
// }

// function connect(room, name, host){
//   const proto = location.protocol === 'https:' ? 'wss' : 'ws';
//   const wsUrl = proto + '://' + location.host + '/ws';
//   socket = new WebSocket(wsUrl);
//   socket.addEventListener('open', ()=>{
//     socket.send(JSON.stringify({ type:'JOIN_TABLE', tableId: room, displayName: name, host }));
//     if(messageEl) messageEl.textContent = 'Joined ' + room;
//   });
//   socket.addEventListener('message', ev=>{
//     let msg; try{ msg = JSON.parse(ev.data); }catch(e){return;}
//     if(msg.type === 'WELCOME' && msg.clientId) myClientId = msg.clientId;
//     if(msg.type === 'TABLE_UPDATE'){
//       renderPlayers(msg.players || []);
//       renderCommunity(msg.dealer && msg.dealer.community ? msg.dealer.community : (msg.community || []));
//       const me = (msg.players||[]).find(p=>p.id===myClientId) || (msg.players||[]).find(p=>p.displayName===name);
//       if(me) renderHand(me.hand);
//     }
//   });
// }

// window.pokerConnect = connect;

// // action helpers
// window.pokerAction = function(action){ if(!socket) return; socket.send(JSON.stringify({ type:'PLAYER_ACTION', action })); };
