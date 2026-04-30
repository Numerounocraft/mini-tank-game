import { Vector2 } from '../utils/Vector2.js';

export class Tank {
  constructor({ x, y, rotation = 0, isPlayer = false, color = '#4a9' }) {
    this.position = new Vector2(x, y);
    this.rotation = rotation;
    this.speed = isPlayer ? 150 : 80;
    this.rotationSpeed = isPlayer ? 2.5 : 1.8;
    this.width = 32;
    this.height = 32;
    this.health = 3;
    this.maxHealth = 3;
    this.fireCooldown = 0;
    this.fireRate = isPlayer ? 0.45 : 1.4;
    this.isPlayer = isPlayer;
    this.color = color;
    this.isAlive = true;
    this.velocity = new Vector2(0, 0);
    this.id = Math.random().toString(36).substr(2, 9);
  }

  get bounds() {
    return {
      x: this.position.x - this.width / 2,
      y: this.position.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  canFire() {
    return this.fireCooldown <= 0 && this.isAlive;
  }

  takeDamage(amount = 1) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
    }
  }

  update(dt) {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    this.position = this.position.add(this.velocity.scale(dt));
    this.velocity = new Vector2(0, 0);
  }
}
