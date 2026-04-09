import { WebSocketServer } from 'ws';
import gameManager from './gameManager.js';
import pokerManager from './pokerManager.js';

// WebSocket server for multiplayer blackjack
// - clients: Map clientId -> { socket, tableId, displayName, isHost }
// - tables: Map tableId -> Set(clientId)

const clients = new Map();
const tables = new Map();

function genId(){ return Math.random().toString(36).slice(2,9); }

export function attachWebSocket(httpServer){
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket, req) => {
    const id = genId();
    clients.set(id, { socket, tableId: null, displayName: null, isHost: false });
    console.log('[WS] connection', id, req && req.socket && req.socket.remoteAddress);

    // send assigned client id
    safeSend(socket, { type: 'WELCOME', clientId: id });

    socket.on('message', raw => {
      let msg;
      try { msg = JSON.parse(String(raw)); } catch (e) { console.warn('[WS] bad json from', id); return; }
      console.log('[WS] rx', id, msg && msg.type);
      handleMessage(id, msg);
    });

    socket.on('close', () => {
      const c = clients.get(id);
      if (c && c.tableId) removeClientFromTable(id, c.tableId);
      clients.delete(id);
      console.log('[WS] close', id);
    });
  });

  function handleMessage(clientId, msg){
    if (!msg || !msg.type) return;
    switch (msg.type){
      case 'JOIN_TABLE': return handleJoinTable(clientId, msg);
      case 'PLAYER_ACTION': return handlePlayerAction(clientId, msg);
      case 'PING': return send(clientId, { type: 'PONG' });
      default: console.warn('[WS] unknown', msg.type, 'from', clientId);
    }
  }

  function handleJoinTable(clientId, msg){
    const tableId = String(msg.tableId || '').trim();
    if (!tableId){ send(clientId, { type: 'ERROR', message: 'Invalid table id' }); return; }

    const client = clients.get(clientId);
    if (!client) return;

    if (client.tableId) removeClientFromTable(clientId, client.tableId);

    client.tableId = tableId;
    client.displayName = msg.displayName || ('Guest-' + genId().slice(0,4));
    client.isHost = !!msg.host;

    if (!tables.has(tableId)) tables.set(tableId, new Set());
    const set = tables.get(tableId);
    if (set.size === 0 && !msg.host) client.isHost = true;
    set.add(clientId);

  // register with appropriate manager (poker if requested)
  const manager = (msg && msg.game === 'poker') ? pokerManager : gameManager;
  manager.addPlayer(tableId, { id: clientId, displayName: client.displayName, isHost: client.isHost });

  const snap = manager.snapshot(tableId) || { players: [], dealer: null, community: [], phase: 'waiting' };
    broadcastTableState(tableId, snap);
  }

  function removeClientFromTable(clientId, tableId){
    const set = tables.get(tableId);
    if (!set) return;
    set.delete(clientId);
    if (set.size === 0) tables.delete(tableId);

  // default remove from both managers to be safe
  try{ gameManager.removePlayer(tableId, clientId); }catch(e){}
  try{ pokerManager.removePlayer(tableId, clientId); }catch(e){}
  const snap = (pokerManager.snapshot(tableId) || gameManager.snapshot(tableId)) || { players: [], dealer: null, community: [], phase: 'waiting' };
    broadcastTableState(tableId, snap);
  }

  function handlePlayerAction(clientId, msg){
    const client = clients.get(clientId);
    if (!client || !client.tableId) return;
    const tableId = client.tableId;
    console.log('[WS] action', clientId, msg.action, 'table', tableId);
  const manager = (msg && msg.game === 'poker') ? pokerManager : gameManager;
  const snap = manager.handleAction(tableId, clientId, msg);
    broadcastTableState(tableId, snap);
  }

  function send(clientId, message){
    const client = clients.get(clientId);
    if (!client || !client.socket) return;
    try { client.socket.send(JSON.stringify(message)); } catch (e) { /* ignore */ }
  }

  function safeSend(socket, msg){ try { socket.send(JSON.stringify(msg)); } catch (e) { /* ignore */ } }

  function broadcastTableState(tableId, state){
    const set = tables.get(tableId);
    if (!set) return;
    const players = state && state.players ? state.players : [];
    const dealer = state && state.dealer ? state.dealer : null;
    const phase = state && state.phase ? state.phase : 'waiting';

    console.log('[WS] broadcast table', tableId, players.map(p => p.displayName + '(' + p.id + ')'));

    const payload = { type: 'TABLE_UPDATE', tableId, players, dealer, phase };
    set.forEach(cid => { send(cid, payload); });
  }
}
