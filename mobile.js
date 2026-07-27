/* ============================================================
 * mobile.js —— 骑马单位「骑」的格子持续奔跑系统
 *
 * 核心设计：
 *   马永远在跑。不是"走一步停一下"，而是像传送带上的
 *   小车一样，从一格滑向下一格，永不停歇。
 *
 *   状态只有两种：
 *     - running（跑）  → 从A格滑向B格
 *     - charging（砍） → 到达格子瞬间触发攻击，立刻继续跑
 *
 *   到达格子中心的那一帧：
 *     1. 检查脚下/周围有没有怪 → 有就砍（冲锋加成）
 *     2. 立刻决定下一个目标格子 → 无缝继续跑
 *
 *   没有 idle，没有 cooldown 停顿，永远在动。
 * ============================================================ */
'use strict';

/* ============ 配置 ============ */
const RIDER_CFG = {
  cost: 4,
  baseHp: 100,
  baseAtk: 22,
  baseRange: 1,         // 攻击范围（格子曼哈顿距离）
  cellSpeed: 1.6,       // 格/秒，越大越快。1.6 = 每格约0.625秒
  chargeBonus: 1.8,     // 冲锋伤害倍率
  trampleDmg: 0.35,     // 践踏溅射占比
  patrolBias: 0.6,      // 巡逻时继续沿原方向的概率
  colors: {
    body:   '#6b4226',   // 马身棕
    bodyLt: '#8B5E3C',   // 马身亮面
    mane:   '#c9483c',   // 马鬃红
    tail:   '#c9483c',   // 马尾
    rider:  '#2a1820',   // 骑手衣
    riderSkin:'#e8c89a', // 骑手皮肤
    outline:'#3a1e0a',
    charge: '#ffb84f',   // 冲锋光
    trail:  '#a06840',   // 残影
  }
};

/* ============ 骑术技能定义 ============
 * 每种技能根据战场情境触发，有独立冷却和独特机制。
 * 8大技能，各有鲜明特色：
 *   🔥 烈焰冲锋 - 跑过的格子留火，敌人踩上灼烧
 *   🌀 旋风斩   - 周围3+敌→360°横扫斩
 *   ⚡ 雷霆一击 - 精英/BOSS→天降惊雷高额伤害
 *   💚 治愈光环 - 友军低血→持续回血+护盾
 *   📯 集结号角 - 友军邻接→全体攻速+移速buff
 *   💥 践踏震波 - 连跑4格→落地震波+击飞
 *   🏹 贯穿突刺 - 直线冲锋→穿透4格所有敌人
 *   ⚡ 连环闪电 - 击杀时→闪电连锁弹跳
 */
const RIDER_SKILLS = {
  firetrail: { name: '烈焰冲锋', icon: '🔥', cd: 0,    color: '#ff6a2a', desc: '跑过的格子留下火焰，敌人灼烧' },
  whirlwind: { name: '旋风斩',   icon: '🌀', cd: 5.0,  color: '#ff66ff', desc: '周围3+敌→范围横扫斩' },
  thunder:   { name: '雷霆一击', icon: '🌩️', cd: 12.0, color: '#ffdd00', desc: '精英/BOSS→天降惊雷' },
  heal:      { name: '治愈光环', icon: '💚', cd: 9.0,  color: '#44ff88', desc: '友军低血→持续回血' },
  rally:     { name: '集结号角', icon: '📯', cd: 7.0,  color: '#ffdd44', desc: '友军邻接→攻速+移速' },
  trample:   { name: '践踏震波', icon: '💥', cd: 4.0,  color: '#ffaa44', desc: '连跑4格→震波击飞' },
  charge:    { name: '贯穿突刺', icon: '🏹', cd: 7.0,  color: '#ff4488', desc: '连跑6格→直线穿透' },
  chain:     { name: '连环闪电', icon: '⚡', cd: 2.5,  color: '#ffee66', desc: '击杀时→闪电连锁' },
};

/* ============ 创建骑马单位 ============ */
function makeRider(cellX, cellY, level) {
  const lv = Math.max(1, level || 1);
  const m = Math.pow(1.4, lv - 1);
  return {
    type: 'rider',
    ch: '骑',
    cx: cellX, cy: cellY,
    px: 0, py: 0,
    state: 'running',
    fromX: cellX, fromY: cellY,
    toX: cellX, toY: cellY,
    progress: 0,
    speed: RIDER_CFG.cellSpeed,
    history: [{ x: cellX, y: cellY }],
    hp: RIDER_CFG.baseHp * m,
    maxHp: RIDER_CFG.baseHp * m,
    atk: RIDER_CFG.baseAtk * m,
    range: RIDER_CFG.baseRange,
    level: lv,
    exp: 0,
    expToNext: 5,
    canLeap: false,
    canCrossLane: false,
    chainCount: 0,
    chargeBonusMul: 1,
    runPhase: Math.random() * Math.PI * 2,
    facing: 0,
    lastAttackKey: '',
    attackFlash: 0,
    kills: 0,
    dead: false,
    hitCombo: 0,
    skills: { firetrail: 0, whirlwind: 0, thunder: 0, heal: 0, rally: 0, trample: 0, charge: 0, chain: 0 },
    buffs: { berserk: 0, rallyAura: 0, leaping: 0, healing: 0, invincible: 0, speedUp: 0 },
    lastSkill: '',
    lastSkillT: 0,
  };
}

// 初始化骑手的第一格目标（需要在 S.cells/S.riders 就绪后调用）
function initRider(rider) {
  const first = pickNextCell(rider);
  rider.toX = first.x;
  rider.toY = first.y;
  // 像素坐标
  const sp = gridToPixel(rider.cx, rider.cy);
  rider.px = sp.x;
  rider.py = sp.y;
}

/* ============ 工具函数 ============ */

// 获取所有可行走格子（棋盘上的空位 + 骑自身当前格）
function getWalkableSet() {
  const set = new Set();
  S.cells.forEach(c => set.add(c.gc + ',' + c.gr));
  if (S.riders) S.riders.forEach(r => set.add(r.cx + ',' + r.cy));
  // 障碍格不可走（除非有跳跃技能）
  return set;
}

// 格子 → 像素中心
function gridToPixel(gx, gy) {
  const cell = S.cells.find(c => c.gc === gx && c.gr === gy);
  if (cell) return { x: cell.px, y: cell.py };
  return { x: S.heartX + gx * 60, y: S.heartY + gy * 60 };
}

// 四邻格
function neighbors4(gx, gy) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  return dirs.map(([dx,dy]) => ({ x: gx+dx, y: gy+dy, dx, dy }));
}

// 曼哈顿距离
function manhattan(ax, ay, bx, by) {
  return Math.abs(ax-bx) + Math.abs(ay-by);
}

// 找最近的敌人，返回 {enemy, gx, gy, dist} 或 null
function findNearestEnemy(gx, gy) {
  let best = null, bestDist = Infinity;
  S.enemies.forEach(e => {
    if (e.dead || e.hp <= 0) return;
    // 敌人像素 → 近似格子
    const egx = Math.round((e.x - S.heartX) / S.cellSize);
    const egy = Math.round((e.y - S.heartY) / S.cellSize);
    const d = manhattan(gx, gy, egx, egy);
    if (d < bestDist) { bestDist = d; best = { enemy: e, gx: egx, gy: egy, dist: d }; }
  });
  return best;
}

