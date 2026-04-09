import { WebSocketServer } from 'ws';

const clients = new Map();

export function attachWebSocket(httpServer){
    const wss = new WebSocketServer({server: httpServer});

wss.on('connection', (socket) => {
  const id = generateId();
  clients.set(id, { socket, userId: null });

  // stuur WELCOME direct bij verbinding, niet bij elk bericht
  socket.send(JSON.stringify({ type: 'WELCOME' }));

  socket.on('message', (raw) => {
    handleMessage(id, raw);
  });

  socket.on('close', () => {
    clients.delete(id);
    console.log('Client disconnected:', id);
  });

  console.log('player connected:', id);
});


    function handleMessage(clientId, raw){
        let msg;

        try{
            msg = JSON.parse(raw);
        }catch{
            return;
        }

        switch(msg.type){
            case 'AUTH':
                handleAuth(clientId, msg);
                break;
            case 'JOIN_TABLE':
                handleJoinTable(clientId, msg);
                break;
            case 'PLAYER_ACTION':
                handlePlayerAction(clientId, msg);
                break;
            case 'PING':
                send(clientId, {type: 'PONG', time: Date.now()});
                break;
            default:
                console.log('Unknown message type:', msg.type);
        }
    }

    function generateId(){
        return Math.random().toString(36).substr(2, 9);
    }

    function send(clientId, message){
        const client = clients.get(clientId);
        if(!client) return;

        if(client.socket.readyState === 1){
            client.socket.send(JSON.stringify(message));
        }
    }

    function broadcast(payload, excludeId = null){
        clients.forEach((client, id) => {
            if(id === excludeId) return;
            if(client.socket.readyState === 1){
                client.socket.send(JSON.stringify(payload));
            }
        });
    }

}
