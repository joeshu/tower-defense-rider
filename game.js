/* ============================================================
 * game.js —— 你玩不过我吧 · 复刻版
 * 核心创新：骑马单位在格子上走格移动
 * 包含：30关 + 6种棋盘 + 格子走格AI + 5种骑术玩法
 * ============================================================ */
'use strict';

// Polyfill for non-browser environments
if (typeof requestAnimationFrame === 'undefined') {
  var requestAnimationFrame = function(cb) { return setTimeout(function(){ cb(Date.now()); }, 16); };
}
if (typeof performance === 'undefined') {
  var performance = { now: function() { return Date.now(); } };
}

/* ============ Canvas 初始化 ============ */
var cv = document.getElementById('cv');
const ctx = cv.getContext('2d', { alpha: false });
let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

function resize() {
  const r = cv.getBoundingClientRect();
  W = r.width; H = r.height;
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (S.chapter) buildLayout();
}
window.addEventListener('resize', resize, { passive: true });

/* ============ 单位定义 ============ */
const UNITS = {
  '箭': { cost: 3, name: '箭·射手', atk: 9,  range: 3,  aspd: 1.1, hp: 45,  color: '#4f8fd0', desc: '远程连射' },
  '切': { cost: 3, name: '切·快刀', atk: 16, range: 1,  aspd: 1.0, hp: 80,  color: '#d0704f', desc: '近战高伤' },
  '盾': { cost: 2, name: '盾·壁垒', atk: 4,  range: 1,  aspd: 0.6, hp: 240, color: '#8a8f9c', desc: '高血量吸引敌人' },
  '速': { cost: 3, name: '速·战鼓', atk: 0,  range: 0,  aspd: 0,   hp: 55,  color: '#4fc07a', desc: '相邻友军攻速+35%/级' },
  // 元素兵种
  '雷': { cost: 4, name: '雷·天师', atk: 15, range: 3,  aspd: 0.8, hp: 50,  color: '#ffd700', desc: '闪电链攻击多个目标', aoe: 2 },
  '冰': { cost: 4, name: '冰·寒士', atk: 10, range: 2,  aspd: 0.7, hp: 60,  color: '#4fd0f8', desc: '减速敌人50%', slow: true },
  '火': { cost: 4, name: '火·术士', atk: 12, range: 2,  aspd: 0.8, hp: 55,  color: '#ff6b35', desc: '灼烧持续伤害', burn: true },
  '毒': { cost: 3, name: '毒·蛊师', atk: 8,  range: 1,  aspd: 0.9, hp: 65,  color: '#8b5cf6', desc: '毒雾范围伤害', poison: true },
  '奶': { cost: 4, name: '奶·药师', atk: 0,  range: 0,  aspd: 0,   hp: 70,  color: '#4ade80', desc: '治疗相邻友军', heal: true },
  // 进阶兵种
  '弓': { cost: 5, name: '弓·神射', atk: 22, range: 4,  aspd: 0.7, hp: 40,  color: '#3b82f6', desc: '超远程狙击', counter: '魔' },
  '炮': { cost: 6, name: '炮·投石', atk: 35, range: 3,  aspd: 0.4, hp: 80,  color: '#92400e', desc: '范围爆炸伤害', aoe: 3 },
  '刺': { cost: 4, name: '刺·刺客', atk: 25, range: 1,  aspd: 1.3, hp: 45,  color: '#ef4444', desc: '背刺暴击', crit: true },
  '甲': { cost: 3, name: '甲·重装', atk: 6,  range: 1,  aspd: 0.5, hp: 320, color: '#6b7280', desc: '减免30%伤害', armor: true },
  '锤': { cost: 5, name: '锤·力士', atk: 28, range: 1,  aspd: 0.6, hp: 120, color: '#f97316', desc: '击晕敌人', stun: true },
  // 西游角色（需组词）
  '唐': { cost: 4, name: '唐(半)',  atk: 0,  range: 0,  aspd: 0,   hp: 65,  color: '#c9a84f', combo: '唐僧', desc: '与「僧」相邻成型' },
  '僧': { cost: 4, name: '僧(半)',  atk: 0,  range: 0,  aspd: 0,   hp: 65,  color: '#c9a84f', combo: '唐僧', desc: '与「唐」相邻成型' },
  '悟': { cost: 5, name: '悟(半)',  atk: 6,  range: 2,  aspd: 0.8, hp: 60,  color: '#b06ad0', combo: '悟空', desc: '与「空」相邻成型' },
  '空': { cost: 5, name: '空(半)',  atk: 6,  range: 2,  aspd: 0.8, hp: 60,  color: '#b06ad0', combo: '悟空', desc: '与「悟」相邻成型' },
  '八': { cost: 4, name: '八(半)',  atk: 13, range: 1,  aspd: 0.9, hp: 110, color: '#6e9dca', combo: '八戒', desc: '与「戒」相邻成型' },
  '戒': { cost: 4, name: '戒(半)',  atk: 13, range: 1,  aspd: 0.9, hp: 110, color: '#6e9dca', combo: '八戒', desc: '与「八」相邻成型' },
  '沙': { cost: 3, name: '沙(半)',  atk: 5,  range: 2,  aspd: 0.7, hp: 150, color: '#779b78', combo: '沙僧', desc: '与「僧」相邻成型' },
  // 封神榜角色（需组词）
  '姜': { cost: 5, name: '姜(半)',  atk: 8,  range: 3,  aspd: 0.7, hp: 80,  color: '#d97827', combo: '子牙', desc: '与「牙」相邻成型' },
  '牙': { cost: 5, name: '牙(半)',  atk: 8,  range: 3,  aspd: 0.7, hp: 80,  color: '#d97827', combo: '子牙', desc: '与「姜」相邻成型' },
  '申': { cost: 5, name: '申(半)',  atk: 10, range: 2,  aspd: 0.8, hp: 70,  color: '#9333ea', combo: '公豹', desc: '与「豹」相邻成型' },
  '豹': { cost: 5, name: '豹(半)',  atk: 10, range: 2,  aspd: 0.8, hp: 70,  color: '#9333ea', combo: '公豹', desc: '与「申」相邻成型' },
  '吒': { cost: 6, name: '哪吒(全)',atk: 18, range: 2,  aspd: 1.0, hp: 90,  color: '#f43f5e', desc: '三头六臂·范围攻击' },
  // 枪：长兵，克制骑兵
  '枪': { cost: 3, name: '枪·长兵', atk: 12, range: 2,  aspd: 0.9, hp: 70,  color: '#5a8acc', desc: '贯穿伤害·克制骑', counter: '骑' },
};

