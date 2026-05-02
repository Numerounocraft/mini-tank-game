export class NetworkSystem {
  constructor() {
    this.ws          = null;
    this.role        = null;   // 'host' | 'guest'
    this.roomCode    = null;
    this.onEvent     = null;   // (msg) => void  — for non-input messages
    this._guestInput = null;   // latest buffered input from guest
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws  = ws;
      ws.onopen    = () => resolve();
      ws.onerror   = (e) => reject(e);
      ws.onmessage = ({ data }) => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }
        // Buffer guest inputs separately so the host can poll them each tick
        if (msg.type === 'input') {
          this._guestInput = msg;
        } else {
          this.onEvent?.(msg);
        }
      };
      ws.onclose = () => this.onEvent?.({ type: 'peer_disconnected' });
    });
  }

  send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  createRoom()    { this.role = 'host';  this.send({ type: 'create_room' }); }
  joinRoom(code)  { this.role = 'guest'; this.send({ type: 'join_room', code }); }

  sendInput(inp)  { this.send({ type: 'input', ...inp }); }
  sendState(snap) { this.send({ type: 'game_state', snapshot: snap }); }

  // Host calls this each tick to consume the latest guest input packet.
  pollGuestInput() {
    const inp = this._guestInput;
    this._guestInput = null;
    return inp;
  }

  get isHost()  { return this.role === 'host';  }
  get isGuest() { return this.role === 'guest'; }

  disconnect() { this.ws?.close(); this.ws = null; }
}
