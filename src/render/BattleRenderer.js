import { drawCell, drawUnitText, drawChargeBar, drawHeart, drawClouds, drawObstacle, drawFloatText } from './sprites.js';
import { getTheme, SPECIAL_CELL } from '../config/themes.js';
import { UNITS, COMBO_INFO, canMirrorUnit } from '../config/units.js';
import { roundRect } from '../utils/math.js';

export class BattleRenderer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
    this._shake = 0;
  }

  resize(width, height) {
    this.w = width;
    this.h = height;
  }

  render(state) {
    const ctx = this.ctx;
    const theme = getTheme(state.chapter);

    ctx.save();
    if (state.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * state.shake,
        (Math.random() - 0.5) * state.shake
      );
    }

    this._drawBackground(theme, state);
    this._drawClouds(state.time);
    this._drawBuildings(theme, state);
    this._drawObstacles(state);
    this._drawRiderTrails(state);
    this._drawFireTrails(state);
    this._drawCells(state, theme);
    this._drawHeart(state, theme);
    this._drawEnemies(state);
    this._drawShots(state);
    this._drawRiders(state, theme);
    this._drawRiderMirrors(state);
    this._drawFx(state);
    this._drawFloats(state);

    ctx.restore();
  }

  _drawBackground(theme, state) {
    const ctx = this.ctx;
    const bg = theme.bg;
    const grad = ctx.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, bg.top);
    grad.addColorStop(0.5, bg.mid);
    grad.addColorStop(1, bg.bot);
    ctx.fillStyle = grad;
    ctx.fillRect(-20, -20, this.w + 40, this.h + 40);
  }

  _drawClouds(time) {
    drawClouds(this.ctx, this.w, this.h, time);
  }

  _drawBuildings(theme, state) {
    const ctx = this.ctx;
    const W = this.w;
    const H = this.h;
    const wallColor = theme.borderUnit || '#c49a48';
    const wallDark = theme.obsDark || '#7a6548';
    const roofColor = theme.gold || '#c49a48';

    const wallTopY = H * 0.02;
    const wallH = H * 0.12;
    const towerW = W * 0.06;
    const towerH = wallH * 1.3;

    ctx.fillStyle = wallColor;
    ctx.fillRect(0, wallTopY + towerH * 0.3, W, wallH * 0.7);

    const towerPositions = [0.08, 0.25, 0.5, 0.75, 0.92];
    for (const tx of towerPositions) {
      const x = W * tx - towerW / 2;
      ctx.fillStyle = wallColor;
      ctx.fillRect(x, wallTopY, towerW, towerH);
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(x - towerW * 0.1, wallTopY);
      ctx.lineTo(x + towerW / 2, wallTopY - towerH * 0.25);
      ctx.lineTo(x + towerW * 1.1, wallTopY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = wallDark;
      ctx.fillRect(x + towerW * 0.35, wallTopY + towerH * 0.45, towerW * 0.3, towerH * 0.4);
    }

    ctx.fillStyle = wallDark;
    const crenellationW = W * 0.015;
    const crenellationH = wallH * 0.15;
    const crenellationY = wallTopY + towerH * 0.3;
    for (let x = 0; x < W; x += crenellationW * 2) {
      ctx.fillRect(x, crenellationY - crenellationH, crenellationW, crenellationH);
    }

    const bottomWallY = H * 0.86;
    const bottomWallH = H * 0.12;
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, bottomWallY, W, bottomWallH);

    const houseW = W * 0.08;
    const houseH = bottomWallH * 1.1;
    const housePositions = [0.1, 0.3, 0.7, 0.9];
    for (const hx of housePositions) {
      const x = W * hx - houseW / 2;
      const y = bottomWallY - houseH * 0.3;
      this._drawHouse(x, y, houseW, houseH, houseH * 0.35, wallColor, roofColor, wallDark);
    }

    const gateW = W * 0.12;
    const gateH = bottomWallH * 1.2;
    const gateX = W / 2 - gateW / 2;
    const gateY = bottomWallY - gateH * 0.25;
    ctx.fillStyle = wallDark;
    ctx.fillRect(gateX, gateY, gateW, gateH);
    ctx.fillStyle = wallColor;
    const archW = gateW * 0.6;
    const archH = gateH * 0.65;
    const archX = W / 2 - archW / 2;
    ctx.beginPath();
    ctx.moveTo(archX, gateY + gateH);
    ctx.lineTo(archX, gateY + archH);
    ctx.quadraticCurveTo(W / 2, gateY - archH * 0.1, archX + archW, gateY + archH);
    ctx.lineTo(archX + archW, gateY + gateH);
    ctx.closePath();
    ctx.fill();
  }

  _drawHouse(x, y, w, h, roofH, wallColor, roofColor, darkColor) {
    const ctx = this.ctx;
    ctx.fillStyle = wallColor;
    ctx.fillRect(x, y + roofH, w, h - roofH);
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.05, y + roofH);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w * 1.05, y + roofH);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = darkColor;
    const doorW = w * 0.4;
    const doorH = (h - roofH) * 0.55;
    ctx.fillRect(x + w / 2 - doorW / 2, y + h - doorH, doorW, doorH);
  }

  _drawObstacles(state) {
    if (!state.obstacles || state.obstacles.length === 0) return;
    const theme = getTheme(state.chapter);
    const s = state.cellSize;
    for (const o of state.obstacles) {
      drawObstacle(this.ctx, o.px, o.py, s, theme);
    }
  }

  _drawRiderTrails(state) {
    if (!state.riders || state.riders.length === 0) return;
    const ctx = this.ctx;
    const s = state.cellSize;

    for (const rider of state.riders) {
      if (rider.dead || !rider.history || rider.history.length < 2) continue;
      for (let i = 0; i < rider.history.length - 1; i++) {
        const h = rider.history[i];
        const cell = state.cells.find(c => c.gc === h.x && c.gr === h.y);
        if (!cell) continue;
        const age = i / rider.history.length;
        const alpha = (1 - age) * 0.3;
        const scale = 0.35 + age * 0.15;
        ctx.save();
        ctx.translate(cell.px, cell.py);
        ctx.fillStyle = `rgba(255,215,100,${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,180,60,${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * (scale + 0.1), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  _drawFireTrails(state) {
    if (!state.riders) return;
    const ctx = this.ctx;
    const s = state.cellSize;
    for (const rider of state.riders) {
      if (!rider.fireTrail || rider.fireTrail.length === 0) continue;
      for (const ft of rider.fireTrail) {
        const cell = state.cells.find(c => c.gc === ft.gx && c.gr === ft.gy);
        if (!cell) continue;
        const alpha = Math.max(0, ft.t / ft.maxT);
        ctx.save();
        ctx.translate(cell.px, cell.py);
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = '#ff6a2a';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath();
        ctx.arc(0, -s * 0.05, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  _drawCells(state, theme) {
    const ctx = this.ctx;
    const s = state.cellSize;

    for (const c of state.cells) {
      const u = c.unit;
      const isHover = state.hoverCell >= 0 && state.cells[state.hoverCell] === c;
      const isSelected = state.selCell >= 0 && state.cells[state.selCell] === c;

      const onRider = state.riders?.some(r => !r.dead && r.cx === c.gc && r.cy === c.gr);
      const mirrorReady = u && state.riders?.some(r => !r.dead && r.cx === c.gc && r.cy === c.gr) && UNITS[u.ch]?.atk > 0;

      drawCell(ctx, c.px, c.py, s * 0.95, theme, {
        hasUnit: !!u,
        isHover,
        isSelected,
        special: c.special,
        specialColors: { speed: '#4fc07a', rage: '#ff6a4a', heal: '#66ddff' },
        specialIcons: { speed: '速', rage: '怒', heal: '愈' },
        time: state.time,
      });

      if (u && u.combo) {
        const comboColor = COMBO_INFO[UNITS[u.ch].combo]?.color || '#ffd700';
        ctx.save();
        ctx.translate(c.px, c.py);
        ctx.strokeStyle = comboColor;
        ctx.lineWidth = 3;
        roundRect(ctx, -s*0.475 - 1, -s*0.475 - 1, s*0.95 + 2, s*0.95 + 2, 4);
        ctx.stroke();
        ctx.restore();
      }

      if (onRider && !u) {
        ctx.save();
        ctx.translate(c.px, c.py);
        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(state.time * 5) * 0.3;
        roundRect(ctx, -s*0.475 - 3, -s*0.475 - 3, s*0.95 + 6, s*0.95 + 6, 5);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      if (mirrorReady) {
        ctx.save();
        ctx.translate(c.px, c.py);
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + Math.sin(state.time * 6) * 0.3;
        roundRect(ctx, -s*0.475 - 2, -s*0.475 - 2, s*0.95 + 4, s*0.95 + 4, 4);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      if (u) {
        const unitDef = UNITS[u.ch];
        if (unitDef) {
          drawUnitText(ctx, c.px, c.py, s, u, unitDef, {
            time: state.time,
          });
        }

        if (canMirrorUnit(u)) {
          const chRatio = u.charge / (u.maxCharge || 100);
          drawChargeBar(ctx, c.px, c.py, s * 0.95, chRatio, {
            color: '#5dd27a',
            time: state.time,
          });

          ctx.save();
          ctx.translate(c.px, c.py);
          ctx.font = `${s*0.16}px serif`;
          ctx.textAlign = 'right';
          ctx.fillStyle = '#7dd0ff';
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = 2;
          const icon = chRatio >= 1 ? '⚡镜' : '镜';
          ctx.strokeText(icon, s*0.42, -s*0.3);
          ctx.fillText(icon, s*0.42, -s*0.3);
          ctx.restore();
        }

        if (u.shield && u.shield > 0) {
          ctx.save();
          ctx.translate(c.px, c.py);
          ctx.strokeStyle = '#88ddff';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5 + Math.sin(state.time * 4) * 0.2;
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
    }
  }

  _drawHeart(state, theme) {
    const hpRatio = state.heartHp / Math.max(1, state.heartMax);
    drawHeart(this.ctx, state.heartX, state.heartY, state.cellSize, hpRatio, {
      time: state.time,
      scale: state.heartScale || 1,
      color: '#ff4466',
      label: Math.round(state.heartHp),
    });
  }

  _drawEnemies(state) {
    const ctx = this.ctx;
    for (const e of state.enemies) {
      if (e.dead) continue;
      ctx.save();
      ctx.translate(e.x, e.y);

      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(-e.r*0.3, -e.r*0.3, e.r*0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-e.r*0.25, -e.r*0.1, e.r*0.2, 0, Math.PI * 2);
      ctx.arc(e.r*0.25, -e.r*0.1, e.r*0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-e.r*0.2, -e.r*0.05, e.r*0.1, 0, Math.PI * 2);
      ctx.arc(e.r*0.3, -e.r*0.05, e.r*0.1, 0, Math.PI * 2);
      ctx.fill();

      const hpRatio = e.hp / Math.max(1, e.maxHp);
      const barW = e.r * 2;
      const barH = 4;
      const barY = -e.r - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-barW/2, barY, barW, barH);
      let hpColor = '#ef4444';
      if (hpRatio > 0.5) hpColor = '#f59e0b';
      if (hpRatio > 0.8) hpColor = '#22c55e';
      ctx.fillStyle = hpColor;
      ctx.fillRect(-barW/2, barY, barW * hpRatio, barH);

      if (e.boss) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `700 ${e.r*0.8}px serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText('👑', 0, -e.r - 14);
        ctx.fillText('👑', 0, -e.r - 14);
      }
      if (e.elite) {
        ctx.fillStyle = '#a855f7';
        ctx.font = `${e.r*0.7}px serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText('⭐', 0, -e.r - 12);
        ctx.fillText('⭐', 0, -e.r - 12);
      }

      ctx.restore();
    }
  }

  _drawShots(state) {
    const ctx = this.ctx;
    if (!state.shots) return;
    for (const f of state.shots) {
      if (f.dead) continue;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.fillStyle = f.color || '#fff';
      ctx.shadowColor = f.color || '#fff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, f.r || 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawRiders(state, theme) {
    if (!state.riders) return;
    const ctx = this.ctx;
    for (const r of state.riders) {
      if (r.dead) continue;
      ctx.save();
      ctx.translate(r.px, r.py);

      const s = state.cellSize * 0.7;
      const facing = r.facing || 1;
      ctx.scale(facing, 1);

      ctx.fillStyle = '#6b4226';
      ctx.beginPath();
      ctx.ellipse(0, s*0.1, s*0.45, s*0.25, 0, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#8B5E3C';
      ctx.beginPath();
      ctx.ellipse(-s*0.05, s*0.02, s*0.35, s*0.18, 0, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#6b4226';
      ctx.beginPath();
      ctx.ellipse(s*0.35, -s*0.05, s*0.18, s*0.15, 0.3, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#c9483c';
      ctx.beginPath();
      ctx.moveTo(s*0.3, -s*0.15);
      ctx.quadraticCurveTo(s*0.5, -s*0.3, s*0.4, -s*0.35);
      ctx.quadraticCurveTo(s*0.25, -s*0.25, s*0.3, -s*0.15);
      ctx.fill();

      ctx.fillStyle = '#2a1820';
      ctx.beginPath();
      ctx.arc(-s*0.1, -s*0.18, s*0.14, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#e8c89a';
      ctx.beginPath();
      ctx.arc(-s*0.1, -s*0.15, s*0.1, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#c9483c';
      ctx.beginPath();
      ctx.moveTo(-s*0.4, s*0.05);
      ctx.quadraticCurveTo(-s*0.55, 0, -s*0.5, s*0.15);
      ctx.quadraticCurveTo(-s*0.45, s*0.25, -s*0.4, s*0.15);
      ctx.fill();

      if (r.charging) {
        ctx.globalAlpha = 0.5 + Math.sin(state.time * 10) * 0.3;
        ctx.fillStyle = '#ffb84f';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.55, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }

  _drawRiderMirrors(state) {
    if (!state.riderMirrors) return;
    const ctx = this.ctx;
    for (const m of state.riderMirrors) {
      if (m.dead) continue;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.globalAlpha = 0.7 + Math.sin(state.time * 5) * 0.2;
      ctx.fillStyle = m.color || '#aaddff';
      ctx.shadowColor = m.color || '#aaddff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, state.cellSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${state.cellSize*0.25}px "STKaiti","KaiTi",serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.ch || '镜', 0, 0);
      ctx.restore();
    }
  }

  _drawFx(state) {
    const ctx = this.ctx;
    if (!state.fx) return;
    for (const f of state.fx) {
      const t = f.t;
      const dur = f.dur || 0.35;
      const prog = Math.min(1, t / dur);

      ctx.save();
      ctx.translate(f.x, f.y);

      switch (f.type) {
        case 'slash':
          ctx.strokeStyle = `rgba(255,255,255,${1 - prog})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 10 + prog * 20, -0.5, 0.5);
          ctx.stroke();
          break;
        case 'ring':
          ctx.strokeStyle = f.color || '#fff';
          ctx.globalAlpha = 1 - prog;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, (f.r || 20) * prog, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'boom':
          ctx.fillStyle = `rgba(255,150,50,${0.6 * (1 - prog)})`;
          ctx.beginPath();
          ctx.arc(0, 0, (f.r || 30) * prog, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(255,200,80,${1 - prog})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, (f.r || 30) * prog, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'combo_heal':
          ctx.strokeStyle = `rgba(100,255,150,${1 - prog})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, (f.r || 30) * prog, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'combo_sha_explode':
          ctx.fillStyle = `rgba(46,139,87,${0.5 * (1 - prog)})`;
          ctx.beginPath();
          ctx.arc(0, 0, (f.r || 40) * prog, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'combo_pig':
          ctx.strokeStyle = `rgba(70,130,180,${1 - prog})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, (f.r || 40), f.ang - 0.5, f.ang + 0.5);
          ctx.stroke();
          break;
        case 'combo_monkey':
          ctx.fillStyle = `rgba(255,140,0,${0.5 * (1 - prog)})`;
          ctx.beginPath();
          ctx.arc(0, 0, (f.r || 50) * prog, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      ctx.restore();
    }
  }

  _drawFloats(state) {
    if (!state.floats) return;
    for (const f of state.floats) {
      drawFloatText(this.ctx, f.x, f.y, f.txt, f.color, f.t, f.big);
    }
  }
}