const COMBO_INFO = {
  '唐僧': { desc: '唐僧成型：持续治疗心与全体友军', color: '#d09b35' },
  '悟空': { desc: '悟空成型：金箍棒范围重击', color: '#d97827' },
  '八戒': { desc: '八戒成型：近战扇形横扫', color: '#4786b7' },
  '沙僧': { desc: '沙僧成型：为相邻单位分担伤害', color: '#4e9b68' },
  '子牙': { desc: '姜子牙成型：封神榜·减速全场敌人', color: '#d97827' },
  '公豹': { desc: '申公豹成型：魔化·召唤小妖怪', color: '#9333ea' },
};
const COMBO_PAIRS = [['唐','僧'], ['悟','空'], ['八','戒'], ['沙','僧'], ['姜','牙'], ['申','豹']];

/* ============ 全局状态 ============ */
const S = {
  phase: 'idle',     // idle | shop | battle | over
  level: 1,           // 1-30
  chapter: 1,
  wave: 1,
  gold: 10,
  heartHp: 100, heartMax: 100,
  heartX: 0, heartY: 0,
  cells: [],          // 格子
  enemies: [], shots: [], floats: [], fx: [],
  cards: [], selCard: -1, selCell: -1,
  hoverCell: -1, dragging: -1, dragMoved: false,
  toSpawn: [], spawnT: 0, waveTotal: 0, waveKilled: 0,
  time: 0, shake: 0,
  riders: [],         // 骑马单位列表
  riderMirrors: [],   // 镜像单位列表（骑马召唤的友军镜像）
  unlockedTypes: [],  // 当前已解锁的单位类型
  speed: 1,           // 游戏速度 1x/2x
  layoutName: '',
};

/* ============ 布局构建 ============ */
function buildLayout() {
  const lv = LEVELS.find(l => l.id === S.level) || LEVELS[0];
  const layout = LAYOUTS[lv.layout];
  S.layoutName = lv.layout;

  const cx = W / 2, cy = H * 0.44;
  const maxDim = Math.max(layout.cols, layout.rows, 5);
  const cellSize = Math.min(W * 0.95 / maxDim, H * 0.38 / maxDim, 70);
  S.cellSize = cellSize;

  // 建立格子
  const cells = [];
  const obstaclesPix = []; // 障碍物像素位置（用于渲染）
  const slotSet = new Set(layout.slots.map(s => s[0] + ',' + s[1]));
  const obsSet = new Set((layout.obstacles || []).map(s => s[0] + ',' + s[1]));

  // 中心格子位置
  let centerGx, centerGy;
  if (layout.type === 'cross') { centerGx = 2; centerGy = 2; }
  else if (layout.type === 'spiral') { centerGx = 2; centerGy = 2; }
  else { centerGx = Math.floor(layout.cols/2); centerGy = Math.floor(layout.rows/2); }

  S.heartX = cx; S.heartY = cy;

  // 特殊格子配置 { type: 'speed'|'rage'|'heal', cells: [[gx,gy],...] }
  const specialMap = {}; // key "gx,gy" → type
  if (layout.specials) {
    layout.specials.forEach(sp => {
      sp.cells.forEach(c => { specialMap[c[0] + ',' + c[1]] = sp.type; });
    });
  }

  // 遍历所有格子坐标
  for (let gy = 0; gy < layout.rows; gy++) {
    for (let gx = 0; gx < layout.cols; gx++) {
      const key = gx + ',' + gy;
      if (gx === centerGx && gy === centerGy) continue; // 心
      if (obsSet.has(key)) {
        // 记录障碍物像素位置
        const px = cx + (gx - centerGx) * (cellSize * 1.08);
        const py = cy + (gy - centerGy) * (cellSize * 1.08);
        obstaclesPix.push({ gx, gy, px, py });
        continue;
      }

      const px = cx + (gx - centerGx) * (cellSize * 1.08);
      const py = cy + (gy - centerGy) * (cellSize * 1.08);

      // 尝试按像素位置迁移旧单位
      let unit = null;
      const oldIdx = S.cells.findIndex(c => Math.abs(c.px - px) < 5 && Math.abs(c.py - py) < 5);
      if (oldIdx >= 0 && S.cells[oldIdx].unit) {
        unit = S.cells[oldIdx].unit;
      }

      const cellObj = { gc: gx, gr: gy, px, py, unit };
      // 标记特殊格子类型
      if (specialMap[key]) cellObj.special = specialMap[key];
      cells.push(cellObj);
    }
  }

  S.cells = cells;
  S.obstacles = obstaclesPix;
  recompute();
}

function lrow(c) { return c.gr; }

function adjacent(a, b) {
  const dc = Math.abs(a.gc - b.gc), dr = Math.abs(lrow(a) - lrow(b));
  return dc + dr === 1;
}

/* ============ 组词 + 光环 ============ */
function recompute() {
  const cells = S.cells;
  for (const c of cells) if (c.unit) { c.unit.combo = false; c.unit.partner = -1; c.unit.aura = 1; }
  const pair = (a, b) => {
    const used = new Set();
    cells.forEach((ca, i) => {
      if (!ca.unit || ca.unit.ch !== a || used.has(i) || ca.unit.combo) return;
      cells.forEach((cb, j) => {
        if (ca.unit.combo || !cb.unit || cb.unit.ch !== b || used.has(j) || cb.unit.combo) return;
        if (adjacent(ca, cb)) {
          ca.unit.combo = cb.unit.combo = true;
          ca.unit.partner = j; cb.unit.partner = i;
          used.add(i); used.add(j);
        }
      });
    });
  };
  COMBO_PAIRS.forEach(([a, b]) => pair(a, b));
  cells.forEach(c => {
    if (!c.unit || c.unit.ch === '速') return;
    let m = 1;
    cells.forEach(o => { if (o.unit && o.unit.ch === '速' && adjacent(c, o)) m += 0.35 * o.unit.lv; });
    c.unit.aura = m;
  });
}

function makeUnit(ch) {
  const d = UNITS[ch];
  return { ch, lv: 1, hp: d.hp, maxHp: d.hp, cd: 0, healT: 0, combo: false, partner: -1, aura: 1, dead: false, rallyBuff: 0 };
}

function effStat(u) {
  const d = UNITS[u.ch];
  const m = Math.pow(1.5, u.lv - 1);
  let atk = d.atk * m, range = d.range, aspd = d.aspd * u.aura, splash = 0;
  if (u.rallyBuff > 0) aspd *= 1.4; // 集结号角：攻速+40%
  if (u.combo && (u.ch === '悟' || u.ch === '空')) { atk = 24 * m; range = 3; aspd = 1.25 * u.aura; splash = 70; }
  if (u.combo && (u.ch === '八' || u.ch === '戒')) { atk = 30 * m; range = 1; aspd = 1.1 * u.aura; splash = 35; }
  if (u.rallyBuff > 0 && u.combo) { aspd *= 1.4; } // 组词单位也享受集结
  return { atk, range, aspd, splash };
}

function unitMaxHp(u) { return UNITS[u.ch].hp * Math.pow(1.5, u.lv - 1); }

