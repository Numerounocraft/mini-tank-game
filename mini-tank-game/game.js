import { Tank }            from './entities/Tank.js';
import { Bullet }          from './entities/Bullet.js';
import { Wall }            from './entities/Wall.js';
import { InputSystem }     from './systems/InputSystem.js';
import { MovementSystem }  from './systems/MovementSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { AISystem }        from './systems/AISystem.js';
import { RenderSystem }    from './systems/RenderSystem.js';
import { NetworkSystem }   from './systems/NetworkSystem.js';

const CANVAS_W = 800;
const CANVAS_H = 600;
const TILE     = 40;

const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

function buildWalls(map, tileSize) {
  const walls = [];
  map.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === 1) walls.push(new Wall(c * tileSize, r * tileSize, tileSize, tileSize));
    });
  });
  return walls;
}

const LEVELS = [
  { enemyCount: 2 },
  { enemyCount: 3 },
];

const ENEMY_SPAWNS = [
  { x: 660, y: 80,  rotation: Math.PI },
  { x: 660, y: 520, rotation: -Math.PI / 2 },
  { x: 400, y: 60,  rotation: Math.PI / 2 },
  { x: 120, y: 520, rotation: -Math.PI / 4 },
];

// States:
//   start | online_menu | hosting | joining | connecting
//   playing | paused | levelcomplete | victory | gameover | nameentry

class Game {
  constructor(canvas) {
    this.canvas  = canvas;
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    this.input     = new InputSystem();
    this.movement  = new MovementSystem();
    this.collision = new CollisionSystem();
    this.renderer  = new RenderSystem(canvas);

    this.state        = 'start';
    this.score        = 0;
    this.currentLevel = 0;
    this.lastTime     = 0;
    this.ai           = new AISystem();

    // Game mode: 'single' | 'multi' | 'online'
    this.gameMode = 'single';
    this.player2  = null;

    // Online networking
    this.network      = null;
    this.roomCode     = '';
    this.codeInput    = '';
    this.networkError = '';
    this.lastSnapshot = null; // guest renders from this

    // Scoreboard
    this.nameInput    = '';
    this.pendingScore = 0;
    this.scores       = this._loadScores();

    // Recharge mechanic
    this.recharging    = false;
    this.rechargeTimer = 0;
    this.RECHARGE_SECS = 10;

    // Map walls never change; build once so the guest always has them
    this.walls   = buildWalls(MAP, TILE);
    this.player  = null;
    this.enemies = [];
    this.bullets = [];

    this._onKeyboard = (e) => {
      // ── Name entry ──────────────────────────────────────────────────────────
      if (this.state === 'nameentry') {
        if (e.code === 'Enter') {
          this._saveScore();
          this.state = 'start';
        } else if (e.code === 'Backspace') {
          this.nameInput = this.nameInput.slice(0, -1);
          e.preventDefault();
        } else if (e.key.length === 1 && this.nameInput.length < 12) {
          this.nameInput += e.key;
        }
        return;
      }

      // ── Online: room code entry ─────────────────────────────────────────────
      if (this.state === 'joining') {
        if (e.code === 'Enter') {
          if (this.codeInput.length === 4) this._joinRoom(this.codeInput);
        } else if (e.code === 'Backspace') {
          this.codeInput = this.codeInput.slice(0, -1);
          e.preventDefault();
        } else if (e.key.length === 1 && this.codeInput.length < 4) {
          this.codeInput += e.key.toUpperCase();
        } else if (e.code === 'Escape') {
          this.state = 'online_menu';
          this.networkError = '';
        }
        return;
      }

      // ── Online menu: H = host, J = join ────────────────────────────────────
      if (this.state === 'online_menu') {
        if (e.code === 'KeyH') { this._hostGame(); }
        if (e.code === 'KeyJ') {
          this.codeInput    = '';
          this.networkError = '';
          this.state        = 'joining';
        }
        if (e.code === 'Escape') { this.state = 'start'; this.networkError = ''; }
        return;
      }

      // ── Hosting: ESC cancels ────────────────────────────────────────────────
      if (this.state === 'hosting') {
        if (e.code === 'Escape') {
          this.network?.disconnect();
          this.network = null;
          this.roomCode = '';
          this.state = 'online_menu';
        }
        return;
      }

      // ── Pause toggle ────────────────────────────────────────────────────────
      if (this.state === 'playing' || this.state === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          if (!this.network?.isGuest) { // only host/solo controls pause
            this.state = this.state === 'playing' ? 'paused' : 'playing';
          }
          e.preventDefault();
          return;
        }
      }

      // ── Mode select on start screen ─────────────────────────────────────────
      if (this.state === 'start') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') this.gameMode = 'single';
        if (e.code === 'Digit2' || e.code === 'Numpad2') this.gameMode = 'multi';
        if (e.code === 'Digit3' || e.code === 'Numpad3') this.gameMode = 'online';
      }