/* ============ 核心：选择下一格 ============
 * 马永远在跑，所以每到达一格必须立刻决定下一格。
 * 优先级：
 *   1. 如果附近有怪 → 朝最近怪走一格（追击）
 *   2. 否则 → 巡逻（优先沿原方向，碰壁随机转弯）
 */
function pickNextCell(rider) {
  const set = getWalkableSet();
  const candidates = neighbors4(rider.toX, rider.toY).filter(n => {
    const key = n.x + ',' + n.y;
    if (!set.has(key)) return false;
    // 不往回走（除非只有这一条路）
    if (n.x === rider.fromX && n.y === rider.fromY && rider.history.length > 2) return false;
    return true;
  });

  if (candidates.length === 0) {
    // 死路，原路返回
    return { x: rider.fromX, y: rider.fromY };
  }

  // 1. 找最近敌人
  const enemy = findNearestEnemy(rider.toX, rider.toY);

  if (enemy && enemy.dist <= 3) {
    // 朝敌人方向选一格
    let best = candidates[0], bestScore = Infinity;
    candidates.forEach(n => {
      const d = manhattan(n.x, n.y, enemy.gx, enemy.gy);
      if (d < bestScore) { bestScore = d; best = n; }
    });
    return { x: best.x, y: best.y };
  }

  // 2. 巡逻：优先沿原方向
  if (rider.history.length >= 2) {
    const prev = rider.history[rider.history.length - 2];
    const dx = rider.toX - prev.x;
    const dy = rider.toY - prev.y;
    const fwd = candidates.find(n => n.x === rider.toX + dx && n.y === rider.toY + dy);
    if (fwd && Math.random() < RIDER_CFG.patrolBias) {
      return { x: fwd.x, y: fwd.y };
    }
  }

  // 随机选（排除来路）
  const filtered = candidates.filter(n => !(n.x === rider.fromX && n.y === rider.fromY));
  const pool = filtered.length > 0 ? filtered : candidates;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { x: pick.x, y: pick.y };
}

/* ============ 到达格子时：攻击判定 ============ */
function onArriveCell(rider) {
  const here = rider.cx + ',' + rider.cy;
  const enemies = S.enemies.filter(e => !e.dead);

  // 找范围内的怪
  let targets = [];
  enemies.forEach(e => {
    const egx = Math.round((e.x - S.heartX) / S.cellSize);
    const egy = Math.round((e.y - S.heartY) / S.cellSize);
    if (manhattan(rider.cx, rider.cy, egx, egy) <= rider.range) {
      targets.push(e);
    }
  });

  let mainKilled = false;
  let mainTarget = null;

  if (targets.length > 0) {
    // 冲锋加成：根据连续奔跑距离计算
    const runLen = rider.history.length;
    const chargeMul = 1 + Math.min(runLen * 0.12, 0.8); // 最多+80%
    // 狂暴增益：伤害+50%
    const berserkMul = rider.buffs.berserk > 0 ? 1.5 : 1;
    const dmg = rider.atk * RIDER_CFG.chargeBonus * chargeMul * rider.chargeBonusMul * berserkMul;

    // 攻击主目标
    const main = targets[0];
    mainTarget = main;
    const mainHpBefore = main.hp;
    main.hp -= dmg;
    if (main.hp <= 0 && mainHpBefore > 0) {
      rider.kills += 1;
      mainKilled = true;
    }
    rider.attackFlash = 8; // 几帧的攻击闪光

    // 飘字
    const dmgText = Math.round(dmg);
    S.floats.push({ x: main.x, y: main.y - 16, t: 0, txt: '💥' + dmgText, color: '#ffb84f' });

    // 践踏：范围内其他怪也受伤
    targets.slice(1).forEach(t => {
      const td = rider.atk * RIDER_CFG.trampleDmg * chargeMul * berserkMul;
      t.hp -= td;
      S.floats.push({ x: t.x, y: t.y - 12, t: 0, txt: '🐴' + Math.round(td), color: '#d4a056' });
    });

    // 特效
    S.fx.push({ type: 'slash', x: main.x, y: main.y, t: 0 });
    S.fx.push({ type: 'ring', x: rider.px, y: rider.py, t: 0, r: 18, color: '#ffb84f' });

    // 连环（rider_only 规则赋予的连环能力）
    if (rider.chainCount > 0) {
      const next = enemies.find(e => e !== main && !e.dead && e.hp > 0 && manhattan(
        Math.round((e.x-S.heartX)/S.cellSize),
        Math.round((e.y-S.heartY)/S.cellSize),
        rider.cx, rider.cy
      ) <= 2);
      if (next) {
        rider.chainCount--;
        const cdmg = rider.atk * 1.2 * berserkMul;
        next.hp -= cdmg;
        S.floats.push({ x: next.x, y: next.y - 14, t: 0, txt: '⚡' + Math.round(cdmg), color: '#ffd76a' });
        S.fx.push({ type: 'slash', x: next.x, y: next.y, t: 0 });
      }
    }

    // 击杀奖励（先发金币，死亡标记在技能触发后统一处理）
    targets.forEach(t => {
      if (t.hp <= 0 && !t.dead) {
        const g = (ENEMY_DEFS[t.ch] && ENEMY_DEFS[t.ch].gold) || 1;
        S.gold += g;
        S.floats.push({ x: t.x, y: t.y - 26, t: 0, txt: '+' + g + '💰', color: '#f4c95d' });
        // 成长系统：击杀获得经验
        const expGain = (e) => {
          const baseExp = (ENEMY_DEFS[e.ch] && ENEMY_DEFS[e.ch].gold) || 1;
          return baseExp * (e.elite ? 3 : (e.boss ? 10 : 1));
        };
        const exp = expGain(t);
        rider.exp += exp;
        S.floats.push({ x: t.x, y: t.y - 38, t: 0, txt: '+' + exp + 'EXP', color: '#88ddff' });
        // 检查升级
        while (rider.exp >= rider.expToNext) {
          rider.exp -= rider.expToNext;
          rider.level++;
          rider.expToNext = Math.floor(rider.expToNext * 1.5);
          const m = Math.pow(1.4, rider.level - 1);
          rider.maxHp = RIDER_CFG.baseHp * m;
          rider.hp = rider.maxHp;
          rider.atk = RIDER_CFG.baseAtk * m;
          S.floats.push({ x: rider.px, y: rider.py - 40, t: 0, txt: '🐴升级!Lv' + rider.level, color: '#ffd76a', big: true });
          S.fx.push({ type: 'rally', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 0.8, dur: 0.5 });
        }
      }
    });
  }

  // ===== 情境技能触发 =====
  tryRiderSkills(rider, targets, mainTarget, mainKilled);

  // ===== 镜魂充能：骑马路过有单位的格子时，给可生成镜像的兵种充能 =====
  chargeMirrorUnit(rider);

  // ===== 击杀判定：统一标记死亡 + 计入波次进度 =====
  S.enemies.forEach(e => {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      S.waveKilled++;
      const d = ENEMY_DEFS[e.ch];
      S.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, r: e.r || 15, color: (d && d.color) || '#fff' });
    }
  });
  S.enemies = S.enemies.filter(e => !e.dead);
}