/* ============ 商店 ============ */
const cardsEl = document.getElementById('cards');
function shopPool() {
  const lv = LEVELS.find(l => l.id === S.level) || LEVELS[0];
  const unlocked = S.unlockedTypes.length > 0 ? S.unlockedTypes : ['箭','切','盾','速'];
  // 权重：基础单位更高，元素兵种次之，进阶兵种较低，半字最低
  const weights = { 
    '箭':3,'切':3,'盾':3,'速':2,'枪':2,
    '雷':2,'冰':2,'火':2,'毒':2,'奶':2,
    '弓':1,'炮':1,'刺':1,'甲':1,'锤':1,
    '唐':2,'僧':2,'悟':1,'空':1,'八':2,'戒':2,'沙':1,
    '姜':1,'牙':1,'申':1,'豹':1,'吒':1 
  };
  // 关卡规则禁用过滤
  const banned = new Set();
  if (lv.rule) {
    if (lv.rule.type === 'no_archer') banned.add('箭');
    if (lv.rule.type === 'no_shield') banned.add('盾');
  }
  let pool = [];
  unlocked.forEach(ch => {
    if (banned.has(ch)) return;
    const w = weights[ch] || 1;
    for (let i=0;i<w;i++) pool.push(ch);
  });
  if (pool.length === 0) pool = ['切'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function rollCards() {
  S.cards = [];
  for (let i = 0; i < 3; i++) S.cards.push({ ch: shopPool(), sold: false });
  S.selCard = -1;
  renderCards();
}

function ownedChars() {
  const set = new Set();
  S.cells.forEach(c => { if (c.unit) set.add(c.unit.ch); });
  if (S.riders && S.riders.length) set.add('骑');
  return set;
}

function renderCards() {
  const own = ownedChars();
  cardsEl.innerHTML = '';
  S.cards.forEach((cd, i) => {
    const d = UNITS[cd.ch];
    const el = document.createElement('div');
    const isNew = S.unlockedTypes.includes(cd.ch) && !own.has(cd.ch);
    el.className = 'card' + (cd.sold ? ' sold' : '') + (S.selCard === i ? ' sel' : '');
    let tag = '';
    if (isNew) tag = '<div class="tag new">新!</div>';
    if (d.combo) tag = '<div class="tag combo">组词</div>';
    el.innerHTML = `${tag}<div class="ch">${cd.ch}</div><div class="nm">${d.desc}</div><div class="pr">💰${d.cost}</div>`;
    el.onclick = () => {
      if (cd.sold || S.phase !== 'shop') return;
      if (S.gold < d.cost) { toast('金币不够！'); return; }
      S.selCard = (S.selCard === i ? -1 : i);
      hideInfo();
      renderCards();
    };
    cardsEl.appendChild(el);
  });
}

/* ============ UI ============ */
const $ = id => document.getElementById(id);
function syncTop() {
  const lv = LEVELS.find(l => l.id === S.level) || LEVELS[0];
  $('tbChapter').textContent = '第' + S.level + '关';
  $('tbHp').textContent = Math.max(0, Math.ceil(S.heartHp));
  $('tbGold').textContent = S.gold;
  $('tbWave').textContent = '第' + S.wave + '/6波';
  const chapterNames = {1:'黄风岭', 2:'火焰山', 3:'灵山', 4:'封神台'};
  $('chapterName').textContent = chapterNames[S.chapter] || '';
  const prog = Math.min(100, S.wave / 6 * 100);
  $('chapterDots').style.background = `linear-gradient(90deg,#c49a48 ${prog}%,#655842 ${prog}%)`;
  // 目标提示
  const own = ownedChars();
  let goal = '🐴 骑马巡视·路过召唤镜像';
  if (!own.has('唐') && !own.has('僧') && S.unlockedTypes.includes('唐')) goal = '组出「唐僧」治疗';
  else if (!own.has('悟') && !own.has('空') && S.unlockedTypes.includes('悟')) goal = '组出「悟空」重击';
  else if (!own.has('八') && !own.has('戒') && S.unlockedTypes.includes('八')) goal = '组出「八戒」横扫';
  else if (!own.has('姜') && !own.has('牙') && S.unlockedTypes.includes('姜')) goal = '组出「子牙」封神';
  else if (!own.has('申') && !own.has('豹') && S.unlockedTypes.includes('申')) goal = '组出「公豹」魔化';
  $('goalText').textContent = goal;
  // 骑马面板
  updateRiderPanel();
}

function toast(t) {
  let el = $('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = t;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = '';
  setTimeout(() => el.classList.add('hidden'), 2000);
}

function hideInfo() { $('infoBar').classList.add('hidden'); S.selCell = -1; }
function showInfo(i) {
  const u = S.cells[i].unit;
  const d = UNITS[u.ch];
  S.selCell = i;
  let extra = u.combo ? ' · ' + COMBO_INFO[d.combo].desc : (d.combo ? ' · 未成型(' + d.desc + ')' : '');
  $('infoText').textContent = `${u.ch} Lv${u.lv}${extra}`;
  $('btnSell').textContent = `出售 +${sellPrice(u)}💰`;
  $('infoBar').classList.remove('hidden');
}
function sellPrice(u) { return Math.max(1, Math.floor(UNITS[u.ch].cost * u.lv * 0.5)); }

/* ============ 交互 ============ */
function cellAtPos(x, y) {
  let hit = -1;
  S.cells.forEach((c, i) => {
    if (Math.abs(x - c.px) < S.cellSize / 2 && Math.abs(y - c.py) < S.cellSize / 2) hit = i;
  });
  return hit;
}

cv.addEventListener('pointerdown', e => {
  if (S.phase !== 'shop') return;
  const r = cv.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const hit = cellAtPos(x, y);
  if (hit < 0) { hideInfo(); S.selCard = -1; renderCards(); return; }
  const cell = S.cells[hit];

  if (S.selCard >= 0) {
    const cd = S.cards[S.selCard], d = UNITS[cd.ch];

    if (!cell.unit) {
      cell.unit = makeUnit(cd.ch);
    } else if (cell.unit.ch === cd.ch) {
      cell.unit.lv++;
      cell.unit.maxHp = unitMaxHp(cell.unit);
      cell.unit.hp = cell.unit.maxHp;
      S.floats.push({ x: cell.px, y: cell.py - 20, t: 0, txt: '升级!Lv' + cell.unit.lv, color: '#ffd76a' });
    } else { toast('只能放空格或同字合并'); return; }
    S.gold -= d.cost; cd.sold = true; S.selCard = -1;
    recompute(); renderCards(); syncTop();
    if (cell.unit.combo) toast('「' + UNITS[cell.unit.ch].combo + '」成型！');
  } else if (cell.unit) {
    // 开始拖拽
    S.dragging = hit;
    S.dragMoved = false;
    showInfo(hit);
  } else hideInfo();
});

cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  S.hoverCell = cellAtPos(x, y);

  // 拖拽中
  if (S.dragging !== undefined && S.dragging >= 0 && S.phase === 'shop') {
    S.dragMoved = true;
  }
});

cv.addEventListener('pointerup', e => {
  if (S.dragging === undefined || S.dragging < 0) return;
  const r = cv.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const target = cellAtPos(x, y);

  if (S.dragMoved && target >= 0 && target !== S.dragging) {
    const from = S.cells[S.dragging];
    const to = S.cells[target];
    if (!to.unit) {
      // 移动单位到空格
      to.unit = from.unit;
      from.unit = null;
      recompute();
      S.floats.push({ x: to.px, y: to.py - 20, t: 0, txt: '→', color: '#7dd0ff' });
    } else {
      toast('目标格已有单位');
    }
  }
  S.dragging = -1;
  S.dragMoved = false;
});

cv.addEventListener('pointerleave', () => {
  S.hoverCell = -1;
});

$('btnSell').onclick = () => {
  if (S.selCell < 0) return;
  const u = S.cells[S.selCell].unit;
  S.gold += sellPrice(u);
  S.cells[S.selCell].unit = null;
  hideInfo(); recompute(); renderCards(); syncTop();
};
$('btnCancel').onclick = hideInfo;
$('btnReroll').onclick = () => {
  if (S.phase !== 'shop') return;
  if (S.gold < 2) { toast('金币不够刷新'); return; }
  S.gold -= 2; rollCards(); syncTop();
};
$('btnFight').onclick = () => { if (S.phase === 'shop') startWave(); };
$('ovBtn').onclick = () => { $('overlay').classList.add('hidden'); ovAction(); };
let ovAction = () => {};

/* ============ 倍速 ============ */
document.querySelectorAll('.spd-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.spd-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    S.speed = parseInt(btn.dataset.spd) || 1;
  };
});

