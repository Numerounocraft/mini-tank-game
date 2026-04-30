export class RenderSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  clear() {
    const { ctx, canvas } = this;
    // grass checkerboard
    for (let r = 0; r < canvas.height; r += 40) {
      for (let c = 0; c < canvas.width; c += 40) {
        ctx.fillStyle = ((r + c) / 40) % 2 === 0 ? '#2d5a27' : '#2a5424';
        ctx.fillRect(c, r, 40, 40);
      }
    }
  }

  drawWall(wall) {
    const { ctx } = this;
    ctx.fillStyle = '#7a6548';
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    // bevel highlight
    ctx.fillStyle = '#9a855a';
    ctx.fillRect(wall.x, wall.y, wall.width, 3);
    ctx.fillRect(wall.x, wall.y, 3, wall.height);
    // bevel shadow
    ctx.fillStyle = '#5a4530';
    ctx.fillRect(wall.x, wall.y + wall.height - 3, wall.width, 3);
    ctx.fillRect(wall.x + wall.width - 3, wall.y, 3, wall.height);
  }

  drawTank(tank) {
    if (!tank.isAlive) return;
    const { ctx } = this;

    ctx.save();
    ctx.translate(tank.position.x, tank.position.y);
    ctx.rotate(tank.rotation);

    const hw = tank.width / 2;
    const hh = tank.height / 2;

    // tracks
    ctx.fillStyle = '#222';
    ctx.fillRect(-hw, -hh, 7, tank.height);
    ctx.fillRect(hw - 7, -hh, 7, tank.height);

    // track detail
    ctx.fillStyle = '#444';
    for (let i = -hh + 4; i < hh; i += 8) {
      ctx.fillRect(-hw, i, 7, 4);
      ctx.fillRect(hw - 7, i, 7, 4);
    }

    // body
    ctx.fillStyle = tank.color;
    ctx.fillRect(-hw + 7, -hh + 3, tank.width - 14, tank.height - 6);

    // barrel
    ctx.fillStyle = tank.isPlayer ? '#2a8a6a' : '#aa2222';
    ctx.fillRect(0, -3, hw + 6, 6);

    // turret
    ctx.fillStyle = tank.isPlayer ? '#1a7a5a' : '#991111';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    this._drawHealthBar(tank);
  }

  _drawHealthBar(tank) {
    const { ctx } = this;
    const bw = tank.width + 4;
    const bh = 4;
    const x = tank.position.x - bw / 2;
    const y = tank.position.y - tank.height / 2 - 10;
    const pct = tank.health / tank.maxHealth;

    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = pct > 0.5 ? '#2f2' : pct > 0.25 ? '#fa0' : '#f33';
    ctx.fillRect(x, y, bw * pct, bh);
  }

  drawBullet(bullet) {
    if (!bullet.isAlive) return;
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = bullet.isPlayerBullet ? '#ffe84a' : '#ff7722';
    ctx.shadowColor = bullet.isPlayerBullet ? '#ffe84a' : '#ff7722';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHUD(player, score, enemiesLeft, level) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(10, 10, 170, 86);
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('LEVEL',   20, 30);
    ctx.fillText('HP',      20, 48);
    ctx.fillText('SCORE',   20, 66);
    ctx.fillText('ENEMIES', 20, 84);
    ctx.fillStyle = '#ffe84a';
    ctx.fillText(`: ${level}`, 70, 30);
    ctx.fillStyle = '#fff';
    ctx.fillText(`: ${player.health} / ${player.maxHealth}`, 70, 48);
    ctx.fillText(`: ${score}`,        70, 66);
    ctx.fillText(`: ${enemiesLeft}`,  70, 84);
  }

  drawRechargeCountdown(secondsLeft, total) {
    const { ctx, canvas } = this;
    const cx    = canvas.width / 2;
    const progress = 1 - (secondsLeft / total); // 0 → 1 as timer counts down

    // Pulsing red screen edge vignette — intensity grows as HP was just lost
    const pulse = 0.08 + 0.07 * Math.sin(Date.now() / 200);
    ctx.fillStyle = `rgba(220, 30, 30, ${pulse})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bottom banner background
    const bannerY = canvas.height - 70;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(cx - 190, bannerY, 380, 58);

    // Warning label
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f55';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('! LOW HP — RECHARGING IN', cx, bannerY + 18);

    // Big countdown number
    ctx.fillStyle = '#fff';
    ctx.font = `bold 26px monospace`;
    ctx.fillText(`${Math.ceil(secondsLeft)}s`, cx, bannerY + 46);

    // Progress bar track
    const barX = cx - 160;
    const barW = 320;
    const barH = 6;
    const barY = bannerY + 52;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);

    // Filled portion — colour shifts red → yellow → green as it charges
    const hue = progress * 120; // 0° red → 120° green
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(barX, barY, barW * progress, barH);

    ctx.textAlign = 'left';
  }

  drawStartScreen() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 52px monospace';
    ctx.fillText('MINI TANK BATTLE', cx, cy - 80);

    ctx.fillStyle = '#ccc';
    ctx.font = '18px monospace';
    ctx.fillText('↑ ↓ ← →  —  Move (tank auto-aims)', cx, cy - 20);
    ctx.fillText('R        —  Flip 180° (aim behind)', cx, cy + 12);
    ctx.fillText('SPACE    —  Fire', cx, cy + 44);

    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('Press ENTER to Start', cx, cy + 94);
    ctx.textAlign = 'left';
  }

  drawLevelComplete(clearedLevel, score, nextLevel) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 52px monospace';
    ctx.fillText(`LEVEL ${clearedLevel} CLEAR!`, cx, cy - 50);

    ctx.fillStyle = '#2ef';
    ctx.font = '20px monospace';
    ctx.fillText('+1 HP restored', cx, cy + 4);

    ctx.fillStyle = '#fff';
    ctx.font = '22px monospace';
    ctx.fillText(`Score: ${score}`, cx, cy + 36);

    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`Press ENTER for Level ${nextLevel}`, cx, cy + 82);
    ctx.textAlign = 'left';
  }

  drawVictory(score) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#2ef';
    ctx.font = 'bold 56px monospace';
    ctx.fillText('YOU WIN!', cx, cy - 50);

    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.fillText('All levels cleared!', cx, cy + 4);
    ctx.fillText(`Final score: ${score}`, cx, cy + 36);

    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Press ENTER to play again', cx, cy + 82);
    ctx.textAlign = 'left';
  }

  drawGameOver(win, score) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 56px monospace';
    ctx.fillStyle = win ? '#2ef' : '#f44';
    ctx.fillText(win ? 'VICTORY!' : 'GAME OVER', cx, cy - 40);

    ctx.fillStyle = '#fff';
    ctx.font = '26px monospace';
    ctx.fillText(`Score: ${score}`, cx, cy + 14);

    ctx.fillStyle = '#ffe84a';
    ctx.font = '20px monospace';
    ctx.fillText('Press ENTER to Restart', cx, cy + 62);
    ctx.textAlign = 'left';
  }
}