/* ============ 情境技能系统（特色版） ============
 * 8大技能，各有鲜明特色和独特机制：
 *   🔥 烈焰冲锋（被动） - 跑过留火，敌人灼烧
 *   🌀 旋风斩        - 3+敌→360°横扫
 *   💥 践踏震波      - 连跑4格→震波+击飞
 *   🏹 贯穿突刺      - 连跑6格→直线穿透5格
 *   ⚡ 连环闪电      - 击杀时→闪电连锁3跳
 *   📯 集结号角      - 2+友军→全体攻速+移速
 *   💚 治愈光环      - 友军低血→立即回血+持续
 *   🌩️ 雷霆一击      - 精英/BOSS→惊雷高伤+眩晕
 */
function _applyFireTrail(rider) {
  if (!S.fireTrails) S.fireTrails = [];
  const cellKey = rider.cx + ',' + rider.cy;
  const existing = S.fireTrails.find(f => f.key === cellKey);
  if (existing) { existing.t = 0; return; }
  const cell = S.cells.find(c => c.gc === rider.cx && c.gr === rider.cy);
  if (!cell) return;
  S.fireTrails.push({
    key: cellKey, x: cell.px, y: cell.py,
    t: 0, dur: 3.5, dmg: rider.atk * 0.25,
    hitSet: {}
  });
}

function updateFireTrails(dt) {
  if (!S.fireTrails) return;
  const enemies = S.enemies || [];
  for (let i = S.fireTrails.length - 1; i >= 0; i--) {
    const f = S.fireTrails[i];
    f.t += dt;
    if (f.t >= f.dur) { S.fireTrails.splice(i, 1); continue; }
    const sec = Math.floor(f.t);
    enemies.forEach(e => {
      if (e.dead || e.hp <= 0) return;
      const dist = Math.hypot(e.x - f.x, e.y - f.y);
      if (dist < S.cellSize * 0.4) {
        const hitKey = e.id + '_' + sec;
        if (!f.hitSet[hitKey]) {
          f.hitSet[hitKey] = true;
          e.hp -= f.dmg;
          e.burning = Math.max(e.burning || 0, 1.0);
          S.floats.push({ x: e.x + (Math.random()-0.5)*6, y: e.y - 10, t: 0, txt: '🔥' + Math.round(f.dmg), color: '#ff6a2a' });
        }
      }
    });
  }
}

function tryRiderSkills(rider, targets, mainTarget, killed) {
  if (rider.dead) return;
  const enemies = S.enemies.filter(e => !e.dead && e.hp > 0);
  const aliveTargets = targets.filter(e => !e.dead && e.hp > 0);

  _applyFireTrail(rider);

  if (aliveTargets.length >= 3 && rider.skills.whirlwind <= 0) {
    rider.skills.whirlwind = RIDER_SKILLS.whirlwind.cd;
    const dmg = rider.atk * 1.5;
    aliveTargets.forEach(e => { e.hp -= dmg;
      S.floats.push({ x: e.x + (Math.random()-0.5)*10, y: e.y - 14, t: 0, txt: '🌀' + Math.round(dmg), color: '#ff66ff' }); });
    S.fx.push({ type: 'whirlwind', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 1.5, dur: 0.6 });
    S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '🌀 旋风斩!', color: '#ff66ff', big: true });
    rider.lastSkill = 'whirlwind'; rider.lastSkillT = 0;
  }

  if (rider.history.length >= 4 && aliveTargets.length > 0 && rider.skills.trample <= 0) {
    rider.skills.trample = RIDER_SKILLS.trample.cd;
    const dmg = rider.atk * 1.2;
    enemies.forEach(e => {
      const egx = Math.round((e.x - S.heartX) / S.cellSize);
      const egy = Math.round((e.y - S.heartY) / S.cellSize);
      if (manhattan(rider.cx, rider.cy, egx, egy) <= 2) {
        e.hp -= dmg; e.knockback = 0.3;
        e.knockbackX = (e.x - rider.px) * 0.3;
        e.knockbackY = (e.y - rider.py) * 0.3;
        S.floats.push({ x: e.x, y: e.y - 12, t: 0, txt: '💥' + Math.round(dmg), color: '#ffaa44' });
      }
    });
    for (let i = 0; i < 3; i++) setTimeout(() => {
      S.fx.push({ type: 'shockwave', x: rider.px, y: rider.py, t: 0, r: S.cellSize * (1 + i * 0.5), dur: 0.4 });
    }, i * 60);
    S.shake = Math.max(S.shake, 8);
    S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '💥 践踏震波!', color: '#ffaa44', big: true });
    rider.lastSkill = 'trample'; rider.lastSkillT = 0;
  }

  if (rider.history.length >= 6 && rider.skills.charge <= 0) {
    const dx = rider.cx - rider.history[0].x, dy = rider.cy - rider.history[0].y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len >= 5.5) {
      const dirX = dx/len, dirY = dy/len;
      let pierceTargets = [];
      for (let i = 1; i <= 5; i++) {
        const cx = Math.round(rider.cx + dirX * i), cy = Math.round(rider.cy + dirY * i);
        enemies.forEach(e => {
          const egx = Math.round((e.x - S.heartX) / S.cellSize);
          const egy = Math.round((e.y - S.heartY) / S.cellSize);
          if (manhattan(egx, egy, cx, cy) <= 1 && !pierceTargets.includes(e)) pierceTargets.push(e);
        });
      }
      if (pierceTargets.length > 0) {
        rider.skills.charge = RIDER_SKILLS.charge.cd;
        const dmg = rider.atk * 2.2;
        pierceTargets.forEach(e => { e.hp -= dmg; e.pierceStun = 0.5;
          S.floats.push({ x: e.x, y: e.y - 14, t: 0, txt: '🏹' + Math.round(dmg), color: '#ff4488' }); });
        S.fx.push({ type: 'pierce', x: rider.px, y: rider.py, t: 0, dirX, dirY, len: S.cellSize * 5, dur: 0.5 });
        S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '🏹 贯穿突刺!', color: '#ff4488', big: true });
        rider.lastSkill = 'charge'; rider.lastSkillT = 0;
      }
    }
  }

  if (killed && mainTarget && rider.skills.chain <= 0) {
    const chainTargets = enemies.filter(e => e !== mainTarget && !e.dead &&
      Math.hypot(e.x - mainTarget.x, e.y - mainTarget.y) < S.cellSize * 3).slice(0, 3);
    if (chainTargets.length > 0) {
      rider.skills.chain = RIDER_SKILLS.chain.cd;
      let prev = { x: mainTarget.x, y: mainTarget.y };
      chainTargets.forEach((e, idx) => {
        const dmg = rider.atk * 0.8 * Math.pow(0.8, idx);
        e.hp -= dmg;
        S.fx.push({ type: 'lightning', x: prev.x, y: prev.y, t: 0, tx: e.x, ty: e.y, dur: 0.25 });
        S.floats.push({ x: e.x, y: e.y - 12, t: 0, txt: '⚡' + Math.round(dmg), color: '#ffee66' });
        prev = { x: e.x, y: e.y };
      });
      S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '⚡ 连环闪电!', color: '#ffee66', big: true });
      rider.lastSkill = 'chain'; rider.lastSkillT = 0;
    }
  }

  if (rider.skills.rally <= 0) {
    let friendlies = 0;
    S.cells.forEach(c => { if (!c.unit) return;
      const d = manhattan(rider.cx, rider.cy, c.gc, c.gr);
      if (d <= 2 && d > 0) friendlies++; });
    if (friendlies >= 2) {
      rider.skills.rally = RIDER_SKILLS.rally.cd;
      rider.buffs.rallyAura = 5;
      S.cells.forEach(c => { if (!c.unit) return;
        const d = manhattan(rider.cx, rider.cy, c.gc, c.gr);
        if (d <= 3) { c.unit.rallyBuff = 5; c.unit.rallySpeedBuff = 5;
          S.fx.push({ type: 'rally', x: c.px, y: c.py, t: 0, r: S.cellSize * 0.5, dur: 0.8 }); } });
      rider.buffs.speedUp = Math.max(rider.buffs.speedUp || 0, 3);
      for (let i = 0; i < 3; i++) setTimeout(() => {
        S.fx.push({ type: 'rally', x: rider.px, y: rider.py, t: 0, r: S.cellSize * (0.8 + i * 0.5), dur: 0.6 });
      }, i * 80);
      S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '📯 集结号角!', color: '#ffdd44', big: true });
      rider.lastSkill = 'rally'; rider.lastSkillT = 0;
    }
  }

  if (rider.skills.heal <= 0) {
    let needHeal = false;
    S.cells.forEach(c => { if (!c.unit) return;
      const d = manhattan(rider.cx, rider.cy, c.gc, c.gr);
      if (d <= 2 && d > 0 && c.unit.hp < c.unit.maxHp * 0.6) needHeal = true; });
    if (needHeal || S.heartHp < S.heartMax * 0.6) {
      rider.skills.heal = RIDER_SKILLS.heal.cd;
      rider.buffs.healing = 4;
      S.cells.forEach(c => { if (!c.unit) return;
        const d = manhattan(rider.cx, rider.cy, c.gc, c.gr);
        if (d <= 2) { c.unit.hp = Math.min(c.unit.maxHp, c.unit.hp + c.unit.maxHp * 0.25);
          S.fx.push({ type: 'heal', x: c.px, y: c.py, t: 0, dur: 0.6 }); } });
      if (S.heartHp < S.heartMax) S.heartHp = Math.min(S.heartMax, S.heartHp + S.heartMax * 0.1);
      for (let i = 0; i < 4; i++) setTimeout(() => {
        S.fx.push({ type: 'heal', x: rider.px, y: rider.py, t: 0, dur: 0.5 });
      }, i * 100);
      S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '💚 治愈光环!', color: '#44ff88', big: true });
      rider.lastSkill = 'heal'; rider.lastSkillT = 0;
    }
  }

  if (rider.skills.thunder <= 0) {
    const eliteTarget = enemies.find(e => e.elite || e.boss);
    if (eliteTarget) {
      rider.skills.thunder = RIDER_SKILLS.thunder.cd;
      const dmg = rider.atk * 5.0;
      eliteTarget.hp -= dmg; eliteTarget.stun = 1.0;
      S.fx.push({ type: 'thunder', x: eliteTarget.x, y: eliteTarget.y, t: 0, r: eliteTarget.r || 20, dur: 0.8 });
      S.fx.push({ type: 'ring', x: eliteTarget.x, y: eliteTarget.y, t: 0, r: (eliteTarget.r || 20) * 3, color: '#ffdd00', dur: 0.6 });
      S.shake = Math.max(S.shake, 14);
      S.floats.push({ x: eliteTarget.x, y: eliteTarget.y - 24, t: 0, txt: '🌩️' + Math.round(dmg), color: '#ffdd00', big: true });
      S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '🌩️ 雷霆一击!', color: '#ffdd00', big: true });
      rider.lastSkill = 'thunder'; rider.lastSkillT = 0;
    }
  }
}