/* ============ 波次 ============ */
function startWave() {
  hideInfo();
  S.phase = 'battle';
  const lv = LEVELS.find(l => l.id === S.level) || LEVELS[0];
  S.toSpawn = generateWave(S.level, S.wave);
  S.waveTotal = S.toSpawn.length; S.waveKilled = 0;
  S.spawnT = 0.5;
  $('shop').classList.add('hidden');
  $('battleBar').classList.remove('hidden');
  $('battleText').textContent = '第' + S.wave + '波 来袭！';
  $('waveProgFill').style.width = '0%';
}

function hpMulForEnemy(level, wave, ch) {
  const lv = LEVELS.find(l => l.id === level) || LEVELS[0];
  let mul = (1 + 0.35 * (wave - 1)) * (lv.chapter === 1 ? 1 : (lv.chapter === 2 ? 1.8 : 2.5));
  if (lv.rule && lv.rule.type === 'fast_enemy' && ch !== 'boss') mul *= 1.2;
  return mul;
}

function spawnEnemy(chName) {
  const d = ENEMY_DEFS[chName];
  const side = Math.floor(Math.random() * 4);
  const m = 40;
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -m; }
  else if (side === 1) { x = Math.random() * W; y = H * 0.78 + m; }
  else if (side === 2) { x = -m; y = Math.random() * H * 0.7; }
  else { x = W + m; y = Math.random() * H * 0.7; }
  const mul = hpMulForEnemy(S.level, S.wave, chName);
  S.enemies.push({
    ch: chName, x, y,
    hp: d.hp * mul, maxHp: d.hp * mul,
    spd: d.spd * (S.level > 15 ? 1.1 : 1), atk: d.atk * (S.chapter >= 2 ? 1.3 : 1),
    r: d.r, cd: 0, boss: !!d.boss, elite: !!d.elite, dead: false,
  });
}

/* ============ 战斗逻辑 ============ */
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function damageEnemy(e, dmg, color) {
  e.hp -= dmg;
  S.floats.push({ x: e.x + (Math.random()-0.5)*12, y: e.y - 12, t: 0, txt: Math.round(dmg), color: color || '#fff' });
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    const g = ENEMY_DEFS[e.ch] ? ENEMY_DEFS[e.ch].gold : 1;
    S.gold += g; S.waveKilled++;
    S.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, r: e.r, color: ENEMY_DEFS[e.ch] ? ENEMY_DEFS[e.ch].color : '#fff' });
    S.floats.push({ x: e.x, y: e.y - 26, t: 0, txt: '+' + g + '💰', color: '#f4c95d' });
  }
}

function unitTarget(cell, range) {
  let best = null, bd = 1e9;
  for (const e of S.enemies) {
    if (e.dead) continue;
    const d = dist(cell.px, cell.py, e.x, e.y);
    if (d <= (range + e.r) * S.cellSize * 0.5 && d < bd) { bd = d; best = e; }
  }
  return best;
}

