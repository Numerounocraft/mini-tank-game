import { Vector2 } from '../utils/Vector2.js';

const STATE = { PATROL: 'patrol', CHASE: 'chase', AIM: 'aim' };
const DETECT_RANGE  = 260;
const SHOOT_RANGE   = 200;
const AIM_TOLERANCE = 0.18; // radians — how accurately aimed before firing
const PATROL_INTERVAL_MIN = 1.5;
const PATROL_INTERVAL_MAX = 3.0;

export class AISystem {
  constructor() {
    this.states = new Map();
  }

  _getState(tank) {
    if (!this.states.has(tank.id)) {
      this.states.set(tank.id, {
        phase: STATE.PATROL,
        patrolTimer: 0,
        patrolAngle: Math.random() * Math.PI * 2,
      });
    }
    return this.states.get(tank.id);
  }

  update(tank, player, dt, movement) {
    if (!tank.isAlive || !player.isAlive) return false;

    const s = this._getState(tank);
    const dist = tank.position.distanceTo(player.position);

    // State transitions
    if (dist < SHOOT_RANGE)  s.phase = STATE.AIM;
    else if (dist < DETECT_RANGE) s.phase = STATE.CHASE;
    else s.phase = STATE.PATROL;

    switch (s.phase) {
      case STATE.PATROL:
        return this._patrol(tank, s, dt, movement);
      case STATE.CHASE:
        return this._chase(tank, player, dt, movement);
      case STATE.AIM:
        return this._aim(tank, player, dt);
    }
    return false;
  }

  _patrol(tank, s, dt, movement) {
    s.patrolTimer -= dt;
    if (s.patrolTimer <= 0) {
      s.patrolAngle = Math.random() * Math.PI * 2;
      s.patrolTimer = PATROL_INTERVAL_MIN + Math.random() * (PATROL_INTERVAL_MAX - PATROL_INTERVAL_MIN);
    }
    this._rotateToward(tank, s.patrolAngle, dt);
    movement.update(tank, dt, true, false, false, false);
    return false;
  }

  _chase(tank, player, dt, movement) {
    const angle = Math.atan2(
      player.position.y - tank.position.y,
      player.position.x - tank.position.x
    );
    this._rotateToward(tank, angle, dt);
    movement.update(tank, dt, true, false, false, false);
    return false;
  }

  _aim(tank, player, dt) {
    const angle = Math.atan2(
      player.position.y - tank.position.y,
      player.position.x - tank.position.x
    );
    this._rotateToward(tank, angle, dt);
    return tank.canFire() && this._angularDiff(tank.rotation, angle) < AIM_TOLERANCE;
  }

  _rotateToward(tank, targetAngle, dt) {
    let diff = this._angularDiff(tank.rotation, targetAngle, true);
    const step = tank.rotationSpeed * dt;
    tank.rotation += Math.sign(diff) * Math.min(Math.abs(diff), step);
  }

  // Returns signed diff when signed=true, unsigned magnitude otherwise
  _angularDiff(from, to, signed = false) {
    let d = to - from;
    while (d >  Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return signed ? d : Math.abs(d);
  }
}
