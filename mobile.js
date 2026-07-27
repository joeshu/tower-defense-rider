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
  cellSpeed: 5.0,       // 格/秒，越大越快。5.0 = 每格0.2秒
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
 * 每种技能根据战场情境触发，有独立冷却。
 * 共11种技能，覆盖不同战斗场景。
 */
const RIDER_SKILLS = {
  whirlwind: { name: '旋风斩', cd: 4.0, color: '#ff66ff', desc: '周围3+敌→范围横扫' },
  trample:   { name: '冲锋践踏', cd: 3.0, color: '#ffaa44', desc: '连跑4格→震波AOE' },
  leap:      { name: '跳跃突袭', cd: 5.0, color: '#66ddff', desc: '远处有敌→飞跃突进' },
  rally:     { name: '集结号角', cd: 6.0, color: '#ffdd44', desc: '友军邻接→攻速增益' },
  berserk:   { name: '绝地狂暴', cd: 8.0, color: '#ff4444', desc: 'HP<35%→狂暴回血' },
  chain:     { name: '连环闪电', cd: 2.0, color: '#ffee66', desc: '击杀时→闪电连锁' },
  charge:    { name: '冲刺突刺', cd: 5.5, color: '#ff4488', desc: '连跑6格→穿透直线敌人' },
  heal:      { name: '治愈光环', cd: 7.0, color: '#44ff88', desc: '周围友军持续回血' },
  counter:   { name: '闪避反击', cd: 4.5, color: '#88ddff', desc: '受击时闪避并反击' },
  thunder:   { name: '雷霆一击', cd: 10.0, color: '#ffdd00', desc: '对精英/BOSS造成高额伤害' },
  summon:    { name: '召唤支援', cd: 12.0, color: '#aa66ff', desc: '召唤2个临时骑兵支援' },
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
    skills: { whirlwind: 0, trample: 0, leap: 0, rally: 0, berserk: 0, chain: 0, charge: 0, heal: 0, counter: 0, thunder: 0, summon: 0 },
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

  // ===== 镜像召唤：骑马路过有单位的格子时，有概率召唤该单位的镜像出战 =====
  trySummonMirror(rider);

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

/* ============ 情境技能系统 ============
 * 根据战场情况自动释放不同技能：
 *   - 旋风斩：周围3+敌人时横扫
 *   - 冲锋践踏：连跑4格后震波AOE
 *   - 跳跃突袭：远处有敌人时飞跃突进
 *   - 集结号角：友军邻接时增益攻速
 *   - 绝地狂暴：HP<35%时狂暴回血
 *   - 连环闪电：击杀时闪电连锁
 */
function tryRiderSkills(rider, targets, mainTarget, killed) {
  if (rider.dead) return;
  const enemies = S.enemies.filter(e => !e.dead && e.hp > 0);
  const berserkActive = rider.buffs.berserk > 0;

  // ===== 1. 绝地狂暴：HP < 35% =====
  if (rider.hp < rider.maxHp * 0.35 && rider.skills.berserk <= 0) {
    rider.skills.berserk = RIDER_SKILLS.berserk.cd;
    rider.buffs.berserk = 4; // 4秒狂暴
    rider.hp = Math.min(rider.maxHp, rider.hp + rider.maxHp * 0.15); // 回血15%
    S.fx.push({ type: 'berserk', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 0.7, dur: 0.6 });
    S.floats.push({ x: rider.px, y: rider.py - 30, t: 0, txt: '🔥绝地狂暴!', color: '#ff4444', big: true });
    rider.lastSkill = 'berserk';
    rider.lastSkillT = 0;
  }

  // ===== 2. 旋风斩：3+敌人在范围内 =====
  const aliveTargets = targets.filter(e => !e.dead && e.hp > 0);
  if (aliveTargets.length >= 3 && rider.skills.whirlwind <= 0) {
    rider.skills.whirlwind = RIDER_SKILLS.whirlwind.cd;
    const dmg = rider.atk * 1.2 * (berserkActive ? 1.5 : 1);
    aliveTargets.forEach(e => {
      e.hp -= dmg;
      S.floats.push({ x: e.x + (Math.random()-0.5)*10, y: e.y - 14, t: 0, txt: '🌀' + Math.round(dmg), color: '#ff66ff' });
    });
    S.fx.push({ type: 'whirlwind', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 1.3, dur: 0.5 });
    S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '🌀旋风斩!', color: '#ff66ff', big: true });
    rider.lastSkill = 'whirlwind';
    rider.lastSkillT = 0;
  }

  // ===== 3. 冲锋践踏：连跑4格+有敌人在范围内 =====
  if (rider.history.length >= 4 && targets.length > 0 && rider.skills.trample <= 0) {
    rider.skills.trample = RIDER_SKILLS.trample.cd;
    const dmg = rider.atk * 0.5 * rider.history.length * 0.18 * (berserkActive ? 1.5 : 1);
    // 2格范围内的所有敌人都受伤
    enemies.forEach(e => {
      const egx = Math.round((e.x - S.heartX) / S.cellSize);
      const egy = Math.round((e.y - S.heartY) / S.cellSize);
      if (manhattan(rider.cx, rider.cy, egx, egy) <= 2) {
        e.hp -= dmg;
        S.floats.push({ x: e.x, y: e.y - 12, t: 0, txt: '💥' + Math.round(dmg), color: '#ffaa44' });
      }
    });
    S.fx.push({ type: 'shockwave', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 1.6, dur: 0.5 });
    S.shake = Math.max(S.shake, 6);
    S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '💥冲锋践踏!', color: '#ffaa44', big: true });
    rider.lastSkill = 'trample';
    rider.lastSkillT = 0;
  }

  // ===== 4. 跳跃突袭：范围内无敌人，但2-4格内有敌人 =====
  if (targets.length === 0 && rider.skills.leap <= 0 && rider.buffs.leaping <= 0) {
    const enemy = findNearestEnemy(rider.cx, rider.cy);
    if (enemy && enemy.dist >= 2 && enemy.dist <= 4) {
      rider.skills.leap = RIDER_SKILLS.leap.cd;
      rider.buffs.leaping = 0.4; // 飞跃动画时间
      // 朝敌人格子飞跃
      rider.fromX = rider.cx;
      rider.fromY = rider.cy;
      rider.toX = enemy.gx;
      rider.toY = enemy.gy;
      rider.progress = 0;
      S.fx.push({ type: 'leap', x: rider.px, y: rider.py, t: 0, tx: enemy.enemy.x, ty: enemy.enemy.y, dur: 0.4 });
      S.floats.push({ x: rider.px, y: rider.py - 30, t: 0, txt: '✨跳跃突袭!', color: '#66ddff', big: true });
      rider.lastSkill = 'leap';
      rider.lastSkillT = 0;
    }
  }

  // ===== 5. 集结号角：2格内有友军 =====
  if (rider.skills.rally <= 0) {
    let friendlies = 0;
    S.cells.forEach(c => {
      if (!c.unit) return;
      const d = manhattan(rider.cx, rider.cy, c.gc, c.gr);
      if (d <= 2 && d > 0) friendlies++;
    });
    if (friendlies >= 1) {
      rider.skills.rally = RIDER_SKILLS.rally.cd;
      rider.buffs.rallyAura = 3;
      S.cells.forEach(c => {
        if (!c.unit) return;
        const d = manhattan(rider.cx, rider.cy, c.gc, c.gr);
        if (d <= 2 && d > 0) {
          c.unit.rallyBuff = 4; // 4秒攻速+40%
          S.fx.push({ type: 'rally', x: c.px, y: c.py, t: 0, r: S.cellSize * 0.5, dur: 0.6 });
        }
      });
      S.fx.push({ type: 'rally', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 1.1, dur: 0.6 });
      S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '📯集结号角!', color: '#ffdd44', big: true });
      rider.lastSkill = 'rally';
      rider.lastSkillT = 0;
    }
  }

  // ===== 6. 连环闪电：击杀敌人时触发 =====
  if (killed && mainTarget && rider.skills.chain <= 0) {
    const chainTargets = enemies.filter(e => e !== mainTarget && !e.dead &&
      Math.hypot(e.x - mainTarget.x, e.y - mainTarget.y) < S.cellSize * 2.5).slice(0, 2);
    if (chainTargets.length > 0) {
      rider.skills.chain = RIDER_SKILLS.chain.cd;
      let prev = { x: mainTarget.x, y: mainTarget.y };
      chainTargets.forEach((e, idx) => {
        const dmg = rider.atk * 0.6 * Math.pow(0.7, idx) * (berserkActive ? 1.5 : 1);
        e.hp -= dmg;
        S.fx.push({ type: 'lightning', x: prev.x, y: prev.y, t: 0, tx: e.x, ty: e.y, dur: 0.3 });
        S.floats.push({ x: e.x, y: e.y - 12, t: 0, txt: '⚡' + Math.round(dmg), color: '#ffee66' });
        prev = { x: e.x, y: e.y };
      });
      rider.lastSkill = 'chain';
      rider.lastSkillT = 0;
    }
  }

  // ===== 7. 冲刺突刺：连跑6格+直线方向有敌人 =====
  if (rider.history.length >= 6 && rider.skills.charge <= 0) {
    const dx = rider.cx - rider.history[0].x;
    const dy = rider.cy - rider.history[0].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len >= 5.5) {
      const dirX = dx / len;
      const dirY = dy / len;
      let pierceTargets = [];
      for (let i = 1; i <= 4; i++) {
        const checkX = Math.round(rider.cx + dirX * i);
        const checkY = Math.round(rider.cy + dirY * i);
        enemies.forEach(e => {
          const egx = Math.round((e.x - S.heartX) / S.cellSize);
          const egy = Math.round((e.y - S.heartY) / S.cellSize);
          if (egx === checkX && egy === checkY && !pierceTargets.includes(e)) {
            pierceTargets.push(e);
          }
        });
      }
      if (pierceTargets.length > 0) {
        rider.skills.charge = RIDER_SKILLS.charge.cd;
        const dmg = rider.atk * 2.0 * (berserkActive ? 1.5 : 1);
        pierceTargets.forEach(e => {
          e.hp -= dmg;
          S.floats.push({ x: e.x, y: e.y - 14, t: 0, txt: '⚔️' + Math.round(dmg), color: '#ff4488' });
        });
        S.fx.push({ type: 'pierce', x: rider.px, y: rider.py, t: 0, dirX, dirY, len: S.cellSize * 4, dur: 0.4 });
        S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '⚔️冲刺突刺!', color: '#ff4488', big: true });
        rider.lastSkill = 'charge';
        rider.lastSkillT = 0;
      }
    }
  }

  // ===== 8. 治愈光环：周围友军血量低于50% =====
  if (rider.skills.heal <= 0) {
    let needHeal = false;
    S.cells.forEach(c => {
      if (!c.unit) return;
      const d = manhattan(rider.cx, rider.cy, c.gc, c.gr);
      if (d <= 2 && d > 0 && c.unit.hp < c.unit.maxHp * 0.5) {
        needHeal = true;
      }
    });
    if (needHeal || S.heartHp < S.heartMax * 0.5) {
      rider.skills.heal = RIDER_SKILLS.heal.cd;
      rider.buffs.healing = 3;
      S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '💚治愈光环!', color: '#44ff88', big: true });
      rider.lastSkill = 'heal';
      rider.lastSkillT = 0;
    }
  }

  // ===== 9. 闪避反击：连续受到攻击时触发 =====
  if (rider.skills.counter <= 0 && rider.hitCombo >= 3) {
    rider.skills.counter = RIDER_SKILLS.counter.cd;
    rider.buffs.invincible = 0.5;
    const dmg = rider.atk * 1.8 * (berserkActive ? 1.5 : 1);
    const nearby = enemies.filter(e => {
      const egx = Math.round((e.x - S.heartX) / S.cellSize);
      const egy = Math.round((e.y - S.heartY) / S.cellSize);
      return manhattan(rider.cx, rider.cy, egx, egy) <= 2;
    });
    if (nearby.length > 0) {
      nearby[0].hp -= dmg;
      S.floats.push({ x: nearby[0].x, y: nearby[0].y - 14, t: 0, txt: '⚡' + Math.round(dmg), color: '#88ddff' });
    }
    S.fx.push({ type: 'counter', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 0.8, dur: 0.4 });
    S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '⚡闪避反击!', color: '#88ddff', big: true });
    rider.hitCombo = 0;
    rider.lastSkill = 'counter';
    rider.lastSkillT = 0;
  }

  // ===== 10. 雷霆一击：对精英/BOSS造成高额伤害 =====
  if (rider.skills.thunder <= 0) {
    const eliteTarget = enemies.find(e => e.elite || e.boss);
    if (eliteTarget) {
      rider.skills.thunder = RIDER_SKILLS.thunder.cd;
      const dmg = rider.atk * 4.5 * (berserkActive ? 1.5 : 1);
      eliteTarget.hp -= dmg;
      S.fx.push({ type: 'thunder', x: eliteTarget.x, y: eliteTarget.y, t: 0, r: eliteTarget.r || 20, dur: 0.7 });
      S.fx.push({ type: 'ring', x: eliteTarget.x, y: eliteTarget.y, t: 0, r: (eliteTarget.r || 20) * 2, color: '#ffdd00', dur: 0.5 });
      S.shake = Math.max(S.shake, 10);
      S.floats.push({ x: eliteTarget.x, y: eliteTarget.y - 24, t: 0, txt: '🌩️' + Math.round(dmg), color: '#ffdd00', big: true });
      S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '🌩️雷霆一击!', color: '#ffdd00', big: true });
      rider.lastSkill = 'thunder';
      rider.lastSkillT = 0;
    }
  }

  // ===== 11. 召唤支援：场上敌人超过8个时召唤 =====
  if (enemies.length >= 8 && rider.skills.summon <= 0) {
    rider.skills.summon = RIDER_SKILLS.summon.cd;
    const allyCount = S.cells.filter(c => c.unit).length;
    if (allyCount < S.cells.length * 0.6) {
      S.floats.push({ x: rider.px, y: rider.py - 34, t: 0, txt: '👥召唤支援!', color: '#aa66ff', big: true });
      rider.lastSkill = 'summon';
      rider.lastSkillT = 0;
    }
  }
}