function updateBattle(dt) {
  const sdt = dt * S.speed;
  // 生成
  if (S.toSpawn.length) {
    S.spawnT -= sdt;
    if (S.spawnT <= 0) {
      spawnEnemy(S.toSpawn.shift());
      S.spawnT = Math.max(0.15, 0.7 - S.wave * 0.05);
    }
  }
  // 静态单位行动
  S.cells.forEach(cell => {
    const u = cell.unit; if (!u) return;
    // 集结号角增益计时
    if (u.rallyBuff > 0) u.rallyBuff -= sdt;
    const st = effStat(u);
    if (u.combo && (u.ch === '唐' || u.ch === '僧')) {
      u.healT -= sdt;
      if (u.healT <= 0) {
        u.healT = 1.4;
        const amt = 4 * Math.pow(1.5, u.lv - 1);
        S.heartHp = Math.min(S.heartMax, S.heartHp + amt);
        S.cells.forEach(c2 => { if (c2.unit) c2.unit.hp = Math.min(unitMaxHp(c2.unit), c2.unit.hp + amt); });
        S.fx.push({ type: 'heal', x: cell.px, y: cell.py, t: 0 });
      }
    }
    if (st.atk <= 0 || st.aspd <= 0) return;
    u.cd -= sdt;
    if (u.cd > 0) return;
    const tg = unitTarget(cell, st.range);
    if (!tg) return;
    u.cd = 1 / st.aspd;
    if (st.range > 1) {
      S.shots.push({ x: cell.px, y: cell.py, tx: tg.x, ty: tg.y, tg, dmg: st.atk, splash: st.splash, t: 0, color: u.combo ? '#ffb84f' : UNITS[u.ch].color });
    } else {
      damageEnemy(tg, st.atk, '#ffd0a0');
      S.fx.push({ type: 'slash', x: tg.x, y: tg.y, t: 0 });
    }
  });
  // 弹道
  for (const s of S.shots) {
    s.t += sdt;
    const sp = 620;
    const d = dist(s.x, s.y, s.tx, s.ty);
    if (s.tg && !s.tg.dead) { s.tx = s.tg.x; s.ty = s.tg.y; }
    if (d < 12 || s.t > 1.6) {
      s.done = true;
      if (s.tg && !s.tg.dead) {
        damageEnemy(s.tg, s.dmg, s.splash ? '#ffb84f' : '#cfe8ff');
        if (s.splash) {
          S.fx.push({ type: 'boom', x: s.tg.x, y: s.tg.y, t: 0, r: s.splash });
          S.enemies.forEach(e2 => { if (!e2.dead && e2 !== s.tg && dist(e2.x,e2.y,s.tx,s.ty) < s.splash) damageEnemy(e2, s.dmg*0.6, '#ffb84f'); });
        }
      }
    } else {
      const k = (sp * sdt) / d;
      s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k;
    }
  }
  S.shots = S.shots.filter(s => !s.done);

  // 骑马单位更新
  if (S.riders && S.riders.length > 0) {
    updateRiders(sdt);
  }

  // 镜像单位更新
  if (S.riderMirrors && S.riderMirrors.length > 0) {
    updateMirrors(sdt);
  }

  // 敌人移动/攻击
  for (const e of S.enemies) {
    if (e.dead) continue;
    let tgx = S.heartX, tgy = S.heartY, tgCell = null, bd = dist(e.x, e.y, S.heartX, S.heartY);
    for (const c of S.cells) {
      if (!c.unit) continue;
      const d = dist(e.x, e.y, c.px, c.py);
      if (d < bd) { bd = d; tgx = c.px; tgy = c.py; tgCell = c; }
    }
    const reach = tgCell ? S.cellSize * 0.55 + e.r : S.cellSize * 0.45 + e.r;
    if (bd > reach) {
      const k = (e.spd * sdt) / bd;
      e.x += (tgx - e.x) * k; e.y += (tgy - e.y) * k;
    } else {
      e.cd -= sdt;
      if (e.cd <= 0) {
        e.cd = 1;
        if (tgCell) {
          tgCell.unit.hp -= e.atk;
          S.floats.push({ x: tgCell.px, y: tgCell.py + 10, t: 0, txt: '-' + Math.round(e.atk), color: '#ff9a9a' });
          if (tgCell.unit.hp <= 0) {
            S.fx.push({ type: 'ring', x: tgCell.px, y: tgCell.py, t: 0, r: S.cellSize/2, color: '#ff6a6a' });
            tgCell.unit = null; recompute();
          }
        } else {
          S.heartHp -= e.atk; S.shake = 8;
          S.floats.push({ x: S.heartX, y: S.heartY - 20, t: 0, txt: '-' + Math.round(e.atk), color: '#ff6a6a' });
        }
      }
    }
  }
  S.enemies = S.enemies.filter(e => !e.dead);

  // 进度
  const prog = S.waveTotal ? S.waveKilled / S.waveTotal : 0;
  $('waveProgFill').style.width = (prog * 100).toFixed(0) + '%';
  $('battleText').textContent = S.enemies.length ? '剩余 ' + (S.enemies.length + S.toSpawn.length) : '清场中…';

  if (S.heartHp <= 0) return gameOver();
  if (!S.toSpawn.length && !S.enemies.length) waveClear();
}

/* ============ 骑马单位调用 ============ */
// （makeRider / updateRiders / doRiderAttack / drawRiders 在 mobile.js 中定义）

/* ============ 骑马面板 ============ */
function updateRiderPanel() {
  const panel = $('riderPanel');
  if (!panel) return;
  if (!S.riders || S.riders.length === 0) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  const r = S.riders[0];
  const SK = window.RIDER_SKILLS || RIDER_SKILLS;
  let html = `<div class="rp-title">🐴 骑术面板</div>`;
  html += `<div class="rp-row"><span class="rp-label">等级</span><span class="rp-val">Lv${r.level}</span></div>`;
  html += `<div class="rp-row"><span class="rp-label">HP</span><span class="rp-val">${Math.ceil(r.hp)}/${Math.ceil(r.maxHp)}</span></div>`;
  html += `<div class="rp-row"><span class="rp-label">攻击</span><span class="rp-val">${Math.round(r.atk)}${r.buffs&&r.buffs.berserk>0?' 🔥':''}</span></div>`;
  html += `<div class="rp-row"><span class="rp-label">移速</span><span class="rp-val">${r.speed.toFixed(1)}格/s${r.buffs&&r.buffs.berserk>0?' ⚡':''}</span></div>`;
  html += `<div class="rp-row"><span class="rp-label">冲锋</span><span class="rp-val">×${(RIDER_CFG.chargeBonus * (r.chargeBonusMul||1)).toFixed(1)}</span></div>`;
  if (r.canLeap) html += `<div class="rp-row"><span class="rp-label">跳跃</span><span class="rp-val">✓</span></div>`;
  if (r.canCrossLane) html += `<div class="rp-row"><span class="rp-label">跨线</span><span class="rp-val">✓</span></div>`;
  // 技能列表
  if (r.skills && SK) {
    html += `<div class="rp-sep">— 情境技能 —</div>`;
    for (const k in SK) {
      const sk = SK[k];
      const cd = r.skills[k] || 0;
      const ready = cd <= 0;
      const cdTxt = ready ? '就绪' : Math.ceil(cd) + 's';
      const last = r.lastSkill === k && r.lastSkillT < 3;
      html += `<div class="rp-skill${ready?' ready':' cooling'}${last?' just':''}" style="border-left-color:${sk.color}">`;
      html += `<span class="rp-sk-name">${sk.name}</span>`;
      html += `<span class="rp-sk-cd">${cdTxt}</span>`;
      html += `</div>`;
    }
  }
  panel.innerHTML = html;
}

/* ============ 波次结算 ============ */
function waveClear() {
  const lv = LEVELS.find(l => l.id === S.level) || LEVELS[0];
  const bonus = lv.waveBonus || 5;
  S.gold += bonus;

  if (S.wave >= 6) {
    // 进入下一关
    if (S.level >= 30) return win();
    S.level++;
    const nlv = LEVELS.find(l => l.id === S.level);
    S.chapter = nlv.chapter;
    S.wave = 1;
    // 解锁新单位
    S.unlockedTypes = Array.from(new Set([...S.unlockedTypes, ...nlv.unlock]));
    // 恢复心HP
    S.heartMax = S.chapter === 1 ? 100 : (S.chapter === 2 ? 140 : 180);
    S.heartHp = S.heartMax;
    // 清除敌人
    S.enemies = []; S.shots = []; S.floats = []; S.fx = [];
    buildLayout();
    // 骑马单位重新定位到新棋盘的合适格子（保留等级与冷却）
    relocateRidersForNewLevel();
    // 进入新关卡时给骑手回满血
    if (S.riders.length > 0) {
      S.riders.forEach(r => { r.hp = r.maxHp; r.dead = false; r.respawnT = 0; });
    }
    showLevelBanner(nlv);
    toShop(bonus);
  } else {
    S.wave++;
    toShop(bonus);
  }
  syncTop();
}

