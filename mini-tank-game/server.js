const http      = require('http');
const fs        = require('fs');
const path      = require('path');
const WebSocket = require('ws');

const PORT   = 8080;
const STATIC = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.ico':  'image/x-icon',
};

// ── Static file server ────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const safe     = path.normalize(req.url.split('?')[0]);
  const filePath = path.join(STATIC, safe === '/' ? 'index.html' : safe);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
});

// ── WebSocket relay ───────────────────────────────────────────────────────────
const wss   = new WebSocket.Server({ server });
const rooms = new Map(); // code → { host: WebSocket, guest: WebSocket|null }

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? genCode() : code; // retry on collision
}

wss.on('connection', ws => {
  ws.roomCode = null;
  ws.role     = null;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'create_room') {
      const code = genCode();
      rooms.set(code, { host: ws, guest: null });
      ws.roomCode = code;
      ws.role     = 'host';
      ws.send(JSON.stringify({ type: 'room_created', code }));
      console.log(`[${code}] Room created`);
    }

    else if (msg.type === 'join_room') {
      const code = (msg.code || '').toUpperCase().trim();
      const room = rooms.get(code);

      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }
      if (room.guest) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
      }

      room.guest  = ws;
      ws.roomCode = code;
      ws.role     = 'guest';
      ws.send(JSON.stringify({ type: 'joined', code }));
      room.host.send(JSON.stringify({ type: 'guest_joined' }));
      console.log(`[${code}] Guest joined`);
    }

    else {
      // Relay everything else (game_state, input, game_event) to the peer
      const room = rooms.get(ws.roomCode);
      if (!room) return;
      const peer = ws.role === 'host' ? room.guest : room.host;
      if (peer?.readyState === WebSocket.OPEN) peer.send(raw.toString());
    }
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const peer = ws.role === 'host' ? room.guest : room.host;
    if (peer?.readyState === WebSocket.OPEN) {
      peer.send(JSON.stringify({ type: 'peer_disconnected' }));
    }
    rooms.delete(ws.roomCode);
    console.log(`[${ws.roomCode}] Room closed`);
  });
});

server.listen(PORT, () => {
  console.log(`Mini Tank Battle  →  http://localhost:${PORT}`);
  console.log('WebSocket relay running on the same port');
});
