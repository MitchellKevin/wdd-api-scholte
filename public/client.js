const token = localStorage.getItem('token');
const proto = location.protocol === 'https:' ? 'wss' : 'ws';
const socket = new WebSocket(proto + '://'+location.host+'/ws');



socket.addEventListener('open', () => {
  console.log('verbonden!');
  socket.send(JSON.stringify({ type: 'PING' }));
});

socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type){
        case 'TABLE_LIST': renderLobby(msg.tables); break;
        case 'GAME_STATE': renderTable(msg.state); break;
        case 'CARD_DEALT': renderCard(msg.card); break;
        case 'ERROR': showError(msg.message); break;
        case 'PONG': console.log('round trip ms:', Date.now() - msg.time); break;
    }
});

function sendAction(type, payload = {}){
    socket.send(JSON.stringify({type, ...payload}));
}