/* ============ 镜像召唤系统 ============
 * 骑马单位路过有友军单位的格子时，有概率召唤该单位的镜像。
 * 镜像会走出格子，自动追击敌人进行攻击，有生存时间限制。
 */
function trySummonMirror(rider) {
  if (rider.dead) return;
  if (!S.riderMirrors) S.riderMirrors = [];

  const cell = S.cells.find(c => c.gc === rider.cx && c.gr === rider.cy);
  if (!cell || !cell.unit) return;

  const u = cell.unit;
  const d = UNITS[u.ch];
  if (!d || !d.atk || d.atk <= 0) return;

  const maxMirrors = 5;
  if (S.riderMirrors.length >= maxMirrors) return;

  const summonChance = 0.25 + (rider.level * 0.02);
  if (Math.random() > summonChance) return;

  const mirror = makeMirror(u, rider.px, rider.py);
  S.riderMirrors.push(mirror);

  S.fx.push({ type: 'rally', x: rider.px, y: rider.py, t: 0, r: S.cellSize * 0.5, dur: 0.4 });
  S.floats.push({ x: rider.px, y: rider.py - 28, t: 0, txt: '✨召唤镜像!', color: '#aaddff', big: true });
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

function makeMirror(unit, x, y) {
  const d = UNITS[unit.ch];
  const m = Math.pow(1.5, unit.lv - 1);
  return {
    type: 'mirror',
    ch: unit.ch,
    lv: unit.lv,
    x: x,
    y: y,
    hp: d.hp * m * 0.6,
    maxHp: d.hp * m * 0.6,
    atk: d.atk * m * 0.7,
    range: d.range,
    aspd: d.aspd * 1.2,
    cd: 0,
    lifetime: 8,
    maxLifetime: 8,
    target: null,
    dead: false,
    color: d.color || '#88ddff',
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

    const enemies = S.enemies.filter(e => !e.dead && e.hp > 0);
    if (enemies.length === 0) return;

    let best = null, bestDist = Infinity;
    enemies.forEach(e => {
      const dist = Math.hypot(e.x - m.x, e.y - m.y);
      if (dist < bestDist) { bestDist = dist; best = e; }
    });
    if (!best) return;

    const rangePx = m.range * S.cellSize;

    if (bestDist > rangePx) {
      const spd = (80 + m.lv * 10) * dt;
      const dx = best.x - m.x, dy = best.y - m.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        m.x += (dx / dist) * spd;
        m.y += (dy / dist) * spd;
      }
    } else if (m.cd <= 0) {
      m.cd = 1 / m.aspd;
      best.hp -= m.atk;
      S.floats.push({ x: best.x, y: best.y - 10, t: 0, txt: Math.round(m.atk), color: m.color });
      S.fx.push({ type: 'slash', x: best.x, y: best.y, t: 0 });
      if (best.hp <= 0 && !best.dead) {
        best.dead = true;
        S.waveKilled++;
        const g = (ENEMY_DEFS[best.ch] && ENEMY_DEFS[best.ch].gold) || 1;
        S.gold += g;
        S.floats.push({ x: best.x, y: best.y - 22, t: 0, txt: '+' + g + '💰', color: '#f4c95d' });
        S.fx.push({ type: 'ring', x: best.x, y: best.y, t: 0, r: best.r || 15, color: (ENEMY_DEFS[best.ch] && ENEMY_DEFS[best.ch].color) || '#fff' });
      }
    }
  });

  S.riderMirrors = S.riderMirrors.filter(m => !m.dead);
}

/* 渲染镜像单位 */
function drawMirrors(ctx) {
  if (!S.riderMirrors) return;
  S.riderMirrors.forEach(m => {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.globalAlpha = 0.55 + Math.sin(S.time * 6 + m.x) * 0.15;
    const size = S.cellSize * 0.45;
    ctx.fillStyle = m.color;
    ctx.font = `900 ${size}px "PingFang SC",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.ch, 0, 0);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeText(m.ch, 0, 0);
    const hpRatio = m.hp / m.maxHp;
    const barW = size * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-barW/2, -size * 0.9, barW, 4);
    ctx.fillStyle = hpRatio > 0.5 ? '#4ade80' : (hpRatio > 0.25 ? '#facc15' : '#ef4444');
    ctx.fillRect(-barW/2, -size * 0.9, barW * hpRatio, 4);
    const lifeRatio = m.lifetime / m.maxLifetime;
    ctx.fillStyle = 'rgba(136, 221, 255, 0.6)';
    ctx.fillRect(-barW/2, -size * 0.9 - 5, barW * lifeRatio, 2);
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