/* ============ 镜魂充能系统 ============
 * 骑马单位路过有单位的格子时，给可生成镜像的兵种充能。
 * 充能进度从绿→黄→红，充满后生成一个镜像出战，充能重置。
 * 只有合成单位(combo)或特殊兵种(武械栏)才能充能。
 */

/* 骑马踩踏格子时给单位充能 */
function chargeMirrorUnit(rider) {
  if (rider.dead) return;
  if (!S.riderMirrors) S.riderMirrors = [];

  const cell = S.cells.find(c => c.gc === rider.cx && c.gr === rider.cy);
  if (!cell || !cell.unit) return;

  const u = cell.unit;
  if (!canMirrorUnit(u)) return;

  // 充能递增：每次踩踏 +15，等级越高充能越快
  const gain = 15 + (rider.level * 3) + (u.lv * 2);
  u.charge = Math.min(u.maxCharge || MIRROR_CHARGE_MAX, (u.charge || 0) + gain);

  // 充能满 → 生成镜像
  if (u.charge >= (u.maxCharge || MIRROR_CHARGE_MAX)) {
    const maxMirrors = 8;
    if (S.riderMirrors.length < maxMirrors) {
      const mirror = makeMirror(u, cell.px, cell.py, true);
      S.riderMirrors.push(mirror);
      S.fx.push({ type: 'rally', x: cell.px, y: cell.py, t: 0, r: S.cellSize * 0.6, dur: 0.5, color: '#88ddff' });
      S.floats.push({ x: cell.px, y: cell.py - 28, t: 0, txt: '✨镜魂!', color: '#aaddff', big: true });
    }
    u.charge = 0; // 重置充能
  } else {
    // 充能进度飘字（偶尔显示）
    if (Math.random() < 0.3) {
      const ratio = u.charge / (u.maxCharge || MIRROR_CHARGE_MAX);
      S.floats.push({ x: cell.px + 20, y: cell.py - 10, t: 0, txt: '+' + gain, color: ratio > 0.6 ? '#ff8844' : (ratio > 0.3 ? '#f4c95d' : '#4ade80'), small: true });
    }
  }
}

/* ============ 特殊格子触发 ============
 * 骑马单位路过特殊格子时触发对应增益：
 *   speed → 3秒移速+40%
 *   rage  → 3秒攻击+50%
 *   heal  → 恢复骑手20%生命
 */
