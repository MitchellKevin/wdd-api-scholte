// simple test that spins up two WS clients and performs a DEAL then NEXT streets
const WebSocket = require('ws');
const url = 'ws://localhost:4322/ws';

function makeClient(name){
  const ws = new WebSocket(url);
  ws.on('open', ()=>{
    console.log(name+': open');
    ws.send(JSON.stringify({ type:'JOIN_TABLE', tableId:'9999', displayName: name, game: 'poker' }));
  });
  ws.on('message', (data)=>{
    try{
      const msg = JSON.parse(data);
      console.log(name+': rx', JSON.stringify(msg));
    }catch(e){ console.log(name+': rx raw', String(data)); }
  });
  ws.on('close', ()=> console.log(name+': closed'));
  ws.on('error', (e)=> console.log(name+': err', e && e.message));
  return ws;
}

(async function(){
  const a = makeClient('ClientA');
  const b = makeClient('ClientB');

  // wait for connections
  await new Promise(r=>setTimeout(r, 1000));

  console.log('ClientA sending DEAL');
  a.send(JSON.stringify({ type:'PLAYER_ACTION', action:'DEAL', game: 'poker' }));

  await new Promise(r=>setTimeout(r, 1200));
  console.log('ClientA sending NEXT (flop)');
  a.send(JSON.stringify({ type:'PLAYER_ACTION', action:'NEXT', game: 'poker' }));

  await new Promise(r=>setTimeout(r, 800));
  console.log('ClientA sending NEXT (turn)');
  a.send(JSON.stringify({ type:'PLAYER_ACTION', action:'NEXT', game: 'poker' }));

  await new Promise(r=>setTimeout(r, 800));
  console.log('ClientA sending NEXT (river)');
  a.send(JSON.stringify({ type:'PLAYER_ACTION', action:'NEXT', game: 'poker' }));

  await new Promise(r=>setTimeout(r, 1000));
  a.close(); b.close();
  console.log('done');
})();
