# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

The game uses native ES modules (`import`/`export`), so it must be served over HTTP — opening `index.html` directly as a file:// URL will fail with CORS errors.

```bash
cd mini-tank-game
python -m http.server 8080
# then open http://localhost:8080
```

There is no build step, bundler, linter, or test suite. All code runs directly in the browser as-is.

## Architecture

The game is a single `Game` class in `game.js` that owns all state and wires together five stateless systems. Systems receive data, mutate it, and return results — they hold no game state themselves (except `AISystem`, which keeps a per-enemy state `Map` keyed by `tank.id`).

**Data flow each frame:**

```
InputSystem.isDown/isPressed
  → MovementSystem.updatePlayer / .update   (sets tank.velocity, tank.rotation)
  → AISystem.update                          (returns shouldFire boolean)
  → tank.update(dt)                          (applies velocity, ticks cooldowns)
  → CollisionSystem                          (resolves tank↔wall, bullet↔wall, bullet↔tank)
  → RenderSystem                             (draws everything, then HUD overlays)
  → InputSystem.flush()                      (clears single-frame isPressed state)
```

**Movement split:** `MovementSystem` has two entry points — `updatePlayer()` for the human (arrow keys snap the tank's facing instantly to the movement direction) and `update()` for AI (classic relative forward/backward + rotation). Do not use `updatePlayer` for AI or vice versa.

**Collision pipeline:** Wall collision is AABB push-out (`resolveTankWall`). Bullet collision uses circle-vs-AABB (`checkCircleAABB`). Bullets are destroyed on any hit; tanks are not pushed by bullets.

## Level system

Levels are defined in the `LEVELS` array at the top of `game.js`:

```js
const LEVELS = [
  { enemyCount: 2 },
  { enemyCount: 3 },
];
```

Each level slices the first N entries from `ENEMY_SPAWNS`. To add a level, append an object to `LEVELS` and add a spawn entry to `ENEMY_SPAWNS` if more enemy positions are needed (currently 4 defined).

Level-specific mechanics are gated by `this.currentLevel` (0-indexed). The health recharge mechanic (`RECHARGE_SECS = 10`) is currently hardcoded to `currentLevel === 1`. If adding per-level mechanics, move them into the `LEVELS` config rather than hardcoding the index.

## Game states

`'start'` → `'playing'` → `'levelcomplete'` → `'playing'` → ... → `'victory'`  
Any state → `'gameover'` if player dies.

`renderFrame()` draws the game world for all non-`'start'` states, then layers the appropriate overlay on top. The `update()` method early-returns when not in `'playing'`.

## Map

The map is a 20×15 tile grid (800×600px, `TILE = 40`). `1` = wall, `0` = open floor. `buildWalls()` converts it to `Wall` objects each time a level loads. To change the map layout, edit the `MAP` array directly — no external format or parser is involved.

## Key conventions

- `tank.velocity` is set each frame and reset to `(0,0)` inside `tank.update(dt)`. Systems write velocity; `update()` consumes and clears it.
- `isAlive = false` is set by `takeDamage()` when HP reaches 0. Dead entities are skipped in loops but not removed from arrays until `_loadLevel()`.
- `InputSystem.isPressed()` fires only on the first frame of a keypress. Always call `input.flush()` at the end of `update()` to clear it.
- `EventBus` (`utils/EventBus.js`) exists but is not yet wired to anything — it's the intended hook point for sound and multiplayer events.
