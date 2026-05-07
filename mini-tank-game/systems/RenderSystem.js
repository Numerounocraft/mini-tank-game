export class RenderSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  clear() {
    const { ctx, canvas } = this;
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
    ctx.fillStyle = '#9a855a';
    ctx.fillRect(wall.x, wall.y, wall.width, 3);
    ctx.fillRect(wall.x, wall.y, 3, wall.height);
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
    ctx.fillStyle = tank.isPlayer ? tank.color : '#aa2222';
    ctx.fillRect(0, -3, hw + 6, 6);

    // turret
    ctx.fillStyle = tank.isPlayer ? tank.color : '#991111';
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

  // P2 HUD shown in top-right corner during multiplayer.
  drawHUD2(player) {
    const { ctx, canvas } = this;
    const x = canvas.width - 185;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, 10, 175, 50);

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#4488ff';
    ctx.fillText('P2', x + 10, 30);

    if (player.isAlive) {
      ctx.fillStyle = '#aaa';
      ctx.fillText('HP', x + 10, 48);
      ctx.fillStyle = '#fff';
      ctx.fillText(`: ${player.health} / ${player.maxHealth}`, x + 40, 48);
    } else {
      ctx.fillStyle = '#f44';
      ctx.fillText('ELIMINATED', x + 10, 48);
    }
  }

  drawRechargeCountdown(secondsLeft, total) {
    const { ctx, canvas } = this;
    const cx      = canvas.width / 2;
    const progress = 1 - (secondsLeft / total);

    const pulse = 0.08 + 0.07 * Math.sin(Date.now() / 200);
    ctx.fillStyle = `rgba(220, 30, 30, ${pulse})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bannerY = canvas.height - 70;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(cx - 190, bannerY, 380, 58);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f55';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('! LOW HP — RECHARGING IN', cx, bannerY + 18);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`${Math.ceil(secondsLeft)}s`, cx, bannerY + 46);

    const barX = cx - 160;
    const barW = 320;
    const barH = 6;
    const barY = bannerY + 52;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);

    const hue = progress * 120;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(barX, barY, barW * progress, barH);

    ctx.textAlign = 'left';
  }

  drawPaused() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 64px monospace';
    ctx.fillText('PAUSED', cx, cy - 10);

    ctx.fillStyle = '#ccc';
    ctx.font = '18px monospace';
    ctx.fillText('Press P or ESC to resume', cx, cy + 40);

    ctx.textAlign = 'left';
  }

  // ── 2-player sub-menu ──────────────────────────────────────────────────────

  drawMultiMenu() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 38px monospace';
    ctx.fillText('2 PLAYER MODE', cx, cy - 120);

    ctx.fillStyle = '#444';
    ctx.fillRect(cx - 200, cy - 98, 400, 1);

    const btnW = 300, btnH = 60;

    // AI companion button
    ctx.fillStyle = '#2a5a3a';
    ctx.fillRect(cx - btnW / 2, cy - 80, btnW, btnH);
    ctx.strokeStyle = '#3aaa88';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - btnW / 2, cy - 80, btnW, btnH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('A  —  AI Companion', cx, cy - 47);
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('Computer controls P2  (fights for you)', cx, cy - 28);

    // Online with friend button
    ctx.fillStyle = '#2a3a6a';
    ctx.fillRect(cx - btnW / 2, cy + 4, btnW, btnH);
    ctx.strokeStyle = '#4488ff';
    ctx.strokeRect(cx - btnW / 2, cy + 4, btnW, btnH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('O  —  Play with a Friend', cx, cy + 37);
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('Each player on their own computer', cx, cy + 56);

    ctx.fillStyle = '#555';
    ctx.font = '13px monospace';
    ctx.fillText('ESC — Back', cx, cy + 102);

    ctx.textAlign = 'left';
  }

  // ── Online lobby screens ────────────────────────────────────────────────────

  drawOnlineMenu(networkError) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 38px monospace';
    ctx.fillText('ONLINE MULTIPLAYER', cx, cy - 110);

    ctx.fillStyle = '#444';
    ctx.fillRect(cx - 200, cy - 88, 400, 1);

    const btnW = 280, btnH = 48;

    // Host button
    ctx.fillStyle = '#2a6a40';
    ctx.fillRect(cx - btnW / 2, cy - 70, btnW, btnH);
    ctx.strokeStyle = '#4ef';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - btnW / 2, cy - 70, btnW, btnH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('H  —  Host a Game', cx, cy - 40);

    // Join button
    ctx.fillStyle = '#2a3a6a';
    ctx.fillRect(cx - btnW / 2, cy - 8, btnW, btnH);
    ctx.strokeStyle = '#88f';
    ctx.strokeRect(cx - btnW / 2, cy - 8, btnW, btnH);
    ctx.fillStyle = '#fff';
    ctx.fillText('J  —  Join a Game', cx, cy + 22);

    ctx.fillStyle = '#555';
    ctx.font = '13px monospace';
    ctx.fillText('ESC — Back', cx, cy + 76);

    if (networkError) {
      ctx.fillStyle = '#f55';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(networkError, cx, cy + 106);
    }

    ctx.textAlign = 'left';
  }

  drawHostingScreen(roomCode) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText('Share this code with your friend:', cx, cy - 80);

    if (roomCode) {
      // Big code display
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(cx - 150, cy - 70, 300, 80);
      ctx.strokeStyle = '#ffe84a';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 150, cy - 70, 300, 80);

      ctx.fillStyle = '#ffe84a';
      ctx.font = 'bold 62px monospace';
      ctx.fillText(roomCode, cx, cy - 8);

      ctx.fillStyle = '#555';
      ctx.font = '13px monospace';
      ctx.fillText('Code is valid for this session only', cx, cy + 28);
    } else {
      ctx.fillStyle = '#888';
      ctx.font = '18px monospace';
      ctx.fillText('Connecting…', cx, cy);
    }

    // Animated waiting dots
    const dots = '.'.repeat((Math.floor(Date.now() / 500) % 4));
    ctx.fillStyle = '#4ef';
    ctx.font = '16px monospace';
    ctx.fillText(`Waiting for player${dots}`, cx, cy + 65);

    ctx.fillStyle = '#444';
    ctx.font = '13px monospace';
    ctx.fillText('ESC — Cancel', cx, cy + 100);

    ctx.textAlign = 'left';
  }

  drawJoiningScreen(codeInput, networkError) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('JOIN A GAME', cx, cy - 100);

    ctx.fillStyle = '#aaa';
    ctx.font = '15px monospace';
    ctx.fillText('Enter the 4-character room code:', cx, cy - 55);

    // Code input boxes (one box per character)
    const boxW = 56, boxH = 70, gap = 14;
    const totalW = 4 * boxW + 3 * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < 4; i++) {
      const bx = startX + i * (boxW + gap);
      const by = cy - 40;
      const isActive = i === codeInput.length;

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(bx, by, boxW, boxH);

      ctx.strokeStyle = isActive ? '#ffe84a' : (i < codeInput.length ? '#4ef' : '#444');
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, boxW, boxH);

      if (i < codeInput.length) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px monospace';
        ctx.fillText(codeInput[i], bx + boxW / 2, by + 47);
      } else if (isActive) {
        // Blinking cursor
        if (Math.floor(Date.now() / 500) % 2 === 0) {
          ctx.fillStyle = '#ffe84a';
          ctx.fillRect(bx + boxW / 2 - 2, by + 14, 4, 42);
        }
      }
    }

    ctx.fillStyle = '#555';
    ctx.font = '13px monospace';
    ctx.fillText('ENTER to connect   ESC to go back', cx, cy + 50);

    if (networkError) {
      ctx.fillStyle = '#f55';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(networkError, cx, cy + 80);
    }

    ctx.textAlign = 'left';
  }

  drawConnectingScreen() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#4ef';
    ctx.font = 'bold 22px monospace';
    const dots = '.'.repeat((Math.floor(Date.now() / 400) % 4));
    ctx.fillText(`Connecting${dots}`, cx, cy);

    ctx.fillStyle = '#555';
    ctx.font = '13px monospace';
    ctx.fillText('Waiting for the game to start', cx, cy + 36);

    ctx.textAlign = 'left';
  }

  // ── Start screen ─────────────────────────────────────────────────────────────

  drawStartScreen(gameMode, scores) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('MINI TANK BATTLE', cx, 52);

    // Divider
    ctx.fillStyle = '#444';
    ctx.fillRect(60, 62, canvas.width - 120, 1);

    // Controls — two columns
    const p1x = 65;
    const p2x = canvas.width - 65;

    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#3aaa88';
    ctx.fillText('P1 CONTROLS', p1x, 80);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4488ff';
    ctx.fillText('P2 CONTROLS', p2x, 80);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.fillText('↑↓←→  Move',  p1x, 97);
    ctx.fillText('SPACE  Fire',               p1x, 112);
    ctx.fillText('R      Flip 180°',     p1x, 127);
    ctx.fillText('P/ESC  Pause',              p1x, 142);
    ctx.textAlign = 'right';
    ctx.fillText('WASD   Move', p2x, 97);
    ctx.fillText('F      Fire', p2x, 112);

    // Mode selection buttons — two options
    const btnY = 158;
    const btnW = 160;
    const btnH = 32;
    const totalBtns = 2 * btnW + 12;
    const btnStart = cx - totalBtns / 2;

    const modes = [
      { key: 'single', label: '1  —  SOLO',       color: '#3aaa88', x: btnStart },
      { key: 'multi',  label: '2  —  MULTIPLAYER', color: '#4488ff', x: btnStart + btnW + 12 },
    ];

    ctx.lineWidth = 2;
    modes.forEach(m => {
      const active = gameMode === m.key;
      ctx.fillStyle = active ? m.color : '#2a2a2a';
      ctx.fillRect(m.x, btnY, btnW, btnH);
      ctx.strokeStyle = active ? '#fff8' : '#555';
      ctx.strokeRect(m.x, btnY, btnW, btnH);
      ctx.fillStyle = active ? '#fff' : '#777';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, m.x + btnW / 2, btnY + 21);
    });

    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press 1 / 2 to select mode', cx, btnY + btnH + 15);

    // Scoreboard
    const sepY = btnY + btnH + 30;
    ctx.fillStyle = '#444';
    ctx.fillRect(60, sepY, canvas.width - 120, 1);

    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('TOP SCORES', cx, sepY + 20);

    this._drawScoreTable(scores, 60, sepY + 36, 5);

    // Press ENTER
    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press ENTER to Start', cx, 574);

    ctx.textAlign = 'left';
  }

  drawNameEntry(nameInput, score, scores) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('SAVE YOUR SCORE', cx, 90);

    ctx.fillStyle = '#fff';
    ctx.font = '22px monospace';
    ctx.fillText(`Score: ${score}`, cx, 132);

    ctx.fillStyle = '#aaa';
    ctx.font = '15px monospace';
    ctx.fillText('Enter your name:', cx, 178);

    // Input box
    const boxW = 280;
    const boxH = 42;
    const boxX = cx - boxW / 2;
    const boxY = 190;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#ffe84a';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    const cursor = Math.floor(Date.now() / 500) % 2 === 0 ? '_' : ' ';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(nameInput + cursor, cx, boxY + 28);

    ctx.fillStyle = '#555';
    ctx.font = '12px monospace';
    ctx.fillText('max 12 characters  •  press ENTER to save', cx, 250);

    // Scoreboard
    const sepY = 265;
    ctx.fillStyle = '#444';
    ctx.fillRect(60, sepY, canvas.width - 120, 1);

    ctx.fillStyle = '#ffe84a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('TOP SCORES', cx, sepY + 20);

    this._drawScoreTable(scores, 60, sepY + 36, 6);

    ctx.textAlign = 'left';
  }

  // Shared helper: draws a scores table starting at (tableX, headerY).
  _drawScoreTable(scores, tableX, headerY, maxRows) {
    const { ctx } = this;
    const cols = [tableX + 30, tableX + 65, tableX + 295, tableX + 385];

    if (scores.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No scores yet — be the first!', this.canvas.width / 2, headerY + 20);
      ctx.textAlign = 'left';
      return;
    }

    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('#',     cols[0], headerY);
    ctx.fillText('NAME',  cols[1], headerY);
    ctx.fillText('SCORE', cols[2], headerY);
    ctx.fillText('MODE',  cols[3], headerY);

    const limit = Math.min(scores.length, maxRows);
    for (let i = 0; i < limit; i++) {
      const s   = scores[i];
      const y   = headerY + (i + 1) * 22;
      const top = i === 0;
      ctx.fillStyle = top ? '#ffe84a' : '#ccc';
      ctx.font = top ? 'bold 13px monospace' : '13px monospace';
      ctx.fillText(String(i + 1),                cols[0], y);
      ctx.fillText((s.name || 'Anonymous').substring(0, 12), cols[1], y);
      ctx.fillText(String(s.score),              cols[2], y);
      ctx.fillStyle = s.mode === '2P' ? '#4488ff' : '#3aaa88';
      ctx.fillText(s.mode || '1P',               cols[3], y);
    }
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
    ctx.fillText('Press ENTER to save score', cx, cy + 82);
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
    ctx.fillText('Press ENTER to save score', cx, cy + 62);
    ctx.textAlign = 'left';
  }
}