function showLevelBanner(lv) {
  let banner = $('levelBanner');
  if (!banner) { banner = document.createElement('div'); banner.id = 'levelBanner'; document.getElementById('app').appendChild(banner); }
  const layoutName = (LAYOUTS[lv.layout] && LAYOUTS[lv.layout].desc) || '';
  banner.innerHTML = `<div class="lb-title">第${lv.id}关 · ${layoutName}</div>${lv.rule ? `<div class="lb-rule">⚠ ${lv.rule.text}</div>` : ''}`;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 3500);
}

function toShop(bonus) {
  S.phase = 'shop';
  rollCards();
  $('shop').classList.remove('hidden');
  $('battleBar').classList.add('hidden');
  $('btnReroll').disabled = false;
  $('hint').textContent = '骑马单位已永久在场巡视，点卡牌→点格子放置兵种；同字合并升级';
  if (typeof bonus === 'number') toast('清场 +' + bonus + '💰');
  syncTop();
}

function gameOver() {
  S.phase = 'over';
  $('shop').classList.add('hidden'); $('battleBar').classList.add('hidden');
  overlay('阵地失守', `你在第${S.level}关第${S.wave}波倒下。<br>骑马单位虽可重生，心一旦失守便无可挽回。`, '再来一局', reset);
}

function win() {
  S.phase = 'over';
  $('shop').classList.add('hidden'); $('battleBar').classList.add('hidden');
  overlay('通关！', '30关全清，你玩不过我吧！<br>汉字成阵，西游归位，骑兵踏破千山。', '再玩一遍', reset);
}

function overlay(title, desc, btn, fn) {
  $('ovTitle').textContent = title; $('ovDesc').innerHTML = desc;
  $('ovBtn').textContent = btn; ovAction = fn;
  $('overlay').classList.remove('hidden');
}