function trySpecialCell(rider) {
  if (rider.dead) return;
  const cell = S.cells.find(c => c.gc === rider.cx && c.gr === rider.cy);
  if (!cell || !cell.special) return;

  const type = cell.special;
  if (type === 'speed') {
    rider.buffs.speedUp = Math.max(rider.buffs.speedUp || 0, 3);
    S.fx.push({ type: 'rally', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 0.5, dur: 0.5, color: '#4fc07a' });
    S.floats.push({ x: rider.px, y: rider.py - 28, t: 0, txt: '🌬️加速!', color: '#4fc07a', big: true });
  } else if (type === 'rage') {
    rider.buffs.berserk = Math.max(rider.buffs.berserk || 0, 3);
    S.fx.push({ type: 'rally', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 0.5, dur: 0.5, color: '#ff6a4a' });
    S.floats.push({ x: rider.px, y: rider.py - 28, t: 0, txt: '🔥狂暴!', color: '#ff6a4a', big: true });
  } else if (type === 'heal') {
    const before = rider.hp;
    rider.hp = Math.min(rider.maxHp, rider.hp + rider.maxHp * 0.2);
    const healed = Math.round(rider.hp - before);
    S.fx.push({ type: 'heal', x: rider.px, y: rider.py, t: 0, color: '#66ddff' });
    S.floats.push({ x: rider.px, y: rider.py - 28, t: 0, txt: '💚+' + healed, color: '#66ddff', big: true });
  }
}

function makeMirror(unit, x, y, fromCombo) {
  const d = UNITS[unit.ch];
  const m = Math.pow(1.5, unit.lv - 1);
  const comboName = unit.combo ? (d.combo || null) : null;
  const hpRatio = fromCombo ? 0.5 : 0.6;   // 合成镜像HP 50%，骑马召唤60%
  const atkRatio = fromCombo ? 0.6 : 0.7;  // 合成镜像ATK 60%，骑马召唤70%
  return {
    type: 'mirror',
    ch: unit.ch,
    lv: unit.lv,
    combo: unit.combo,
    comboName: comboName,
    fromCombo: !!fromCombo,
    x: x,
    y: y,
    hp: d.hp * m * hpRatio,
    maxHp: d.hp * m * hpRatio,
    atk: d.atk * m * atkRatio,
    range: d.range,
    aspd: d.aspd * 1.2,
    cd: 0,
    lifetime: fromCombo ? 12 : 8,
    maxLifetime: fromCombo ? 12 : 8,
    target: null,
    dead: false,
    color: d.color || '#88ddff',
    skillCd: 0,
    r: 14,
  };
}

/* 更新所有镜像单位 */
function updateMirrors(dt) {
  if (!S.riderMirrors) S.riderMirrors = [];
  const frameDt = dt * 60;

  S.riderMirrors.forEach(m => {
    if (m.dead) return;

    m.lifetime -= dt;
    if (m.lifetime <= 0) {
      m.dead = true;
      S.fx.push({ type: 'ring', x: m.x, y: m.y, t: 0, r: 12, color: m.color, dur: 0.3 });
      return;
    }

    if (m.cd > 0) m.cd -= dt;
    if (m.skillCd > 0) m.skillCd -= dt;

    const enemies = S.enemies.filter(e => !e.dead && e.hp > 0);
    if (enemies.length === 0) return;

    let best = null, bestDist = Infinity;
    enemies.forEach(e => {
      const d = Math.hypot(e.x - m.x, e.y - m.y);
      if (d < bestDist) { bestDist = d; best = e; }
    });
    if (!best) return;

    const rangePx = m.range * S.cellSize;

    if (bestDist > rangePx) {
      const spd = (80 + m.lv * 10) * dt;
      const dx = best.x - m.x, dy = best.y - m.y;
      const d = Math.hypot(dx, dy);
      if (d > 0) {
        m.x += (dx / d) * spd;
        m.y += (dy / d) * spd;
      }
    } else if (m.cd <= 0) {
      m.cd = 1 / m.aspd;
      // ===== 镜像享有技能 =====
      mirrorAttack(m, best, enemies);
    }
  });

  S.riderMirrors = S.riderMirrors.filter(m => !m.dead);
}

/* 镜像攻击逻辑：享有原单位技能 */
function mirrorAttack(m, target, enemies) {
  const comboName = m.comboName;
  let dmg = m.atk;
  let hitFx = 'slash';
  let hitColor = m.color;
  let killed = false;

  // ===== 悟空combo：25%概率范围横扫+击飞 =====
  if (comboName === '悟空' && Math.random() < 0.25) {
    const smashDmg = m.atk * 1.8;
    const smashR = S.cellSize * 1.2;
    enemies.forEach(e => {
      if (e.dead) return;
      const d = Math.hypot(e.x - target.x, e.y - target.y);
      if (d < smashR) {
        e.hp -= smashDmg * (1 - d / smashR * 0.4);
        e.knockback = 0.4;
        e.knockbackX = (e.x - target.x) * 0.5;
        e.knockbackY = (e.y - target.y) * 0.5;
        S.floats.push({ x: e.x, y: e.y - 14, t: 0, txt: '🍭' + Math.round(smashDmg), color: '#ff8c00' });
      }
    });
    S.fx.push({ type: 'combo_monkey', x: target.x, y: target.y, t: 0, r: smashR, dur: 0.5 });
    S.floats.push({ x: m.x, y: m.y - 24, t: 0, txt: '🐵横扫!', color: '#ff8c00', big: true });
    if (target.hp <= 0 && !target.dead) { target.dead = true; killed = true; }
    return;
  }

  // ===== 八戒combo：扇形横扫+吸血 =====
  if (comboName === '八戒') {
    const fanDmg = m.atk * 1.3;
    const fanR = S.cellSize * 1.3;
    const ang = Math.atan2(target.y - m.y, target.x - m.x);
    let totalDmg = 0, hit = 0;
    enemies.forEach(e => {
      if (e.dead) return;
      const d = Math.hypot(e.x - m.x, e.y - m.y);
      if (d < fanR) {
        const ea = Math.atan2(e.y - m.y, e.x - m.x);
        let diff = Math.abs(ea - ang);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < Math.PI * 0.35) {
          e.hp -= fanDmg; hit++; totalDmg += fanDmg;
          S.floats.push({ x: e.x, y: e.y - 12, t: 0, txt: '🥬' + Math.round(fanDmg), color: '#4682b4' });
          if (e.hp <= 0 && !e.dead) { e.dead = true; killed = true; }
        }
      }
    });
    if (hit > 0) {
      m.hp = Math.min(m.maxHp, m.hp + totalDmg * 0.25);
      S.fx.push({ type: 'combo_pig', x: m.x, y: m.y, t: 0, ang: ang, r: fanR, dur: 0.4 });
    }
    return;
  }

  // ===== 子牙combo：打神鞭定身 =====
  if (comboName === '子牙' && m.skillCd <= 0) {
    m.skillCd = 8.0;
    const whipDmg = m.atk * 2.5;
    enemies.forEach(e => {
      if (e.dead) return;
      if (Math.hypot(e.x - m.x, e.y - m.y) < S.cellSize * 3) {
        e.hp -= whipDmg;
        e.root = Math.max(e.root || 0, 1.5);
        S.floats.push({ x: e.x, y: e.y - 16, t: 0, txt: '⚡' + Math.round(whipDmg), color: '#daa520' });
        S.fx.push({ type: 'combo_whip', x: e.x, y: e.y, t: 0, dur: 0.5 });
        if (e.hp <= 0 && !e.dead) { e.dead = true; killed = true; }
      }
    });
    S.floats.push({ x: m.x, y: m.y - 24, t: 0, txt: '📜打神鞭!', color: '#daa520', big: true });
    return;
  }

  // ===== 神·战神：克制妖属性，1.8倍伤害 =====
  if (UNITS[m.ch] && UNITS[m.ch].counter === '妖') {
    if (target.ch === '妖') {
      dmg = m.atk * 1.8;
      hitColor = '#fbbf24';
      S.floats.push({ x: target.x, y: target.y - 16, t: 0, txt: '⚔️克制!', color: '#fbbf24', big: true });
    }
  }

  // ===== 退·力士：击退敌人 =====
  if (UNITS[m.ch] && UNITS[m.ch].knockback) {
    target.knockback = 0.5;
    target.knockbackX = (target.x - m.x) * 0.6;
    target.knockbackY = (target.y - m.y) * 0.6;
    S.fx.push({ type: 'knockback', x: target.x, y: target.y, t: 0, dur: 0.4 });
    hitColor = '#60a5fa';
  }

  // ===== 娥·嫦娥：月光弹道 =====
  if (UNITS[m.ch] && UNITS[m.ch].moonlight) {
    S.shots.push({ x: m.x, y: m.y, tx: target.x, ty: target.y, tg: target, dmg: dmg, splash: 0, t: 0, color: '#c8b6ff' });
    return;
  }

  // 普通攻击
  target.hp -= dmg;
  S.floats.push({ x: target.x, y: target.y - 10, t: 0, txt: Math.round(dmg), color: hitColor });
  S.fx.push({ type: hitFx, x: target.x, y: target.y, t: 0 });

  if (target.hp <= 0 && !target.dead) {
    target.dead = true;
    killed = true;
  }

  // 击杀处理
  if (killed) {
    S.waveKilled++;
    let g = (ENEMY_DEFS[target.ch] && ENEMY_DEFS[target.ch].gold) || 1;
    // 豪·财神：额外金币
    if (UNITS[m.ch] && UNITS[m.ch].goldDrop) {
      g += Math.floor(Math.random() * 3) + 2;
    }
    S.gold += g;
    S.floats.push({ x: target.x, y: target.y - 22, t: 0, txt: '+' + g + '💰', color: '#f4c95d' });
    S.fx.push({ type: 'ring', x: target.x, y: target.y, t: 0, r: target.r || 15, color: (ENEMY_DEFS[target.ch] && ENEMY_DEFS[target.ch].color) || '#fff' });
  }
}

