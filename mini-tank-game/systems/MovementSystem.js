import { Vector2 } from '../utils/Vector2.js';

export class MovementSystem {
  // Player: arrow key instantly snaps the tank to face that direction and move.
  // No lag between facing and shooting — barrel always matches movement.
  updatePlayer(tank, dt, up, down, left, right) {
    if (!tank.isAlive) return;

    let vx = 0, vy = 0;
    if (up)    vy -= 1;
    if (down)  vy += 1;
    if (left)  vx -= 1;
    if (right) vx += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len; vy /= len;

      tank.velocity = new Vector2(vx * tank.speed, vy * tank.speed);
      tank.rotation = Math.atan2(vy, vx); // instant — no mismatch between barrel and movement
    }
  }

  // AI keeps classic relative-forward movement
  update(tank, dt, moveForward, moveBackward, rotateLeft, rotateRight) {
    if (!tank.isAlive) return;
    if (rotateLeft)  tank.rotation -= tank.rotationSpeed * dt;
    if (rotateRight) tank.rotation += tank.rotationSpeed * dt;
    const dir = Vector2.fromAngle(tank.rotation);
    if (moveForward)  tank.velocity = dir.scale(tank.speed);
    if (moveBackward) tank.velocity = dir.scale(-tank.speed * 0.6);
  }
}