/* ============ 绘制 ============ */
function draw() {
  ctx.save();
  if (S.shake > 0) { ctx.translate((Math.random()-.5)*S.shake, (Math.random()-.5)*S.shake); S.shake *= 0.86; }
  // 背景
  const g = ctx.createLinearGradient(0,0,0,H);
  if (S.chapter === 3) { g.addColorStop(0,'#2a2040'); g.addColorStop(1,'#1a1530'); }
  else if (S.chapter === 2) { g.addColorStop(0,'#ead6b5'); g.addColorStop(1,'#d8bd91'); }
  else { g.addColorStop(0,'#eee2c7'); g.addColorStop(1,'#d9c29a'); }
  ctx.fillStyle = g; ctx.fillRect(-20,-20,W+40,H+40);

  // ===== 章节主题色 =====
  const s = S.cellSize;
  const themes = {
    1: { cell: 'rgba(255,248,226,0.18)', cellFill: 'rgba(250,240,211,0.96)', border: 'rgba(101,76,40,0.35)', borderUnit: 'rgba(101,76,40,0.55)', obs: '#8a7a5a', obsDark: '#6a5a3a' },
    2: { cell: 'rgba(255,220,180,0.18)', cellFill: 'rgba(255,235,200,0.96)', border: 'rgba(140,60,30,0.4)', borderUnit: 'rgba(140,60,30,0.6)', obs: '#a04020', obsDark: '#702810' },
    3: { cell: 'rgba(220,200,255,0.18)', cellFill: 'rgba(240,230,255,0.96)', border: 'rgba(80,60,120,0.4)', borderUnit: 'rgba(80,60,120,0.6)', obs: '#5a4078', obsDark: '#3a2858' },
    4: { cell: 'rgba(255,240,200,0.18)', cellFill: 'rgba(255,248,220,0.96)', border: 'rgba(160,120,30,0.4)', borderUnit: 'rgba(160,120,30,0.6)', obs: '#b09020', obsDark: '#806810' },
  };
  const th = themes[S.chapter] || themes[1];

  // ===== 障碍物渲染 =====
  if (S.obstacles) {
    for (const o of S.obstacles) {
      ctx.save();
      ctx.translate(o.px, o.py);
      // 石头底座
      ctx.fillStyle = th.obsDark;
      ctx.beginPath();
      ctx.ellipse(0, s*0.1, s*0.42, s*0.28, 0, 0, Math.PI*2);
      ctx.fill();
      // 石头主体
      ctx.fillStyle = th.obs;
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
      // 高光
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
  }

  // ===== 骑马路径轨迹（在格子下方渲染） =====
  if (S.riders && S.riders.length > 0) {
    S.riders.forEach(rider => {
      if (rider.dead || !rider.history || rider.history.length < 2) return;
      for (let i = 0; i < rider.history.length - 1; i++) {
        const h = rider.history[i];
        const cell = S.cells.find(c => c.gc === h.x && c.gr === h.y);
        if (!cell) continue;
        const age = i / rider.history.length;
        const alpha = (1 - age) * 0.25;
        ctx.save();
        ctx.translate(cell.px, cell.py);
        ctx.fillStyle = `rgba(255,200,80,${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  // ===== 格子主体 =====
  for (const c of S.cells) {
    const u = c.unit;
    ctx.save();
    ctx.translate(c.px, c.py);
    roundRect(-s/2, -s/2, s, s, 10);
    ctx.fillStyle = u ? th.cellFill : th.cell;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = u ? (u.combo ? COMBO_INFO[UNITS[u.ch].combo].color : th.borderUnit) : th.border;
    if (u && u.combo) { ctx.lineWidth=4; ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=14; }
    ctx.stroke(); ctx.shadowBlur=0;

    // ===== 特殊格子标记 =====
    if (c.special && !u) {
      const sp = c.special;
      const spColors = { speed: '#4fc07a', rage: '#ff6a4a', heal: '#66ddff' };
      const spIcons = { speed: '速', rage: '怒', heal: '愈' };
      const col = spColors[sp] || '#aaa';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + Math.sin(S.time * 3) * 0.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.15 + Math.sin(S.time * 3) * 0.08;
      ctx.fillStyle = col;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.font = `900 ${s*0.28}px "PingFang SC",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(spIcons[sp] || '?', 0, 0);
    }

    // ===== 骑马当前格子高亮 =====
    if (S.riders && !u) {
      const onCell = S.riders.some(r => !r.dead && r.cx === c.gc && r.cy === c.gr);
      if (onCell) {
        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(S.time * 5) * 0.3;
        roundRect(-s/2-4, -s/2-4, s+8, s+8, 12);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ===== 镜像召唤提示 =====
    if (S.riders && u) {
      const onCell = S.riders.some(r => !r.dead && r.cx === c.gc && r.cy === c.gr);
      if (onCell) {
        const d = UNITS[u.ch];
        if (d && d.atk > 0) {
          ctx.strokeStyle = '#aaddff';
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.4 + Math.sin(S.time * 6) * 0.3;
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#aaddff';
          ctx.font = `700 ${s*0.14}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('✨', 0, -s*0.38);
        }
      }
    }

    // 选中卡牌时的放置预览
    if (S.phase==='shop' && S.selCard>=0 && (!u || u.ch===S.cards[S.selCard].ch)) {
      ctx.strokeStyle='#f4c95d'; ctx.lineWidth=3;
      ctx.setLineDash([6,5]); ctx.lineDashOffset=-S.time*30;
      roundRect(-s/2-3,-s/2-3,s+6,s+6,12); ctx.stroke(); ctx.setLineDash([]);
    }

    // ===== 悬停预览：攻击范围 =====
    if (S.hoverCell === S.cells.indexOf(c) && u) {
      const d = UNITS[u.ch];
      if (d && d.atk > 0) {
        ctx.strokeStyle = 'rgba(255,200,80,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4,4]);
        ctx.beginPath();
        ctx.arc(0, 0, d.range * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (u) {
      ctx.fillStyle = UNITS[u.ch].color;
      ctx.font = `900 ${s*0.5}px "PingFang SC",sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(u.ch, 0, -s*0.04);
      ctx.fillStyle='#8a6a30'; ctx.font=`700 ${s*0.17}px sans-serif`;
      ctx.fillText('Lv'+u.lv, 0, s*0.28);
      const hpw=s*0.72, ratio=Math.max(0,u.hp/unitMaxHp(u));
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(-hpw/2,s/2-8,hpw,4);
      ctx.fillStyle=ratio>0.4?'#4fc07a':'#e05a5a'; ctx.fillRect(-hpw/2,s/2-8,hpw*ratio,4);
      if (u.aura>1) { ctx.fillStyle='#4fc07a'; ctx.font=`700 ${s*0.15}px sans-serif`; ctx.fillText('▲速',0,-s*0.34); }
      // 集结号角增益：金色光环 + 标识
      if (u.rallyBuff>0) {
        ctx.strokeStyle='#ffdd44'; ctx.lineWidth=2;
        ctx.globalAlpha=0.5+Math.sin(S.time*6)*0.25;
        ctx.beginPath(); ctx.arc(0,0,s*0.42,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=1;
        ctx.fillStyle='#ffdd44'; ctx.font=`700 ${s*0.13}px sans-serif`;
        ctx.fillText('号', s*0.32, -s*0.32);
      }
    }
    if (S.selCell === S.cells.indexOf(c)) {
      ctx.strokeStyle='#7dd0ff'; ctx.lineWidth=3;
      roundRect(-s/2-3,-s/2-3,s+6,s+6,12); ctx.stroke();
    }
    ctx.restore();
  }
  // 组词连线
  for (let i=0;i<S.cells.length;i++) {
    const c=S.cells[i];
    if (c.unit&&c.unit.combo&&c.unit.partner>i) {
      const p=S.cells[c.unit.partner];
      ctx.strokeStyle=COMBO_INFO[UNITS[c.unit.ch].combo].color;
      ctx.lineWidth=3; ctx.globalAlpha=0.65+Math.sin(S.time*5)*0.25;
      ctx.beginPath(); ctx.moveTo(c.px,c.py); ctx.lineTo(p.px,p.py); ctx.stroke();
      ctx.globalAlpha=1;
    }
  }

  // 心
  const pulse = 1+Math.sin(S.time*3.2)*0.05;
  const hr = (S.chapter===1?s*0.4:s*0.34)*pulse;
  ctx.save(); ctx.translate(S.heartX,S.heartY);
  ctx.shadowColor='#ff5a6a'; ctx.shadowBlur=22;
  ctx.fillStyle='#e8404f';
  ctx.beginPath(); ctx.arc(0,0,hr,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font=`900 ${hr*1.1}px "PingFang SC",sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('心',0,1);
  const bw=hr*2.4, rr=Math.max(0,S.heartHp/S.heartMax);
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(-bw/2,hr+6,bw,5);
  ctx.fillStyle='#ff6a7a'; ctx.fillRect(-bw/2,hr+6,bw*rr,5);
  ctx.restore();

  // 敌人
  for (const e of S.enemies) {
    const d=ENEMY_DEFS[e.ch]||{color:'#999',r:15};
    ctx.save(); ctx.translate(e.x,e.y);
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0,e.r*0.85,e.r*0.8,e.r*0.3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=d.color;
    if(e.boss||e.elite){ctx.shadowColor=d.color;ctx.shadowBlur=16;}
    ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle=e.ch==='白骨精'?'#333':'#fff';
    const fs=e.ch.length>1?e.r*0.72:e.r*1.15;
    ctx.font=`900 ${fs}px "PingFang SC",sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(e.ch.length>2){ctx.fillText(e.ch.slice(0,2),0,-fs*0.4);ctx.fillText(e.ch.slice(2),0,fs*0.5);}
    else ctx.fillText(e.ch,0,1);
    const bw2=e.r*2.2,rr2=Math.max(0,e.hp/e.maxHp);
    ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(-bw2/2,-e.r-9,bw2,4);
    ctx.fillStyle=e.boss?'#ffb84f':'#ff6a6a';ctx.fillRect(-bw2/2,-e.r-9,bw2*rr2,4);
    ctx.restore();
  }

  // 弹道
  for (const s2 of S.shots) {
    ctx.fillStyle=s2.color;ctx.shadowColor=s2.color;ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(s2.x,s2.y,s2.splash?7:4.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }

  // 骑马单位
  if (S.riders && S.riders.length > 0) {
    drawRiders(ctx);
  }

  // 镜像单位
  if (S.riderMirrors && S.riderMirrors.length > 0) {
    drawMirrors(ctx);
  }

  // 特效
  for (const f of S.fx) {
    const dur=f.dur||0.35;
    const p=f.t/dur;
    ctx.globalAlpha=Math.max(0,1-p);
    if(f.type==='ring'||f.type==='boom'){
      ctx.strokeStyle=f.type==='boom'?'#ffb84f':f.color;
      ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(f.x,f.y,(f.r||16)*(0.6+p*1.5),0,Math.PI*2);ctx.stroke();
    } else if(f.type==='slash'){
      ctx.strokeStyle='#fff2d0';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(f.x-14,f.y-14+p*20);ctx.lineTo(f.x+14,f.y+10+p*20);ctx.stroke();
    } else if(f.type==='heal'){
      ctx.strokeStyle='#7dffa8';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(f.x,f.y,S.cellSize*0.5*(0.7+p),0,Math.PI*2);ctx.stroke();
    } else if(f.type==='whirlwind'){
      // 旋风斩：旋转刀刃 + 扩散环
      ctx.save();ctx.translate(f.x,f.y);ctx.rotate(p*Math.PI*5);
      ctx.strokeStyle='#ff66ff';ctx.lineWidth=3;
      ctx.shadowColor='#ff66ff';ctx.shadowBlur=12;
      for(let i=0;i<4;i++){
        ctx.rotate(Math.PI/2);
        ctx.beginPath();ctx.moveTo(0,0);
        ctx.lineTo(f.r*(0.4+p*0.6),0);ctx.stroke();
      }
      ctx.beginPath();ctx.arc(0,0,f.r*(0.3+p*0.7),0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=0;ctx.restore();
    } else if(f.type==='shockwave'){
      // 冲锋践踏：扩散震波 + 裂纹
      ctx.strokeStyle='#ffaa44';ctx.lineWidth=4*(1-p);
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.2+p*0.8),0,Math.PI*2);ctx.stroke();
      ctx.lineWidth=2*(1-p);
      for(let i=0;i<6;i++){
        const ang=(i/6)*Math.PI*2;
        ctx.beginPath();ctx.moveTo(f.x,f.y);
        ctx.lineTo(f.x+Math.cos(ang)*f.r*(0.3+p*0.7),f.y+Math.sin(ang)*f.r*(0.3+p*0.7));
        ctx.stroke();
      }
    } else if(f.type==='lightning'){
      // 连环闪电：锯齿状电弧
      ctx.strokeStyle='#ffee66';ctx.lineWidth=2;
      ctx.shadowColor='#ffee66';ctx.shadowBlur=10;
      ctx.beginPath();ctx.moveTo(f.x,f.y);
      const segs=5;
      for(let i=1;i<=segs;i++){
        const t=i/segs;
        const x=f.x+(f.tx-f.x)*t+(Math.random()-0.5)*14;
        const y=f.y+(f.ty-f.y)*t+(Math.random()-0.5)*14;
        ctx.lineTo(x,y);
      }
      ctx.stroke();ctx.shadowBlur=0;
    } else if(f.type==='rally'){
      // 集结号角：金色光环 + 星点
      ctx.strokeStyle='#ffdd44';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.5+p*0.5),0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#ffdd44';
      for(let i=0;i<4;i++){
        const ang=p*Math.PI*2+(i/4)*Math.PI*2;
        const r=f.r*(0.3+p*0.4);
        ctx.beginPath();ctx.arc(f.x+Math.cos(ang)*r,f.y+Math.sin(ang)*r,2.5*(1-p),0,Math.PI*2);ctx.fill();
      }
    } else if(f.type==='berserk'){
      // 绝地狂暴：红色爆发 + 火星
      ctx.strokeStyle='#ff4444';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.5+p*0.5),0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#ff6644';
      for(let i=0;i<8;i++){
        const ang=(i/8)*Math.PI*2;
        const r=f.r*(0.2+p*0.7);
        ctx.beginPath();ctx.arc(f.x+Math.cos(ang)*r,f.y+Math.sin(ang)*r,3*(1-p),0,Math.PI*2);ctx.fill();
      }
    } else if(f.type==='leap'){
      // 跳跃突袭：起点→终点拖尾
      ctx.strokeStyle='#66ddff';ctx.lineWidth=3*(1-p);
      ctx.shadowColor='#66ddff';ctx.shadowBlur=8;
      ctx.setLineDash([4,4]);ctx.lineDashOffset=-p*20;
      ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.tx,f.ty);ctx.stroke();
      ctx.setLineDash([]);ctx.shadowBlur=0;
    }
    ctx.globalAlpha=1;
  }
  // 飘字
  for (const f of S.floats) {
    ctx.globalAlpha=Math.max(0,1-f.t/(f.big?1.4:0.8));
    ctx.fillStyle=f.color;
    ctx.font=`900 ${f.big?20:15}px "PingFang SC",sans-serif`;
    ctx.textAlign='center';
    ctx.fillText(f.txt,f.x,f.y-f.t*34);
    ctx.globalAlpha=1;
  }
  ctx.restore();
}

function roundRect(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

/* ============ 主循环 ============ */
let last=0, lastTick=0, rafOk=false;
function loop(ts){
  ts=ts||performance.now();
  const dt=Math.min(0.05,(ts-last)/1000||0);
  last=ts;lastTick=performance.now();S.time+=dt;
  if(S.phase==='battle') updateBattle(dt);
  S.fx.forEach(f=>f.t+=dt);S.fx=S.fx.filter(f=>f.t<(f.dur||0.35));
  S.floats.forEach(f=>f.t+=dt);S.floats=S.floats.filter(f=>f.t<(f.big?1.4:0.8));
  syncTop();draw();
  if(rafOk) requestAnimationFrame(loop);
}

function startLoop(){
  requestAnimationFrame(ts=>{rafOk=true;loop(ts);});
  setTimeout(()=>{
    if(!rafOk||performance.now()-lastTick>400){
      rafOk=false;
      setInterval(()=>loop(performance.now()),1000/60);
    }
  },300);
}

/* ============ 初始化 ============ */
function reset() {
  const lv0 = LEVELS[0];
  S.level = 1; S.chapter = 1; S.wave = 1;
  S.gold = 12;
  S.heartMax = 100; S.heartHp = 100;
  S.enemies = []; S.shots = []; S.floats = []; S.fx = [];
  S.cells = []; S.selCard = -1; S.selCell = -1; S.hoverCell = -1; S.dragging = -1;
  S.riders = [];
  S.unlockedTypes = ['箭','切','盾','速'];
  S.speed = 1;
  // 应用第1关解锁
  S.unlockedTypes = Array.from(new Set([...S.unlockedTypes, ...lv0.unlock]));
  hideInfo();
  buildLayout();
  // 骑马单位默认永久存在，无需合成
  spawnDefaultRider();
  toShop();
}

/* 创建初始骑马单位（在心的右侧第一格） */
function spawnDefaultRider() {
  if (S.riders.length > 0) return;
  // 找一个离心最近的空格作为出生点
  let slot = S.cells.find(c => !c.unit) || S.cells[0];
  const rider = makeRider(slot.gc, lrow(slot), 1);
  S.riders.push(rider);
  if (window.initRider) window.initRider(rider);
  else initRider(rider);
  // 应用当前关卡规则
  if (window.applyRiderRules) window.applyRiderRules(rider);
}

/* 进入新关卡时，把骑马单位重新定位到新棋盘的合适格子 */
function relocateRidersForNewLevel() {
  if (!S.riders || S.riders.length === 0) return;
  const slot = S.cells.find(c => !c.unit) || S.cells[0];
  S.riders.forEach(rider => {
    rider.cx = slot.gc;
    rider.cy = slot.gr;
    rider.fromX = slot.gc;
    rider.fromY = slot.gr;
    rider.toX = slot.gc;
    rider.toY = slot.gr;
    rider.progress = 0;
    rider.px = slot.px;
    rider.py = slot.py;
    rider.history = [{ x: rider.cx, y: rider.cy }];
    rider.buffs = { berserk: 0, rallyAura: 0, leaping: 0 };
    if (window.applyRiderRules) window.applyRiderRules(rider);
    if (window.initRider) window.initRider(rider);
    else initRider(rider);
  });
}

ovAction = reset;
resize();
reset();
startLoop();
