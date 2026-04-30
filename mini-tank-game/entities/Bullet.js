import { Vector2 } from '../utils/Vector2.js';

export class Bullet {
  constructor({ x, y, angle, ownerId, isPlayerBullet }) {
    this.position = new Vector2(x, y);
    this.velocity = Vector2.fromAngle(angle).scale(320);
    this.ownerId = ownerId;
    this.isPlayerBullet = isPlayerBullet;
    this.radius = 4;
    this.damage = 1;
    this.lifetime = 2.5;
    this.isAlive = true;
  }

  update(dt) {
    this.position = this.position.add(this.velocity.scale(dt));
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.isAlive = false;
  }
}
