export class CollisionSystem {
  checkAABB(a, b) {
    return (
      a.x < b.x + b.width  &&
      a.x + a.width  > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  checkCircleAABB(cx, cy, r, rect) {
    const nearX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
    const nearY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
    const dx = cx - nearX;
    const dy = cy - nearY;
    return dx * dx + dy * dy < r * r;
  }

  resolveTankWall(tank, wall) {
    const b = tank.bounds;
    if (!this.checkAABB(b, wall)) return;

    const overlapLeft   = (b.x + b.width)        - wall.x;
    const overlapRight  = (wall.x + wall.width)   - b.x;
    const overlapTop    = (b.y + b.height)        - wall.y;
    const overlapBottom = (wall.y + wall.height)  - b.y;

    const minX = Math.min(overlapLeft, overlapRight);
    const minY = Math.min(overlapTop, overlapBottom);

    if (minX < minY) {
      tank.position.x += overlapLeft < overlapRight ? -overlapLeft : overlapRight;
    } else {
      tank.position.y += overlapTop  < overlapBottom ? -overlapTop : overlapBottom;
    }
  }
}