      if (e.code !== 'Enter') return;

      if (this.state === 'start') {
        if (this.gameMode === 'online') {
          this.networkError = '';
          this.state = 'online_menu';
        } else {
          this.startGame();
        }
      } else if (this.state === 'levelcomplete' && !this.network?.isGuest) {
        this._nextLevel();
      } else if (this.state === 'gameover' || this.state === 'victory') {
        this.nameInput    = '';
        this.pendingScore = this.score;
        this.state        = 'nameentry';
      }
    };

    window.addEventListener('keydown', this._onKeyboard);
    requestAnimationFrame(this._loop.bind(this));
  }

  // ── Scoreboard ──────────────────────────────────────────────────────────────

  _loadScores() {
    try { return JSON.parse(localStorage.getItem('miniTankScores') || '[]'); }
    catch { return []; }
  }

  _saveScore() {
    const name = this.nameInput.trim() || 'Anonymous';
    const mode = this.gameMode === 'multi' ? '2P' : this.gameMode === 'online' ? 'NET' : '1P';
    this.scores.push({ name, score: this.pendingScore, mode });
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 10);
    localStorage.setItem('miniTankScores', JSON.stringify(this.scores));
  }

  // ── Online networking ───────────────────────────────────────────────────────

  async _hostGame() {
    this.state        = 'hosting';
    this.roomCode     = '';
    this.networkError = '';
    this.network      = new NetworkSystem();
    this.network.onEvent = (msg) => this._handleNetworkEvent(msg);
    try {
      await this.network.connect(`ws://${window.location.host}`);
      this.network.createRoom();
    } catch {
      this.networkError = 'Cannot connect to server';
      this.state = 'online_menu';
      this.network = null;
    }
  }

  async _joinRoom(code) {
    this.state        = 'connecting';
    this.networkError = '';
    this.network      = new NetworkSystem();
    this.network.onEvent = (msg) => this._handleNetworkEvent(msg);
    try {
      await this.network.connect(`ws://${window.location.host}`);
      this.network.joinRoom(code);
    } catch {
      this.networkError = 'Cannot connect to server';
      this.state = 'joining';
      this.network = null;
    }
  }

  _handleNetworkEvent(msg) {
    switch (msg.type) {
      case 'room_created':
        this.roomCode = msg.code;
        // state stays 'hosting'; UI shows the code
        break;

      case 'guest_joined':
        // Host: both connected — start the game
        this.startGame();
        break;

      case 'joined':
        // Guest: successfully joined; waiting for host to start the game
        // state stays 'connecting' until first snapshot arrives
        break;

      case 'game_state':
        if (this.network?.isGuest) this._applySnapshot(msg.snapshot);
        break;

      case 'error':
        this.networkError = msg.message;
        this.state = 'joining';
        this.network?.disconnect();
        this.network = null;
        break;

      case 'peer_disconnected':
        this.network?.disconnect();
        this.network = null;
        this.networkError = 'Opponent disconnected';
        this.state = 'start';
        break;
    }
  }

  // Guest: store latest snapshot and sync visible state.
  _applySnapshot(snap) {
    if (!snap) return;

    // Build walls on first snapshot (guest never calls _loadLevel)
    if (this.state === 'connecting') {
      this.walls = buildWalls(MAP, TILE);
    }

    this.lastSnapshot = snap;
    this.score        = snap.score;

    // Keep this.state in sync so keyboard handler works correctly
    if (['gameover', 'victory', 'levelcomplete', 'paused', 'playing'].includes(snap.gameState)) {
      this.state = snap.gameState;
    }
  }

  // Host: serialise full game state and push to guest.
  _sendNetworkSnapshot() {
    if (!this.network?.isHost) return;
    const snap = {
      p1: this._serializeTank(this.player),
      p2: this.player2 ? this._serializeTank(this.player2) : null,
      enemies:   this.enemies.map(e => this._serializeTank(e)),
      bullets:   this.bullets.map(b => ({
        x: b.position.x, y: b.position.y, isPlayerBullet: b.isPlayerBullet,
      })),
      score:       this.score,
      level:       this.currentLevel + 1,
      enemiesLeft: this.enemies.filter(e => e.isAlive).length,
      gameState:   this.state,
      recharging:  this.recharging,
      rechargeTimer: this.rechargeTimer,
      rechargeSecs:  this.RECHARGE_SECS,
    };
    this.network.sendState(snap);
  }

  _serializeTank(t) {
    return {
      x: t.position.x, y: t.position.y, rotation: t.rotation,
      health: t.health, maxHealth: t.maxHealth,
      isAlive: t.isAlive, color: t.color, isPlayer: t.isPlayer,
    };
  }

  // ── Game lifecycle ──────────────────────────────────────────────────────────

  startGame() {
    this.score        = 0;
    this.currentLevel = 0;
    this.lastSnapshot = null;
    this.player = new Tank({ x: 80, y: 80, rotation: 0, isPlayer: true, color: '#3aaa88' });
    const needsP2 = this.gameMode === 'multi' || this.gameMode === 'online';
    this.player2 = needsP2
      ? new Tank({ x: 720, y: 520, rotation: Math.PI, isPlayer: true, color: '#4488ff' })
      : null;
    this._loadLevel();
  }

  _loadLevel() {
    const cfg = LEVELS[this.currentLevel];
    this.walls         = buildWalls(MAP, TILE);
    this.bullets       = [];
    this.ai            = new AISystem();
    this.recharging    = false;
    this.rechargeTimer = 0;
    this.enemies = ENEMY_SPAWNS.slice(0, cfg.enemyCount).map(s =>
      new Tank({ ...s, isPlayer: false, color: '#cc3333' })
    );
    this.state = 'playing';
    this.input.flush();
  }

  _nextLevel() {
    this.currentLevel++;
    this._reviveAndReposition(this.player, 80, 80, 0);
    if (this.player2) this._reviveAndReposition(this.player2, 720, 520, Math.PI);
    this._loadLevel();
  }

  _reviveAndReposition(tank, x, y, rotation) {
    if (!tank.isAlive) { tank.isAlive = true; tank.health = 1; }
    tank.position.x = x;
    tank.position.y = y;
    tank.rotation   = rotation;
    tank.health     = Math.min(tank.maxHealth, tank.health + 1);
  }

  _spawnBullet(tank) {
    if (!tank.canFire()) return;
    tank.fireCooldown = tank.fireRate;
    const offset = tank.width / 2 + 8;
    this.bullets.push(new Bullet({
      x: tank.position.x + Math.cos(tank.rotation) * offset,
      y: tank.position.y + Math.sin(tank.rotation) * offset,
      angle: tank.rotation,
      ownerId: tank.id,
      isPlayerBullet: tank.isPlayer,
    }));
  }

  _updateTank(tank, dt) {
    tank.update(dt);
    const hw = tank.width / 2, hh = tank.height / 2;
    tank.position.x = Math.max(hw, Math.min(CANVAS_W - hw, tank.position.x));
    tank.position.y = Math.max(hh, Math.min(CANVAS_H - hh, tank.position.y));
    this.walls.forEach(w => {
      if (this.collision.checkAABB(tank.bounds, w)) this.collision.resolveTankWall(tank, w);
    });
  }

  _getTargetPlayer(enemy) {
    const alive = [this.player, this.player2].filter(p => p?.isAlive);
    if (!alive.length) return null;
    if (alive.length === 1) return alive[0];
    const ex = enemy.position.x, ey = enemy.position.y;
    return alive.reduce((best, p) => {
      const d1 = (p.position.x - ex) ** 2 + (p.position.y - ey) ** 2;
      const d2 = (best.position.x - ex) ** 2 + (best.position.y - ey) ** 2;
      return d1 < d2 ? p : best;
    });
  }

  // ── Game loop ───────────────────────────────────────────────────────────────

  update(dt) {
    if (this.state !== 'playing') {
      if (this.state === 'paused') this.input.flush();
      return;
    }

    // Online guest: just relay local input, skip simulation entirely
    if (this.network?.isGuest) {
      this.network.sendInput({
        up:    this.input.isDown('ArrowUp'),
        down:  this.input.isDown('ArrowDown'),
        left:  this.input.isDown('ArrowLeft'),
        right: this.input.isDown('ArrowRight'),
        fire:  this.input.isDown('Space'),
        flip:  this.input.isPressed('KeyR'),
      });
      this.input.flush();
      return;
    }

    const { input, movement, ai, player } = this;

    // --- Player 1 (Arrow keys + Space) ---
    movement.updatePlayer(player, dt,
      input.isDown('ArrowUp'), input.isDown('ArrowDown'),
      input.isDown('ArrowLeft'), input.isDown('ArrowRight'));
    if (input.isPressed('KeyR')) player.rotation += Math.PI;
    if (input.isDown('Space'))   this._spawnBullet(player);
    if (player.isAlive)          this._updateTank(player, dt);

    // --- Player 2 ---
    if (this.player2) {
      if (this.network?.isHost) {
        // Online host: P2 is driven by the guest's relayed input
        const gi = this.network.pollGuestInput();
        if (gi) {
          movement.updatePlayer(this.player2, dt, gi.up, gi.down, gi.left, gi.right);
          if (gi.fire) this._spawnBullet(this.player2);
          if (gi.flip) this.player2.rotation += Math.PI;
        }
      } else {
        // Local co-op: P2 uses WASD + F
        movement.updatePlayer(this.player2, dt,
          input.isDown('KeyW'), input.isDown('KeyS'),
          input.isDown('KeyA'), input.isDown('KeyD'));
        if (input.isDown('KeyF')) this._spawnBullet(this.player2);
      }
      if (this.player2.isAlive) this._updateTank(this.player2, dt);
    }

    // --- Enemies ---
    this.enemies.forEach(enemy => {
      if (!enemy.isAlive) return;
      const target = this._getTargetPlayer(enemy);
      if (!target) return;
      const shouldFire = ai.update(enemy, target, dt, movement);
      this._updateTank(enemy, dt);
      if (shouldFire) this._spawnBullet(enemy);
    });

    // --- Bullets ---
    this.bullets.forEach(b => b.update(dt));

    this.bullets.forEach(b => {
      if (!b.isAlive) return;
      this.walls.forEach(w => {
        if (this.collision.checkCircleAABB(b.position.x, b.position.y, b.radius, w))
          b.isAlive = false;
      });
    });

    const allPlayers = [player, this.player2].filter(Boolean);
    this.bullets.forEach(b => {
      if (!b.isAlive) return;
      if (b.isPlayerBullet) {
        this.enemies.forEach(e => {
          if (!e.isAlive || !b.isAlive) return;
          if (this.collision.checkCircleAABB(b.position.x, b.position.y, b.radius, e.bounds)) {
            e.takeDamage(b.damage);
            b.isAlive = false;
            if (!e.isAlive) this.score += 100;
          }
        });
      } else {
        allPlayers.forEach(p => {
          if (!b.isAlive || !p.isAlive) return;
          if (this.collision.checkCircleAABB(b.position.x, b.position.y, b.radius, p.bounds)) {
            p.takeDamage(b.damage);
            b.isAlive = false;
          }
        });
      }
    });

    this.bullets = this.bullets.filter(b => b.isAlive);

    // Level 2 recharge
    if (this.currentLevel === 1) {
      allPlayers.forEach(p => {
        if (p.isAlive && !this.recharging && p.health === 1) {
          this.recharging = true; this.rechargeTimer = this.RECHARGE_SECS;
        }
      });
      if (this.recharging) {
        this.rechargeTimer -= dt;
        if (this.rechargeTimer <= 0) {
          allPlayers.forEach(p => { if (p.isAlive) p.health = p.maxHealth; });
          this.recharging = false; this.rechargeTimer = 0;
        }
      }
    }

    // Win / lose
    if (!allPlayers.some(p => p.isAlive)) {
      this.state = 'gameover';
    } else if (this.enemies.every(e => !e.isAlive)) {
      this.state = this.currentLevel < LEVELS.length - 1 ? 'levelcomplete' : 'victory';
    }

    // Online host: push state to guest every tick
    if (this.network?.isHost) this._sendNetworkSnapshot();

    this.input.flush();
  }

  renderFrame() {
    const r = this.renderer;
    r.clear();

    // ── Menu / lobby screens ────────────────────────────────────────────────
    if (this.state === 'start') {
      r.drawStartScreen(this.gameMode, this.scores);
      return;
    }
    if (this.state === 'nameentry') {
      r.drawNameEntry(this.nameInput, this.pendingScore, this.scores);
      return;
    }
    if (this.state === 'online_menu') {
      r.drawOnlineMenu(this.networkError);
      return;
    }
    if (this.state === 'hosting') {
      r.drawHostingScreen(this.roomCode);
      return;
    }
    if (this.state === 'joining') {
      r.drawJoiningScreen(this.codeInput, this.networkError);
      return;
    }
    if (this.state === 'connecting') {
      r.drawConnectingScreen();
      return;
    }

    // ── Online guest: render from host's snapshot ───────────────────────────
    if (this.network?.isGuest) {
      if (this.lastSnapshot) this._renderGuestFrame(this.lastSnapshot);
      else                   r.drawConnectingScreen();
      return;
    }

    // ── Normal render (solo / local co-op / online host) ────────────────────
    this.walls.forEach(w   => r.drawWall(w));
    this.bullets.forEach(b => r.drawBullet(b));
    this.enemies.forEach(e => r.drawTank(e));
    r.drawTank(this.player);
    if (this.player2) r.drawTank(this.player2);

    const aliveEnemies = this.enemies.filter(e => e.isAlive).length;
    r.drawHUD(this.player, this.score, aliveEnemies, this.currentLevel + 1);
    if (this.player2) r.drawHUD2(this.player2);
    if (this.recharging) r.drawRechargeCountdown(this.rechargeTimer, this.RECHARGE_SECS);

    if      (this.state === 'paused')        r.drawPaused();
    else if (this.state === 'levelcomplete') r.drawLevelComplete(this.currentLevel + 1, this.score, this.currentLevel + 2);
    else if (this.state === 'victory')       r.drawVictory(this.score);
    else if (this.state === 'gameover')      r.drawGameOver(false, this.score);
  }

  // Build lightweight render proxies from a snapshot object.
  _tankProxy(t) {
    return {
      isAlive: t.isAlive, position: { x: t.x, y: t.y },
      rotation: t.rotation, width: 32, height: 32,
      color: t.color, isPlayer: t.isPlayer ?? true,
      health: t.health, maxHealth: t.maxHealth,
    };
  }

  _renderGuestFrame(snap) {
    const r = this.renderer;
    this.walls.forEach(w => r.drawWall(w));

    snap.bullets.forEach(b => r.drawBullet({
      isAlive: true, position: { x: b.x, y: b.y },
      radius: 4, isPlayerBullet: b.isPlayerBullet,
    }));

    snap.enemies.forEach(e => r.drawTank(this._tankProxy({ ...e, isPlayer: false })));

    const p1 = this._tankProxy(snap.p1);
    r.drawTank(p1);

    if (snap.p2) {
      const p2 = this._tankProxy(snap.p2);
      r.drawTank(p2);
      r.drawHUD(p1, snap.score, snap.enemiesLeft, snap.level);
      r.drawHUD2(p2);
    } else {
      r.drawHUD(p1, snap.score, snap.enemiesLeft, snap.level);
    }

    if (snap.recharging) r.drawRechargeCountdown(snap.rechargeTimer, snap.rechargeSecs);

    if      (snap.gameState === 'paused')        r.drawPaused();
    else if (snap.gameState === 'levelcomplete') r.drawLevelComplete(snap.level, snap.score, snap.level + 1);
    else if (snap.gameState === 'victory')       r.drawVictory(snap.score);
    else if (snap.gameState === 'gameover')      r.drawGameOver(false, snap.score);
  }

  _loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.update(dt);
    this.renderFrame();
    requestAnimationFrame(this._loop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  new Game(canvas);
});