/* 渲染镜像单位 */
function drawMirrors(ctx) {
  if (!S.riderMirrors) return;
  S.riderMirrors.forEach(m => {
    ctx.save();
    ctx.translate(m.x, m.y);

    // 合成镜像有光环
    if (m.fromCombo) {
      ctx.fillStyle = 'rgba(136, 221, 255, 0.12)';
      ctx.beginPath(); ctx.arc(0, 0, S.cellSize * 0.4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.globalAlpha = 0.55 + Math.sin(S.time * 6 + m.x) * 0.15;
    const size = S.cellSize * 0.45;

    // 镜像外框（合成镜像用金色框）
    if (m.combo) {
      ctx.strokeStyle = 'rgba(201, 168, 46, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = m.color;
    ctx.font = `900 ${size}px "STKaiti","KaiTi","楷体","PingFang SC",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 描边
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(m.ch, 0, 0);
    ctx.fillText(m.ch, 0, 0);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeText(m.ch, 0, 0);

    ctx.globalAlpha = 1;

    // 血条
    const hpRatio = m.hp / m.maxHp;
    const barW = size * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-barW/2, -size * 0.9, barW, 4);
    ctx.fillStyle = hpRatio > 0.5 ? '#4ade80' : (hpRatio > 0.25 ? '#facc15' : '#ef4444');
    ctx.fillRect(-barW/2, -size * 0.9, barW * hpRatio, 4);

    // 寿命条
    const lifeRatio = m.lifetime / m.maxLifetime;
    ctx.fillStyle = 'rgba(136, 221, 255, 0.6)';
    ctx.fillRect(-barW/2, -size * 0.9 - 5, barW * lifeRatio, 2);

    // 合成镜像显示技能标识
    if (m.combo && m.comboName) {
      ctx.font = `${size * 0.35}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(201, 168, 46, 0.8)';
      const icons = { '悟空':'🐵', '八戒':'🐷', '唐僧':'☀️', '沙僧':'🛡️', '子牙':'📜', '公豹':'👿' };
      ctx.fillText(icons[m.comboName] || '✨', 0, -size * 0.7);
    }

    ctx.restore();
  });
}

/* ============ 主更新：每帧调用 ============
 *
 * 流程：
 *   1. progress += speed
 *   2. 如果 progress >= 1 → 到达目标格
 *      a. 更新逻辑坐标
 *      b. 攻击判定
 *      c. 立即选下一格 → progress 重置为 0
 *   3. 根据 progress 插值像素坐标
 *   4. 更新动画相位
 */
function updateRiders(dt) {
  if (!S.riders || S.riders.length === 0) return;

  // dt 转帧数（以60fps为基准）
  const frameDt = dt * 60;

  S.riders.forEach(rider => {
    // 死亡的骑手只更新重生倒计时，不参与战斗/移动
    if (rider.dead) {
      rider.respawnT -= dt;
      if (rider.respawnT <= 0) respawnRider(rider);
      return;
    }

    // 攻击闪光衰减
    if (rider.attackFlash > 0) rider.attackFlash -= frameDt;

    // ===== 技能冷却 & 增益计时 =====
    if (rider.skills) {
      for (const k in rider.skills) {
        if (rider.skills[k] > 0) rider.skills[k] -= dt;
      }
    }
    if (rider.buffs) {
      if (rider.buffs.berserk > 0) rider.buffs.berserk -= dt;
      if (rider.buffs.rallyAura > 0) rider.buffs.rallyAura -= dt;
      if (rider.buffs.leaping > 0) rider.buffs.leaping -= dt;
      if (rider.buffs.healing > 0) rider.buffs.healing -= dt;
      if (rider.buffs.invincible > 0) rider.buffs.invincible -= dt;
      if (rider.buffs.speedUp > 0) rider.buffs.speedUp -= dt;
    }
    if (rider.lastSkillT !== undefined) rider.lastSkillT += dt;

    // 治愈光环：持续治疗周围友军和心
    if (rider.buffs && rider.buffs.healing > 0) {
      const healAmount = rider.maxHp * 0.015 * dt;
      S.cells.forEach(c => {
        if (!c.unit) return;
        const d = manhattan(rider.cx, rider.cy, c.gc, c.gr);
        if (d <= 2) {
          c.unit.hp = Math.min(c.unit.maxHp, c.unit.hp + healAmount);
        }
      });
      S.heartHp = Math.min(S.heartMax, S.heartHp + healAmount * 0.5);
    }

    // 移动速度计算（狂暴+加速buff）
    let speedMul = 1;
    if (rider.buffs) {
      if (rider.buffs.berserk > 0) speedMul *= 1.3;
      if (rider.buffs.speedUp > 0) speedMul *= 1.2;
    }
    // progress 推进
    rider.progress += rider.speed * speedMul * frameDt / 60;

    // 到达目标格
    while (rider.progress >= 1) {
      rider.progress -= 1;

      // 更新逻辑位置
      rider.fromX = rider.cx;
      rider.fromY = rider.cy;
      rider.cx = rider.toX;
      rider.cy = rider.toY;

      // 记录历史（用于残影和冲锋距离计算）
      rider.history.push({ x: rider.cx, y: rider.cy });
      if (rider.history.length > 8) rider.history.shift();

      // 到达格子 → 攻击判定
      onArriveCell(rider);

      // 特殊格子触发
      trySpecialCell(rider);

      // 立即选下一格（不停顿！）
      const next = pickNextCell(rider);
      rider.toX = next.x;
      rider.toY = next.y;
    }

    // 像素坐标插值
    const a = gridToPixel(rider.fromX, rider.fromY);
    const b = gridToPixel(rider.toX, rider.toY);
    const t = smoothstep(rider.progress);
    rider.px = a.x + (b.x - a.x) * t;
    rider.py = a.y + (b.y - a.y) * t;

    // 飞跃弧线：leaping 状态下抛物线抬高
    if (rider.buffs && rider.buffs.leaping > 0) {
      const leapProg = 1 - rider.buffs.leaping / 0.4;
      rider.py -= Math.sin(leapProg * Math.PI) * S.cellSize * 0.6;
    }

    // 朝向
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx !== 0 || dy !== 0) {
      rider.facing = Math.atan2(dy, dx);
    }

    // 跑步动画相位（狂暴时摆动更快）
    rider.runPhase += frameDt * 0.35 * speedMul;

    // 死亡检查 → 进入重生倒计时（永久存在，不会真正消失）
    if (rider.hp <= 0 && !rider.dead) {
      rider.dead = true;
      rider.respawnT = 3; // 3秒后在心附近重生
      S.fx.push({ type: 'ring', x: rider.px, y: rider.py, t: 0, r: 30, color: '#c9483c' });
      S.floats.push({ x: rider.px, y: rider.py - 20, t: 0, txt: '🐴💀 3秒后重生', color: '#ff6a6a', big: true });
    }
  });

  S.riders = S.riders.filter(r => !r.removed);
}

/* ============ 骑马单位重生 ============
 * 骑马单位永久存在：死亡后在心附近找一个格子重生。
 * 重生时恢复满血，保留等级与技能冷却。
 */
function respawnRider(rider) {
  // 找一个离心最近的可用格子（不与静态单位重叠）
  const occupied = new Set();
  S.cells.forEach(c => { if (c.unit) occupied.add(c.gc + ',' + c.gr); });
  // 优先选择心周围的空格
  let slot = null;
  let bestDist = Infinity;
  S.cells.forEach(c => {
    if (occupied.has(c.gc + ',' + c.gr)) return;
    const d = Math.abs(c.gc - 0) + Math.abs(c.gr - 0); // 离心（0,0）的曼哈顿距离
    if (d < bestDist) { bestDist = d; slot = c; }
  });
  if (!slot) slot = S.cells[0]; // 兜底

  rider.cx = slot.gc;
  rider.cy = slot.gr;
  rider.fromX = slot.gc;
  rider.fromY = slot.gr;
  rider.toX = slot.gc;
  rider.toY = slot.gr;
  rider.progress = 0;
  rider.px = slot.px;
  rider.py = slot.py;
  rider.hp = rider.maxHp;
  rider.dead = false;
  rider.respawnT = 0;
  rider.history = [{ x: rider.cx, y: rider.cy }];
  rider.buffs = { berserk: 0, rallyAura: 0, leaping: 0 };
  // 重置技能冷却
  for (const k in rider.skills) rider.skills[k] = 0;
  // 立即选下一格
  const next = pickNextCell(rider);
  rider.toX = next.x;
  rider.toY = next.y;

  S.fx.push({ type: 'ring', x: slot.px, y: slot.py, t: 0, r: 28, color: '#ffd76a' });
  S.fx.push({ type: 'rally', x: slot.px, y: slot.py, t: 0, r: S.cellSize * 0.8, dur: 0.6 });
  S.floats.push({ x: slot.px, y: slot.py - 24, t: 0, txt: '🐴 重生!', color: '#ffd76a', big: true });
}

// smoothstep 缓动（让启停更自然）
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/* ============ 渲染 ============
 * 关键：马在跑的时候要有"人骑马"的完整形象
 *   - 马身（棕/暗棕渐变）
 *   - 马头（朝向移动方向）
 *   - 马鬃（飘动）
 *   - 马尾（飘动）
 *   - 马腿（四腿交替摆动 → 跑步动画）
 *   - 骑手（上半身+头+武器）
 */
function drawRiders(ctx) {
  if (!S.riders) return;

  S.riders.forEach(rider => {
    const c = RIDER_CFG.colors;
    ctx.save();
    ctx.translate(rider.px, rider.py);
    ctx.rotate(rider.facing);

    // 残影（用 history 里的格子坐标）
    if (rider.history.length >= 2) {
      for (let i = 0; i < rider.history.length - 1; i++) {
        const h = rider.history[i];
        const age = i / rider.history.length; // 0=最老
        const alpha = (1 - age) * 0.18;
        const hpx = gridToPixel(h.x, h.y);
        // 近似朝向
        const next = rider.history[i+1];
        const ang = Math.atan2((next.y-h.y)*S.cellSize, (next.x-h.x)*S.cellSize);
        ctx.save();
        ctx.translate(hpx.x - rider.px, hpx.y - rider.py);
        ctx.rotate(ang);
        ctx.globalAlpha = alpha;
        drawHorseFigure(ctx, c, 0.55, rider.runPhase * 0.5);
        ctx.restore();
      }
    }

    // 冲锋光晕
    if (rider.history.length > 3) {
      ctx.shadowColor = c.charge;
      ctx.shadowBlur = 10 + Math.sin(rider.runPhase * 2) * 4;
    }

    // ===== 狂暴红光（berserk 激活时） =====
    if (rider.buffs && rider.buffs.berserk > 0) {
      const pulse = 0.6 + Math.sin(rider.runPhase * 4) * 0.25;
      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 18 * pulse;
      // 红色光环
      ctx.fillStyle = `rgba(255,60,60,${0.18 * pulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, S.cellSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ===== 集结金光（rallyAura 激活时） =====
    if (rider.buffs && rider.buffs.rallyAura > 0) {
      const pulse = 0.5 + Math.sin(rider.runPhase * 3) * 0.2;
      ctx.fillStyle = `rgba(255,221,68,${0.15 * pulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, S.cellSize * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // 主绘制
    drawHorseFigure(ctx, c, 1.0, rider.runPhase);

    // 攻击闪光
    if (rider.attackFlash > 0) {
      ctx.fillStyle = 'rgba(255,184,79,0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, S.cellSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // ---- 不随旋转的部分 ----
    ctx.save();
    ctx.translate(rider.px, rider.py);

    // 等级标识
    ctx.fillStyle = '#ffd76a';
    ctx.font = `900 ${S.cellSize * 0.16}px "PingFang SC",sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Lv' + rider.level, 0, -S.cellSize * 0.38);

    // 冲锋距离标识
    if (rider.history.length > 3) {
      ctx.fillStyle = c.charge;
      ctx.font = `800 ${S.cellSize * 0.13}px sans-serif`;
      ctx.fillText('⚡×' + rider.history.length, 0, S.cellSize * 0.36);
    }

    // 最近技能标识（3秒内显示）
    if (rider.lastSkill && RIDER_SKILLS[rider.lastSkill] && rider.lastSkillT < 3) {
      const sk = RIDER_SKILLS[rider.lastSkill];
      const alpha = Math.max(0, 1 - rider.lastSkillT / 3);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = sk.color;
      ctx.font = `900 ${S.cellSize * 0.14}px "PingFang SC",sans-serif`;
      ctx.fillText(sk.name, 0, S.cellSize * 0.52);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // 血条
    const hpw = S.cellSize * 0.65;
    const ratio = Math.max(0, rider.hp / rider.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(rider.px - hpw/2, rider.py - S.cellSize * 0.46, hpw, 3);
    ctx.fillStyle = ratio > 0.4 ? '#4fc07a' : '#e05a5a';
    ctx.fillRect(rider.px - hpw/2, rider.py - S.cellSize * 0.46, hpw * ratio, 3);
  });
}

/* 画一匹正在奔跑的马 + 骑手 */
function drawHorseFigure(ctx, c, scale, phase) {
  const s = scale;
  const legWave = Math.sin(phase) * 7 * s;     // 前后腿摆动
  const legWave2 = Math.sin(phase + Math.PI) * 7 * s; // 另一条腿反相
  const bounce = Math.abs(Math.sin(phase)) * 2 * s;    // 上下颠簸

  ctx.save();
  ctx.translate(0, -bounce);

  // ---- 马尾（飘在身后） ----
  ctx.strokeStyle = c.tail;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14*s, -2*s);
  ctx.quadraticCurveTo(-22*s, -8*s + Math.sin(phase*0.7)*3, -26*s, 2*s + Math.sin(phase*0.5)*4);
  ctx.stroke();

  // ---- 马腿（4条） ----
  ctx.strokeStyle = c.body;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  // 前左
  ctx.beginPath(); ctx.moveTo(-6*s, 6*s); ctx.lineTo(-10*s, 16*s + legWave); ctx.stroke();
  // 前右
  ctx.beginPath(); ctx.moveTo(2*s, 6*s); ctx.lineTo(6*s, 16*s + legWave2); ctx.stroke();
  // 后左
  ctx.beginPath(); ctx.moveTo(-2*s, 6*s); ctx.lineTo(-6*s, 16*s + legWave2); ctx.stroke();
  // 后右
  ctx.beginPath(); ctx.moveTo(6*s, 6*s); ctx.lineTo(10*s, 16*s + legWave); ctx.stroke();

  // ---- 马身（椭圆渐变） ----
  const bodyGrad = ctx.createLinearGradient(0, -6*s, 0, 8*s);
  bodyGrad.addColorStop(0, c.bodyLt);
  bodyGrad.addColorStop(1, c.body);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16*s, 9*s, 0, 0, Math.PI * 2);
  ctx.fill();

  // 马身轮廓
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16*s, 9*s, 0, 0, Math.PI * 2);
  ctx.stroke();

  // ---- 马头 ----
  ctx.fillStyle = c.bodyLt;
  ctx.beginPath();
  ctx.ellipse(15*s, -5*s, 8*s, 6*s, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1 * s;
  ctx.stroke();

  // 耳朵
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.moveTo(19*s, -10*s); ctx.lineTo(22*s, -14*s); ctx.lineTo(16*s, -9*s); ctx.closePath();
  ctx.fill();

  // 眼睛
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(17*s, -6*s, 1.8*s, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(17.5*s, -5.5*s, 0.9*s, 0, Math.PI*2); ctx.fill();

  // ---- 马鬃（飘动） ----
  ctx.fillStyle = c.mane;
  const maneOff = Math.sin(phase * 1.3) * 2;
  ctx.beginPath();
  ctx.moveTo(8*s, -8*s);
  ctx.quadraticCurveTo(4*s, -14*s + maneOff, -2*s, -10*s);
  ctx.quadraticCurveTo(2*s, -12*s - maneOff, -6*s, -6*s);
  ctx.closePath();
  ctx.fill();

  // ---- 缰绳 ----
  ctx.strokeStyle = '#8a6a30';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(14*s, -2*s); ctx.lineTo(6*s, -14*s); ctx.stroke();

  // ---- 骑手 ----
  // 身体
  ctx.fillStyle = c.rider;
  ctx.beginPath();
  ctx.roundRect(2*s, -16*s, 8*s, 12*s, 3*s);
  ctx.fill();
  // 披风
  ctx.fillStyle = '#7a1a1a';
  ctx.beginPath();
  ctx.moveTo(2*s, -16*s);
  ctx.lineTo(-4*s, -10*s + Math.sin(phase*0.8)*2);
  ctx.lineTo(-2*s, -6*s);
  ctx.lineTo(4*s, -10*s);
  ctx.closePath();
  ctx.fill();

  // 头
  ctx.fillStyle = c.riderSkin;
  ctx.beginPath();
  ctx.arc(6*s, -20*s, 4.5*s, 0, Math.PI * 2);
  ctx.fill();
  // 头盔
  ctx.fillStyle = '#5a4a30';
  ctx.beginPath();
  ctx.arc(6*s, -21*s, 5*s, Math.PI, Math.PI * 2);
  ctx.fill();
  // 翎毛
  ctx.strokeStyle = '#ffb84f';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(6*s, -25*s); ctx.lineTo(6*s + Math.sin(phase*2)*2, -30*s); ctx.stroke();

  // 手臂 + 武器（长枪）
  ctx.save();
  ctx.translate(8*s, -14*s);
  ctx.rotate(Math.sin(phase * 0.5) * 0.15); // 轻微晃动
  // 枪杆
  ctx.strokeStyle = '#8a6a30';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(20*s, -8*s); ctx.stroke();
  // 枪尖
  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  ctx.moveTo(20*s, -8*s);
  ctx.lineTo(26*s, -12*s);
  ctx.lineTo(22*s, -4*s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore(); // end bounce
}

/* ============ 关卡规则 → 骑术能力 ============ */
function applyRiderRules(rider) {
  if (!rider) return;
  const lv = LEVELS.find(l => l.id === S.level);
  if (!lv || !lv.rule) return;

  switch (lv.rule.type) {
    case 'rider_charge_x2':
      rider.chargeBonusMul = (rider.chargeBonusMul || 1) * 2;
      break;
    case 'rider_jump':
      rider.canLeap = true;
      break;
    case 'dual_lane_rider':
      rider.canCrossLane = true;
      break;
    case 'rider_only':
      rider.chainCount = 2;
      break;
    case 'long_charge':
      rider.speed *= 1.3; // 跑更快
      break;
  }
}

// 暴露给 game.js
(globalThis || window).applyRiderRules = applyRiderRules;
(globalThis || window).initRider = initRider;
(globalThis || window).RIDER_SKILLS = RIDER_SKILLS;
(globalThis || window).respawnRider = respawnRider;
