import { roundRect } from '../utils/math.js';

export function drawCell(ctx, x, y, size, theme, opts = {}) {
  const {
    hasUnit = false,
    isHover = false,
    isSelected = false,
    special = null,
    specialColors = { speed: '#4fc07a', rage: '#ff6a4a', heal: '#66ddff' },
    specialIcons = { speed: '速', rage: '怒', heal: '愈' },
    time = 0,
  } = opts;

  const cw = size;
  const ch = size;
  const cr = size * 0.18;

  ctx.save();
  ctx.translate(x, y);

  roundRect(ctx, -cw/2, -ch/2, cw, ch, cr);
  ctx.fillStyle = hasUnit ? theme.cellFill : theme.cellEmpty;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = hasUnit ? theme.borderUnit : theme.borderEmpty;
  ctx.stroke();

  if (isHover || isSelected) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = isSelected ? '#ffdd44' : theme.goldLight;
    ctx.globalAlpha = 0.5 + Math.sin(time * 5) * 0.3;
    roundRect(ctx, -cw/2 - 3, -ch/2 - 3, cw + 6, ch + 6, cr + 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (special && !hasUnit) {
    const col = specialColors[special] || '#aaa';
    const icon = specialIcons[special] || '?';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4 + Math.sin(time * 3) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.15 + Math.sin(time * 3) * 0.08;
    ctx.fillStyle = col;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.font = `900 ${size*0.28}px "PingFang SC",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 0);
  }

  ctx.restore();
}

export function drawUnitText(ctx, x, y, size, unit, unitDef, opts = {}) {
  const { time = 0, showMirrorIcon = false } = opts;
  const s = size;
  const name = unitDef.name.replace(/\(半\)/, '').replace('(全)', '').substring(0, 2);

  ctx.save();
  ctx.translate(x, y);

  const glowColor = unitDef.color;
  const lowHp = unit.hp / Math.max(1, unit.maxHp) < 0.4;

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8 + Math.sin(time * 4) * 3;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = unitDef.color;
  ctx.lineWidth = 3;
  ctx.font = `900 ${s*0.45}px "STKaiti","KaiTi","楷体","PingFang SC",serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(name, 0, -s*0.05);
  ctx.fillText(name, 0, -s*0.05);
  ctx.shadowBlur = 0;

  if (unit.lv > 1) {
    ctx.font = `700 ${s*0.16}px sans-serif`;
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeText('Lv' + unit.lv, s*0.28, -s*0.32);
    ctx.fillText('Lv' + unit.lv, s*0.28, -s*0.32);
  }

  if (unit.combo) {
    ctx.font = `${s*0.2}px serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff8c00';
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeText('★', -s*0.42, -s*0.35);
    ctx.fillText('★', -s*0.42, -s*0.35);
  }

  ctx.restore();
}

export function drawChargeBar(ctx, x, y, size, ratio, opts = {}) {
  const { color = '#5dd27a', time = 0 } = opts;
  const cw = size - 4;
  const ch = 4;
  const cy = size/2 - ch - 2;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(-cw/2, cy, cw, ch);

  let barColor = color;
  if (ratio > 0.7) barColor = color;
  if (ratio > 0.9) barColor = '#7dd0ff';
  if (ratio >= 1) {
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 4 + Math.sin(time * 8) * 2;
  }
  ctx.fillStyle = barColor;
  ctx.fillRect(-cw/2, cy, cw * ratio, ch);
  ctx.shadowBlur = 0;

  ctx.restore();
}

export function drawHeart(ctx, cx, cy, size, hpRatio, opts = {}) {
  const { time = 0, scale = 1, color = '#ff4466', label = '' } = opts;
  const s = size * scale;

  ctx.save();
  ctx.translate(cx, cy);

  const pulse = 1 + Math.sin(time * 3) * 0.05;
  ctx.scale(pulse, pulse);

  ctx.shadowColor = color;
  ctx.shadowBlur = 12 + Math.sin(time * 2) * 4;

  ctx.fillStyle = color;
  ctx.beginPath();
  const topY = -s * 0.25;
  const bottomY = s * 0.45;
  const w = s * 0.5;
  ctx.moveTo(0, bottomY);
  ctx.bezierCurveTo(-w, bottomY - s*0.1, -s*0.55, topY, 0, topY + s*0.1);
  ctx.bezierCurveTo(s*0.55, topY, w, bottomY - s*0.1, 0, bottomY);
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-s*0.18, -s*0.05, s*0.15, s*0.1, -0.3, 0, Math.PI*2);
  ctx.fill();

  const barW = s * 1.2;
  const barH = 6;
  const barY = s * 0.65;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  roundRect(ctx, -barW/2, barY, barW, barH, 3);
  ctx.fill();

  let hpColor = '#ff4466';
  if (hpRatio > 0.5) hpColor = '#ff6b6b';
  if (hpRatio > 0.8) hpColor = '#66d966';
  ctx.fillStyle = hpColor;
  roundRect(ctx, -barW/2, barY, barW * Math.max(0, hpRatio), barH, 3);
  ctx.fill();

  if (label) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.font = `700 ${s*0.2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeText(label, 0, barY + barH + s*0.18);
    ctx.fillText(label, 0, barY + barH + s*0.18);
  }

  ctx.restore();
}

export function drawClouds(ctx, width, height, time) {
  const clouds = [
    { x: 0.1, y: 0.08, s: 1.0, spd: 0.003 },
    { x: 0.3, y: 0.12, s: 0.7, spd: 0.005 },
    { x: 0.6, y: 0.06, s: 1.2, spd: 0.002 },
    { x: 0.85, y: 0.1, s: 0.8, spd: 0.004 },
  ];

  ctx.save();
  for (const c of clouds) {
    const cx = ((c.x + time * c.spd) % 1.2 - 0.1) * width;
    const cy = c.y * height;
    const s = c.s * 40;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, s*0.5, 0, Math.PI*2);
    ctx.arc(cx + s*0.4, cy - s*0.2, s*0.4, 0, Math.PI*2);
    ctx.arc(cx + s*0.8, cy, s*0.45, 0, Math.PI*2);
    ctx.arc(cx + s*0.5, cy + s*0.1, s*0.35, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawObstacle(ctx, x, y, size, theme) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = theme.obsDark;
  ctx.beginPath();
  ctx.ellipse(0, s*0.1, s*0.42, s*0.28, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = theme.obs;
  ctx.beginPath();
  ctx.moveTo(-s*0.35, s*0.05);
  ctx.lineTo(-s*0.28, -s*0.3);
  ctx.lineTo(-s*0.05, -s*0.38);
  ctx.lineTo(s*0.2, -s*0.32);
  ctx.lineTo(s*0.35, -s*0.05);
  ctx.lineTo(s*0.25, s*0.1);
  ctx.lineTo(-s*0.15, s*0.12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(-s*0.2, -s*0.25);
  ctx.lineTo(s*0.05, -s*0.33);
  ctx.lineTo(s*0.1, -s*0.2);
  ctx.lineTo(-s*0.1, -s*0.12);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawFloatText(ctx, x, y, text, color, t, big = false) {
  const alpha = Math.max(0, 1 - t / (big ? 1.4 : 0.8));
  const yOff = -t * 30;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${big ? 18 : 14}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y + yOff);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + yOff);
  ctx.restore();
}
