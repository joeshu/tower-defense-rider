import { dist } from '../utils/math.js';
import { effStat } from '../config/units.js';
import { createEnemy } from '../config/enemies.js';

export const LEAK_DAMAGE_RATIO = 0.15;

export function findEnemyTarget(cell, enemies, rangePx) {
  let best = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = dist(cell.px, cell.py, e.x, e.y);
    if (d <= rangePx && d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

export function findNearestEnemy(x, y, enemies) {
  let best = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return { enemy: best, dist: bestDist };
}

export function findUnitTargetForEnemy(enemy, cells, mirrors, heartX, heartY) {
  let tgx = heartX;
  let tgy = heartY;
  let tgCell = null;
  let tgMirror = null;
  let bd = dist(enemy.x, enemy.y, heartX, heartY);

  for (const c of cells) {
    if (!c.unit) continue;
    const d = dist(enemy.x, enemy.y, c.px, c.py);
    if (d < bd) {
      bd = d;
      tgx = c.px;
      tgy = c.py;
      tgCell = c;
      tgMirror = null;
    }
  }

  if (mirrors) {
    for (const m of mirrors) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - enemy.x, m.y - enemy.y);
      if (d < bd) {
        bd = d;
        tgx = m.x;
        tgy = m.y;
        tgCell = null;
        tgMirror = m;
      }
    }
  }

  return { tgx, tgy, tgCell, tgMirror, bd };
}

export function getReach(target, cellSize, enemyR) {
  return (target) ? cellSize * 0.55 + enemyR : cellSize * 0.45 + enemyR;
}

export function applyDamageToUnit(cell, damage, state) {
  if (cell.unit.shield && cell.unit.shield > 0) {
    const sa = Math.min(cell.unit.shield, damage);
    cell.unit.shield -= sa;
    damage -= sa;
    if (sa > 0 && state) {
      state.addFloat(cell.px, cell.py - 4, '🛡️', '#88ddff');
    }
  }

  if (state) {
    state.addFloat(cell.px, cell.py + 10, '-' + Math.round(damage), '#ff9a9a');
  }

  cell.unit.hp -= damage;

  const leakDmg = damage * LEAK_DAMAGE_RATIO;
  if (state && leakDmg > 0.5) {
    state.damageHeart(leakDmg);
  }

  if (cell.unit.hp <= 0) {
    cell.unit.hp = 1;
  }

  return damage;
}

export function processUnitAttack(cell, enemies, state, cellSize, statFn) {
  const u = cell.unit;
  if (!u) return;

  const stats = effStat(u, statFn);
  if (stats.atk <= 0) return;

  u.cd -= state.speed * state._dt;
  if (u.cd > 0) return;

  const rangePx = stats.range * cellSize;
  const target = findEnemyTarget(cell, enemies, rangePx);
  if (!target) return;

  u.cd = 1 / stats.aspd;

  target.hp -= stats.atk;
  state.addFloat(target.x, target.y - 12, '-' + Math.round(stats.atk), '#fff');
  state.addFx('slash', target.x, target.y, { dur: 0.2 });

  if (target.hp <= 0) {
    target.dead = true;
    state.waveKilled++;
    state.addGold(target.gold || 1);
    state.addFloat(target.x, target.y - 20, '+' + (target.gold || 1) + '💰', '#ffd700');
  }
}
