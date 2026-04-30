import { Tank }            from './entities/Tank.js';
import { Bullet }          from './entities/Bullet.js';
import { Wall }            from './entities/Wall.js';
import { InputSystem }     from './systems/InputSystem.js';
import { MovementSystem }  from './systems/MovementSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { AISystem }        from './systems/AISystem.js';
import { RenderSystem }    from './systems/RenderSystem.js';

const CANVAS_W = 800;
const CANVAS_H = 600;
const TILE     = 40;

// 20 cols × 15 rows = 800×600. 1 = wall, 0 = open floor.
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

// Each level defines how many enemies to spawn (uses first N of ENEMY_SPAWNS)
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

    this.recharging     = false;
    this.rechargeTimer  = 0;
    this.RECHARGE_SECS  = 10;

    this.walls   = [];
    this.player  = null;
    this.enemies = [];
    this.bullets = [];

    this._onEnter = (e) => {
      if (e.code !== 'Enter') return;
      if (this.state === 'start' || this.state === 'gameover' || this.state === 'victory') {
        this.startGame();
      } else if (this.state === 'levelcomplete') {
        this._nextLevel();
      }
    };
    window.addEventListener('keydown', this._onEnter);

    requestAnimationFrame(this._loop.bind(this));
  }

  startGame() {
    this.score        = 0;
    this.currentLevel = 0;
    this.player       = new Tank({ x: 80, y: 80, rotation: 0, isPlayer: true, color: '#3aaa88' });
    this._loadLevel();
  }

  _loadLevel() {
    const cfg = LEVELS[this.currentLevel];
    this.walls          = buildWalls(MAP, TILE);
    this.bullets        = [];
    this.ai             = new AISystem();
    this.recharging     = false;
    this.rechargeTimer  = 0;
    this.enemies = ENEMY_SPAWNS.slice(0, cfg.enemyCount).map(s =>
      new Tank({ ...s, isPlayer: false, color: '#cc3333' })
    );
    this.state = 'playing';
  }

  _nextLevel() {
    this.currentLevel++;
    // Reset player to start position; reward 1 HP for clearing the level
    this.player.position.x = 80;
    this.player.position.y = 80;
    this.player.rotation   = 0;
    this.player.health     = Math.min(this.player.maxHealth, this.player.health + 1);
    this._loadLevel();
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
    // keep inside map bounds
    const hw = tank.width / 2;
    const hh = tank.height / 2;
    tank.position.x = Math.max(hw, Math.min(CANVAS_W - hw, tank.position.x));
    tank.position.y = Math.max(hh, Math.min(CANVAS_H - hh, tank.position.y));
    // resolve wall collisions
    this.walls.forEach(w => {
      if (this.collision.checkAABB(tank.bounds, w)) {
        this.collision.resolveTankWall(tank, w);
      }
    });
  }

  update(dt) {
    if (this.state !== 'playing') return;

    const { input, movement, ai, player } = this;

    // --- Player ---
    movement.updatePlayer(
      player, dt,
      input.isDown('ArrowUp'),
      input.isDown('ArrowDown'),
      input.isDown('ArrowLeft'),
      input.isDown('ArrowRight')
    );
    // R = quick 180° flip (aim behind you)
    if (input.isPressed('KeyR')) player.rotation += Math.PI;
    if (input.isDown('Space')) this._spawnBullet(player);
    this._updateTank(player, dt);

    // --- Enemies ---
    this.enemies.forEach(enemy => {
      if (!enemy.isAlive) return;
      const shouldFire = ai.update(enemy, player, dt, movement);
      this._updateTank(enemy, dt);
      if (shouldFire) this._spawnBullet(enemy);
    });

    // --- Bullets ---
    this.bullets.forEach(b => b.update(dt));

    // Bullet vs walls
    this.bullets.forEach(b => {
      if (!b.isAlive) return;
      this.walls.forEach(w => {
        if (this.collision.checkCircleAABB(b.position.x, b.position.y, b.radius, w)) {
          b.isAlive = false;
        }
      });
    });

    // Bullet vs tanks
    this.bullets.forEach(b => {
      if (!b.isAlive) return;
      if (b.isPlayerBullet) {
        this.enemies.forEach(e => {
          if (!e.isAlive) return;
          if (this.collision.checkCircleAABB(b.position.x, b.position.y, b.radius, e.bounds)) {
            e.takeDamage(b.damage);
            b.isAlive = false;
            if (!e.isAlive) this.score += 100;
          }
        });
      } else {
        if (!player.isAlive) return;
        if (this.collision.checkCircleAABB(b.position.x, b.position.y, b.radius, player.bounds)) {
          player.takeDamage(b.damage);
          b.isAlive = false;
        }
      }
    });

    this.bullets = this.bullets.filter(b => b.isAlive);

    // Level 2: countdown recharge when player HP is critical
    if (this.currentLevel === 1 && player.isAlive) {
      if (!this.recharging && player.health === 1) {
        this.recharging    = true;
        this.rechargeTimer = this.RECHARGE_SECS;
      }
      if (this.recharging) {
        this.rechargeTimer -= dt;
        if (this.rechargeTimer <= 0) {
          player.health    = player.maxHealth;
          this.recharging  = false;
          this.rechargeTimer = 0;
        }
      }
    }

    // Win / Lose check
    if (!player.isAlive) {
      this.state = 'gameover';
    } else if (this.enemies.every(e => !e.isAlive)) {
      this.state = this.currentLevel < LEVELS.length - 1 ? 'levelcomplete' : 'victory';
    }

    this.input.flush();
  }

  renderFrame() {
    const r = this.renderer;
    r.clear();

    if (this.state === 'start') {
      r.drawStartScreen();
      return;
    }

    this.walls.forEach(w   => r.drawWall(w));
    this.bullets.forEach(b => r.drawBullet(b));
    this.enemies.forEach(e => r.drawTank(e));
    r.drawTank(this.player);

    const aliveEnemies = this.enemies.filter(e => e.isAlive).length;
    r.drawHUD(this.player, this.score, aliveEnemies, this.currentLevel + 1);

    if (this.recharging) {
      r.drawRechargeCountdown(this.rechargeTimer, this.RECHARGE_SECS);
    }

    if (this.state === 'levelcomplete') {
      r.drawLevelComplete(this.currentLevel + 1, this.score, this.currentLevel + 2);
    } else if (this.state === 'victory') {
      r.drawVictory(this.score);
    } else if (this.state === 'gameover') {
      r.drawGameOver(false, this.score);
    }
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
