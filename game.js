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
  // 新增原版兵种
  '疗': { cost: 4, name: '疗·医仙', atk: 0,  range: 0,  aspd: 0,   hp: 60,  color: '#4ade80', desc: '治疗相邻友军', heal: true },
  '退': { cost: 3, name: '退·力士', atk: 10, range: 1,  aspd: 0.8, hp: 90,  color: '#60a5fa', desc: '击退敌人', knockback: true },
  '神': { cost: 6, name: '神·战神', atk: 25, range: 2,  aspd: 0.7, hp: 100, color: '#fbbf24', desc: '神圣攻击·克制妖', counter: '妖' },
  '豪': { cost: 8, name: '豪·财神', atk: 18, range: 2,  aspd: 0.9, hp: 85,  color: '#f59e0b', desc: '击杀掉落额外金币', goldDrop: true },
  '娥': { cost: 5, name: '娥·嫦娥', atk: 14, range: 4,  aspd: 0.8, hp: 50,  color: '#ec4899', desc: '远程月光攻击', moon: true },
  '爆': { cost: 5, name: '爆·炸弹', atk: 0,  range: 0,  aspd: 0,   hp: 50,  color: '#ef4444', desc: '死亡时爆炸伤害', explode: true },
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
  '唐僧': { desc: '唐僧·慈悲为怀：持续治疗+佛光普照大招', color: '#ffd700' },
  '悟空': { desc: '悟空·大闹天宫：金箍棒横扫+击飞', color: '#ff8c00' },
  '八戒': { desc: '八戒·食色性也：扇形横扫+吸血+狂暴', color: '#4682b4' },
  '沙僧': { desc: '沙僧·金身罗汉：分担伤害+死亡爆炸', color: '#2e8b57' },
  '子牙': { desc: '子牙·封神榜：全场减速+打神鞭定身', color: '#daa520' },
  '公豹': { desc: '公豹·截教天阵：召唤魔物+自爆', color: '#8b008b' },
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
  return { ch, lv: 1, hp: d.hp, maxHp: d.hp, cd: 0, healT: 0, combo: false, partner: -1, aura: 1, dead: false, rallyBuff: 0,
    comboSkillCd: 0, comboSkillT: 0, comboCharge: 0, charge: 0, maxCharge: MIRROR_CHARGE_MAX };
}

/* 可生成镜像的兵种判定：合成单位 或 武械栏携带的特殊兵种 */
const MIRROR_CHARGE_MAX = 100;
const MIRROR_SPECIAL_TYPES = new Set(['神','豪','娥','爆','退','疗','弓','炮']);  // 特殊兵种可充能
function canMirrorUnit(u) {
  if (!u) return false;
  const d = UNITS[u.ch];
  if (!d || !d.atk || d.atk <= 0) return false;
  return u.combo || MIRROR_SPECIAL_TYPES.has(u.ch);
}

function effStat(u) {
  const d = UNITS[u.ch];
  const m = Math.pow(1.5, u.lv - 1);
  let atk = d.atk * m, range = d.range, aspd = d.aspd * u.aura, splash = 0;
  if (u.rallyBuff > 0) aspd *= 1.4;
  if (u.combo && (u.ch === '悟' || u.ch === '空')) { atk = 22 * m; range = 3; aspd = 1.15 * u.aura; splash = 60; }
  if (u.combo && (u.ch === '八' || u.ch === '戒')) { atk = 26 * m; range = 1; aspd = 1.0 * u.aura; splash = 30; }
  if (u.combo && (u.ch === '姜' || u.ch === '牙')) { atk = 14 * m; range = 4; aspd = 0.9 * u.aura; }
  if (u.combo && (u.ch === '申' || u.ch === '豹')) { atk = 16 * m; range = 2; aspd = 0.95 * u.aura; }
  if (u.combo && (u.ch === '沙')) { atk = 8 * m; range = 2; aspd = 0.8 * u.aura; }
  if (u.rallyBuff > 0 && u.combo) { aspd *= 1.4; }

  // ===== 武器和天赋加成 =====
  if (typeof calcUnitFinalStats === 'function' && typeof SaveMgr !== 'undefined') {
    const baseAtk = d.atk || 1;
    const finalStats = calcUnitFinalStats(u);
    const atkMul = finalStats.atk / Math.max(1, baseAtk);
    atk *= atkMul;
  }

  return { atk, range, aspd, splash };
}

function unitMaxHp(u) {
  let hp = UNITS[u.ch].hp * Math.pow(1.5, u.lv - 1);
  // 武器和天赋加成
  if (typeof calcUnitFinalStats === 'function' && typeof SaveMgr !== 'undefined') {
    const baseHp = UNITS[u.ch].hp || 1;
    const finalStats = calcUnitFinalStats(u);
    const hpMul = finalStats.hp / Math.max(1, baseHp);
    hp *= hpMul;
  }
  return hp;
}

/* ============ 商店 ============ */
const cardsEl = document.getElementById('cards');
function shopPool() {
  const lv = LEVELS.find(l => l.id === S.level) || LEVELS[0];
  const unlocked = S.unlockedTypes.length > 0 ? S.unlockedTypes : ['箭','切','盾','速'];
  const weights = { 
    '箭':3,'切':3,'盾':3,'速':2,'枪':2,
    '疗':2,'退':2,'神':1,'豪':1,'娥':1,'爆':2,
    '雷':2,'冰':2,'火':2,'毒':2,'奶':2,
    '弓':1,'炮':1,'刺':1,'甲':1,'锤':1,
    '唐':2,'僧':2,'悟':1,'空':1,'八':2,'戒':2,'沙':1,
    '姜':1,'牙':1,'申':1,'豹':1,'吒':1 
  };
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
  $('tbChapter').textContent = '第' + S.chapter + '章';
  $('tbGold').textContent = S.gold;
  
  // 波次圆点
  const waveDots = $('waveDots');
  if (waveDots) {
    const dots = waveDots.querySelectorAll('.dot');
    const totalWaves = 5;
    const currentWave = Math.min(S.wave, totalWaves);
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i < currentWave);
    });
  }
  
  // 历史最高波次
  const save = typeof SaveMgr !== 'undefined' ? SaveMgr.get() : null;
  $('tbBestWave').textContent = save ? (save.highestWave || 0) : (S.wave - 1);
  $('tbMaxWave').textContent = 15;
  
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
  // 基地满血按钮：战斗中且血量低于100%时显示
  const btnFullHp = $('btnFullHp');
  if (btnFullHp) {
    btnFullHp.classList.toggle('hidden', S.phase !== 'battle' || S.heartHp >= S.heartMax);
  }
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

/* ============ 基地满血按钮 ============ */
$('btnFullHp').onclick = () => {
  if (S.phase !== 'battle' || S.heartHp >= S.heartMax) return;
  const cost = Math.ceil((S.heartMax - S.heartHp) * 0.2);
  if (S.gold < cost) { toast('金币不够！需要 ' + cost + '💰'); return; }
  S.gold -= cost;
  S.heartHp = S.heartMax;
  S.fx.push({ type: 'combo_buddha_big', x: S.heartX, y: S.heartY, t: 0, r: S.cellSize * 2, dur: 0.8 });
  S.floats.push({ x: S.heartX, y: S.heartY - 30, t: 0, txt: '❤️基地满血!', color: '#ff6b6b', big: true });
  syncTop();
};

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
    if (u.rallyBuff > 0) u.rallyBuff -= sdt;
    if (u.comboSkillCd > 0) u.comboSkillCd -= sdt;
    if (u.comboSkillT > 0) u.comboSkillT -= sdt;
    const st = effStat(u);
    const comboName = u.combo ? UNITS[u.ch].combo : null;

    // ===== 镜魂：骑马踩踏充能机制 =====
    // 充能满后自动生成镜像（在 onArriveCell 中处理充能递增）

    // ===== 唐僧：慈悲为怀（持续治疗）+ 佛光普照（大招） =====
    if (comboName === '唐僧') {
      u.healT -= sdt;
      if (u.healT <= 0) {
        u.healT = 1.4;
        const amt = 3 * Math.pow(1.5, u.lv - 1);
        S.heartHp = Math.min(S.heartMax, S.heartHp + amt);
        S.cells.forEach(c2 => { if (c2.unit) c2.unit.hp = Math.min(unitMaxHp(c2.unit), c2.unit.hp + amt); });
        S.fx.push({ type: 'combo_heal', x: cell.px, y: cell.py, t: 0, r: S.cellSize * 0.6, dur: 0.6 });
      }
      // 佛光普照大招：每7秒一次
      if (u.comboSkillCd <= 0) {
        u.comboSkillCd = 7.0;
        u.comboSkillT = 1.0;
        const bigAmt = 12 * Math.pow(1.5, u.lv - 1);
        S.heartHp = Math.min(S.heartMax, S.heartHp + bigAmt);
        S.cells.forEach(c2 => {
          if (c2.unit) {
            c2.unit.hp = Math.min(unitMaxHp(c2.unit), c2.unit.hp + bigAmt);
            c2.unit.shield = Math.max(c2.unit.shield || 0, bigAmt * 0.5);
            S.fx.push({ type: 'combo_buddha', x: c2.px, y: c2.py, t: 0, dur: 0.8 });
          }
        });
        S.fx.push({ type: 'combo_buddha_big', x: S.heartX, y: S.heartY, t: 0, r: S.cellSize * 3, dur: 1.2 });
        S.floats.push({ x: cell.px, y: cell.py - 30, t: 0, txt: '☀️佛光普照!', color: '#ffd700', big: true });
        S.shake = Math.max(S.shake, 4);
      }
      return; // 唐僧不攻击
    }

    // ===== 沙僧：金身罗汉（分担伤害）+ 卷帘大将（死亡爆炸） =====
    if (comboName === '沙僧') {
      // 为相邻单位分担30%伤害（被动，在敌人攻击时处理）
      // 自身减伤20%
      // 死亡时爆炸眩晕（在单位死亡时处理）
    }

    // ===== 子牙：封神榜（全场减速）+ 打神鞭（定身大招） =====
    if (comboName === '子牙') {
      // 被动：全场敌人减速30%（在敌人移动时处理）
      S.enemies.forEach(e => {
        if (e.dead) return;
        e.jiangSlow = Math.max(e.jiangSlow || 0, 0.1);
      });
      // 打神鞭大招：每8秒，对所有敌人造成伤害+定身1.5秒
      if (u.comboSkillCd <= 0 && S.enemies.length > 0) {
        u.comboSkillCd = 8.0;
        u.comboSkillT = 0.8;
        const whipDmg = st.atk * 2.5;
        S.enemies.forEach(e => {
          if (e.dead) return;
          e.hp -= whipDmg;
          e.root = Math.max(e.root || 0, 1.5);
          S.floats.push({ x: e.x, y: e.y - 16, t: 0, txt: '⚡' + Math.round(whipDmg), color: '#daa520' });
          S.fx.push({ type: 'combo_whip', x: e.x, y: e.y, t: 0, dur: 0.5 });
        });
        S.fx.push({ type: 'combo_whip_big', x: S.heartX, y: S.heartY, t: 0, r: Math.max(W, H), dur: 0.8 });
        S.floats.push({ x: cell.px, y: cell.py - 30, t: 0, txt: '📜打神鞭!', color: '#daa520', big: true });
        S.shake = Math.max(S.shake, 6);
      }
    }

    // ===== 公豹：截教天阵（召唤魔物）+ 魔化自爆 =====
    if (comboName === '公豹') {
      // 每6秒召唤一个小魔物
      if (u.comboSkillCd <= 0) {
        u.comboSkillCd = 6.0;
        u.comboSkillT = 0.5;
        const summon = {
          ch: '魔', x: cell.px + (Math.random() - 0.5) * 40, y: cell.py + S.cellSize * 0.3,
          hp: 30 * Math.pow(1.5, u.lv - 1), maxHp: 30 * Math.pow(1.5, u.lv - 1),
          spd: 55, atk: 8 * Math.pow(1.5, u.lv - 1), r: 12, cd: 0,
          boss: false, elite: false, dead: false,
          friendly: true, lifetime: 10, explodeDmg: st.atk * 2.2,
        };
        if (!S.friendlies) S.friendlies = [];
        S.friendlies.push(summon);
        S.fx.push({ type: 'combo_summon', x: summon.x, y: summon.y, t: 0, dur: 0.6 });
        S.floats.push({ x: cell.px, y: cell.py - 28, t: 0, txt: '👿召唤!', color: '#8b008b', big: true });
      }
    }

    if (st.atk <= 0 || st.aspd <= 0) return;
    u.cd -= sdt;
    if (u.cd > 0) return;
    const tg = unitTarget(cell, st.range);
    if (!tg) return;
    u.cd = 1 / st.aspd;

    // ===== 悟空：大闹天宫（概率触发金箍棒横扫+击飞） =====
    if (comboName === '悟空' && Math.random() < 0.25) {
      u.comboSkillT = 0.4;
      const smashDmg = st.atk * 1.8;
      const smashR = S.cellSize * 1.4;
      S.enemies.forEach(e => {
        if (e.dead) return;
        const d = dist(e.x, e.y, tg.x, tg.y);
        if (d < smashR) {
          e.hp -= smashDmg * (1 - d / smashR * 0.4);
          e.knockback = 0.4;
          e.knockbackX = (e.x - tg.x) * 0.5;
          e.knockbackY = (e.y - tg.y) * 0.5;
          S.floats.push({ x: e.x, y: e.y - 14, t: 0, txt: '🍭' + Math.round(smashDmg), color: '#ff8c00' });
        }
      });
      S.fx.push({ type: 'combo_monkey', x: tg.x, y: tg.y, t: 0, r: smashR, dur: 0.5 });
      S.shake = Math.max(S.shake, 5);
      S.floats.push({ x: cell.px, y: cell.py - 28, t: 0, txt: '🐵大闹天宫!', color: '#ff8c00', big: true });
    }

    // ===== 八戒：食色性也（扇形横扫+吸血+低血量狂暴） =====
    if (comboName === '八戒') {
      const lowHp = u.hp / unitMaxHp(u) < 0.4;
      const berserkMul = lowHp ? 1.5 : 1;
      const fanDmg = st.atk * 1.3 * berserkMul;
      const fanAngle = Math.PI * 0.7;
      // 找朝向
      const ang = Math.atan2(tg.y - cell.py, tg.x - cell.px);
      let hit = 0, totalDmg = 0;
      S.enemies.forEach(e => {
        if (e.dead) return;
        const d = dist(e.x, e.y, cell.px, cell.py);
        if (d < S.cellSize * 1.5) {
          const ea = Math.atan2(e.y - cell.py, e.x - cell.px);
          let diff = Math.abs(ea - ang);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < fanAngle / 2) {
            e.hp -= fanDmg;
            hit++;
            totalDmg += fanDmg;
            S.floats.push({ x: e.x, y: e.y - 12, t: 0, txt: '🥬' + Math.round(fanDmg), color: '#4682b4' });
          }
        }
      });
      // 吸血：回复造成伤害的25%
      if (hit > 0) {
        const heal = totalDmg * 0.25;
        u.hp = Math.min(unitMaxHp(u), u.hp + heal);
        S.fx.push({ type: 'combo_pig', x: cell.px, y: cell.py, t: 0, ang: ang, r: S.cellSize * 1.5, dur: 0.4 });
        if (lowHp) {
          S.floats.push({ x: cell.px, y: cell.py - 26, t: 0, txt: '🐷狂暴!', color: '#ff4444', big: true });
        }
      }
      return; // 八戒用扇形攻击代替普通攻击
    }

    // ===== 退·力士：击退敌人 =====
    if (UNITS[u.ch].knockback) {
      damageEnemy(tg, st.atk, '#60a5fa');
      tg.knockback = 0.5;
      tg.knockbackX = (tg.x - cell.px) * 0.6;
      tg.knockbackY = (tg.y - cell.py) * 0.6;
      S.fx.push({ type: 'knockback', x: tg.x, y: tg.y, t: 0, dur: 0.4 });
      return;
    }

    // ===== 神·战神：神圣攻击·克制妖 =====
    if (UNITS[u.ch].counter === '妖') {
      const isYao = tg.ch === '妖';
      const finalDmg = isYao ? st.atk * 1.8 : st.atk;
      if (st.range > 1) {
        S.shots.push({ x: cell.px, y: cell.py, tx: tg.x, ty: tg.y, tg, dmg: finalDmg, splash: st.splash, t: 0, color: '#fbbf24' });
      } else {
        damageEnemy(tg, finalDmg, '#fbbf24');
        S.fx.push({ type: 'slash', x: tg.x, y: tg.y, t: 0 });
      }
      if (isYao) {
        S.floats.push({ x: tg.x, y: tg.y - 16, t: 0, txt: '⚔️克制!', color: '#fbbf24', big: true });
      }
      return;
    }

    // ===== 豪·财神：击杀掉落额外金币 =====
    if (UNITS[u.ch].goldDrop) {
      if (st.range > 1) {
        S.shots.push({ x: cell.px, y: cell.py, tx: tg.x, ty: tg.y, tg, dmg: st.atk, splash: st.splash, t: 0, color: '#f59e0b', goldDrop: true });
      } else {
        damageEnemy(tg, st.atk, '#f59e0b');
        S.fx.push({ type: 'slash', x: tg.x, y: tg.y, t: 0 });
      }
      return;
    }

    // ===== 娥·嫦娥：月光攻击 =====
    if (UNITS[u.ch].moon) {
      S.shots.push({ x: cell.px, y: cell.py, tx: tg.x, ty: tg.y, tg, dmg: st.atk, splash: st.splash, t: 0, color: '#ec4899', moon: true });
      return;
    }

    // ===== 爆·炸弹：死亡时爆炸（在单位死亡时处理） =====

    // 普通攻击
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
        // ===== 豪·财神：击杀掉落额外金币 =====
        if (s.goldDrop && s.tg.hp <= 0) {
          const extraGold = Math.floor(Math.random() * 3) + 2;
          S.gold += extraGold;
          S.floats.push({ x: s.tg.x, y: s.tg.y - 34, t: 0, txt: '+' + extraGold + '💰', color: '#f59e0b', big: true });
        }
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
    if (window.updateFireTrails) updateFireTrails(sdt);
  }

  // 镜像单位更新
  if (S.riderMirrors && S.riderMirrors.length > 0) {
    updateMirrors(sdt);
  }

  // 公豹召唤的友军单位
  if (S.friendlies && S.friendlies.length > 0) {
    for (let i = S.friendlies.length - 1; i >= 0; i--) {
      const f = S.friendlies[i];
      if (f.dead) { S.friendlies.splice(i, 1); continue; }
      f.lifetime -= sdt;
      if (f.lifetime <= 0) {
        // 自爆
        const er = S.cellSize * 1.5;
        S.enemies.forEach(e => {
          if (e.dead) return;
          if (dist(e.x, e.y, f.x, f.y) < er) {
            e.hp -= f.explodeDmg || 20;
            S.floats.push({ x: e.x, y: e.y - 12, t: 0, txt: '💥' + Math.round(f.explodeDmg || 20), color: '#8b008b' });
          }
        });
        S.fx.push({ type: 'combo_explode', x: f.x, y: f.y, t: 0, r: er, dur: 0.5 });
        f.dead = true;
        continue;
      }
      // 找最近的敌人
      let best = null, bestDist = Infinity;
      S.enemies.forEach(e => {
        if (e.dead) return;
        const d = dist(e.x, e.y, f.x, f.y);
        if (d < bestDist) { bestDist = d; best = e; }
      });
      if (best) {
        if (bestDist > f.r + 8) {
          const k = (f.spd * sdt) / bestDist;
          f.x += (best.x - f.x) * k;
          f.y += (best.y - f.y) * k;
        } else {
          f.cd -= sdt;
          if (f.cd <= 0) {
            f.cd = 1;
            best.hp -= f.atk;
            S.floats.push({ x: best.x, y: best.y - 10, t: 0, txt: '-' + f.atk, color: '#9333ea' });
            S.fx.push({ type: 'slash', x: best.x, y: best.y, t: 0 });
          }
        }
      }
    }
  }

  // 敌人移动/攻击
  for (const e of S.enemies) {
    if (e.dead) continue;
    if (e.jiangSlow > 0) e.jiangSlow -= sdt;
    if (e.root > 0) e.root -= sdt;
    if (e.knockback > 0) {
      e.knockback -= sdt;
      e.x += (e.knockbackX || 0) * sdt * 3;
      e.y += (e.knockbackY || 0) * sdt * 3;
    }
    if (e.stun > 0) { e.stun -= sdt; continue; }
    if (e.burning > 0) e.burning -= sdt;

    let spdMul = 1;
    if (e.jiangSlow > 0) spdMul *= 0.65;
    if (e.root > 0) spdMul = 0;

    let tgx = S.heartX, tgy = S.heartY, tgCell = null, tgMirror = null, bd = dist(e.x, e.y, S.heartX, S.heartY);
    for (const c of S.cells) {
      if (!c.unit) continue;
      const d = dist(e.x, e.y, c.px, c.py);
      if (d < bd) { bd = d; tgx = c.px; tgy = c.py; tgCell = c; tgMirror = null; }
    }
    // 镜像也是攻击目标
    if (S.riderMirrors) {
      for (const m of S.riderMirrors) {
        if (m.dead) continue;
        const d = Math.hypot(m.x - e.x, m.y - e.y);
        if (d < bd) { bd = d; tgx = m.x; tgy = m.y; tgCell = null; tgMirror = m; }
      }
    }
    const reach = (tgCell || tgMirror) ? S.cellSize * 0.55 + e.r : S.cellSize * 0.45 + e.r;
    if (bd > reach) {
      const k = (e.spd * spdMul * sdt) / bd;
      e.x += (tgx - e.x) * k; e.y += (tgy - e.y) * k;
    } else {
      e.cd -= sdt;
      if (e.cd <= 0) {
        e.cd = 1;
        if (tgMirror) {
          // ===== 攻击镜像 =====
          let dmg = e.atk;
          tgMirror.hp -= dmg;
          S.floats.push({ x: tgMirror.x, y: tgMirror.y + 10, t: 0, txt: '-' + Math.round(dmg), color: '#ff9a9a' });
          S.fx.push({ type: 'slash', x: tgMirror.x, y: tgMirror.y, t: 0 });
          if (tgMirror.hp <= 0) {
            tgMirror.dead = true;
            // 爆·炸弹：镜像死亡时爆炸
            if (UNITS[tgMirror.ch] && UNITS[tgMirror.ch].explode) {
              const expDmg = 20 * Math.pow(1.5, tgMirror.lv - 1);
              const expR = S.cellSize * 1.4;
              S.enemies.forEach(e2 => {
                if (e2.dead) return;
                if (dist(e2.x, e2.y, tgMirror.x, tgMirror.y) < expR) {
                  e2.hp -= expDmg;
                  S.floats.push({ x: e2.x, y: e2.y - 12, t: 0, txt: '💥' + Math.round(expDmg), color: '#ef4444' });
                }
              });
              S.fx.push({ type: 'boom', x: tgMirror.x, y: tgMirror.y, t: 0, r: expR });
              S.shake = Math.max(S.shake, 5);
            }
            S.fx.push({ type: 'ring', x: tgMirror.x, y: tgMirror.y, t: 0, r: 14, color: tgMirror.color, dur: 0.4 });
          }
        } else if (tgCell) {
          let dmg = e.atk;
          const shaCell = S.cells.find(c => c.unit && c.unit.combo && UNITS[c.unit.ch].combo === '沙僧' && adjacent(c, tgCell));
          if (shaCell) {
            const share = dmg * 0.3;
            dmg *= 0.7;
            shaCell.unit.hp -= share * 0.5;
            S.floats.push({ x: shaCell.px, y: shaCell.py + 8, t: 0, txt: '-' + Math.round(share * 0.5), color: '#2e8b57' });
          }
          if (tgCell.unit.shield && tgCell.unit.shield > 0) {
            const sa = Math.min(tgCell.unit.shield, dmg);
            tgCell.unit.shield -= sa;
            dmg -= sa;
            if (sa > 0) S.floats.push({ x: tgCell.px, y: tgCell.py - 4, t: 0, txt: '🛡️' + Math.round(sa), color: '#88ddff' });
          }
          tgCell.unit.hp -= dmg;
          S.floats.push({ x: tgCell.px, y: tgCell.py + 10, t: 0, txt: '-' + Math.round(dmg), color: '#ff9a9a' });
          if (tgCell.unit.hp <= 0) {
            if (tgCell.unit.combo && UNITS[tgCell.unit.ch].combo === '沙僧') {
              const ed = 20 * Math.pow(1.5, tgCell.unit.lv - 1);
              S.enemies.forEach(e2 => {
                if (e2.dead) return;
                if (dist(e2.x, e2.y, tgCell.px, tgCell.py) < S.cellSize * 1.8) {
                  e2.hp -= ed;
                  e2.stun = Math.max(e2.stun || 0, 1.0);
                  S.floats.push({ x: e2.x, y: e2.y - 12, t: 0, txt: '💥' + Math.round(ed), color: '#2e8b57' });
                }
              });
              S.fx.push({ type: 'combo_sha_explode', x: tgCell.px, y: tgCell.py, t: 0, r: S.cellSize * 1.8, dur: 0.7 });
              S.shake = Math.max(S.shake, 8);
            }
            // ===== 爆·炸弹：死亡时爆炸 =====
            if (UNITS[tgCell.unit.ch].explode) {
              const expDmg = 30 * Math.pow(1.5, tgCell.unit.lv - 1);
              const expR = S.cellSize * 1.6;
              S.enemies.forEach(e2 => {
                if (e2.dead) return;
                if (dist(e2.x, e2.y, tgCell.px, tgCell.py) < expR) {
                  e2.hp -= expDmg;
                  S.floats.push({ x: e2.x, y: e2.y - 12, t: 0, txt: '💥' + Math.round(expDmg), color: '#ef4444' });
                }
              });
              S.fx.push({ type: 'boom', x: tgCell.px, y: tgCell.py, t: 0, r: expR });
              S.shake = Math.max(S.shake, 6);
            }
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
let _riderPanelDrag = { dragging: false, startX: 0, startY: 0, startRight: 0, startBottom: 0, moved: false };

function updateRiderPanel() {
  const panel = $('riderPanel');
  if (!panel) return;
  if (!S.riders || S.riders.length === 0) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  const r = S.riders[0];
  const SK = window.RIDER_SKILLS || RIDER_SKILLS;
  const body = panel.querySelector('.rp-body');
  if (!body) return;
  let html = `<div class="rp-title">🐴 骑术面板 · Lv${r.level}</div>`;
  html += `<div class="rp-row"><span class="rp-label">HP</span><span class="rp-val">${Math.ceil(r.hp)}/${Math.ceil(r.maxHp)}</span></div>`;
  html += `<div class="rp-row"><span class="rp-label">攻击</span><span class="rp-val">${Math.round(r.atk)}${r.buffs&&r.buffs.berserk>0?' 🔥':''}</span></div>`;
  html += `<div class="rp-row"><span class="rp-label">移速</span><span class="rp-val">${r.speed.toFixed(1)}格/s${r.buffs&&r.buffs.speedUp>0?' 🌬️':''}</span></div>`;
  html += `<div class="rp-row"><span class="rp-label">冲锋</span><span class="rp-val">×${(RIDER_CFG.chargeBonus * (r.chargeBonusMul||1)).toFixed(1)}</span></div>`;
  html += `<div class="rp-row"><span class="rp-label">经验</span><span class="rp-val">${r.exp}/${r.expToNext}</span></div>`;
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
      html += `<span class="rp-sk-name">${sk.icon||'✦'} ${sk.name}</span>`;
      html += `<span class="rp-sk-cd">${cdTxt}</span>`;
      html += `</div>`;
    }
  }
  body.innerHTML = html;
}

function setupRiderPanelDrag() {
  const panel = $('riderPanel');
  const handle = $('rpHandle');
  if (!panel || !handle) return;

  const onDown = (e) => {
    _riderPanelDrag.dragging = true;
    _riderPanelDrag.moved = false;
    const pt = e.touches ? e.touches[0] : e;
    _riderPanelDrag.startX = pt.clientX;
    _riderPanelDrag.startY = pt.clientY;
    const rect = panel.getBoundingClientRect();
    const parentRect = panel.parentElement.getBoundingClientRect();
    _riderPanelDrag.startRight = parentRect.right - rect.right;
    _riderPanelDrag.startBottom = parentRect.bottom - rect.bottom;
    e.preventDefault();
  };

  const onMove = (e) => {
    if (!_riderPanelDrag.dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - _riderPanelDrag.startX;
    const dy = pt.clientY - _riderPanelDrag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) _riderPanelDrag.moved = true;
    const newRight = _riderPanelDrag.startRight - dx;
    const newBottom = _riderPanelDrag.startBottom - dy;
    panel.style.right = Math.max(4, newRight) + 'px';
    panel.style.bottom = Math.max(4, newBottom) + 'px';
    panel.style.left = 'auto';
    panel.style.top = 'auto';
    e.preventDefault();
  };

  const onUp = (e) => {
    if (!_riderPanelDrag.dragging) return;
    _riderPanelDrag.dragging = false;
    if (!_riderPanelDrag.moved) {
      panel.classList.toggle('collapsed');
    }
  };

  handle.addEventListener('mousedown', onDown);
  handle.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);
}

/* ============ 波次结算 ============ */
function waveClear() {
  const lv = LEVELS.find(l => l.id === S.level) || LEVELS[0];
  const bonus = lv.waveBonus || 5;
  S.gold += bonus;

  if (S.wave >= 6) {
    // 关卡完成，显示胜利结算
    S.phase = 'over';
    $('shop').classList.add('hidden');
    $('battleBar').classList.add('hidden');
    const lv = LEVELS.find(l => l.id === S.level) || LEVELS[0];
    showVictory(S.wave, 6);
    return;
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
  
  // ===== 背景 =====
  const bgColors = {
    1: { top: '#f8ecd0', mid: '#f0e0b8', bot: '#e8d4a0' },
    2: { top: '#f8e8d0', mid: '#f0d8b0', bot: '#e8c898' },
    3: { top: '#f0e8f8', mid: '#e4d8f0', bot: '#d8c8e8' },
    4: { top: '#faf0d8', mid: '#f4e4c0', bot: '#ecd4a8' },
  };
  const bc = bgColors[S.chapter] || bgColors[1];
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, bc.top);
  bgGrad.addColorStop(0.5, bc.mid);
  bgGrad.addColorStop(1, bc.bot);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  
  // ===== 中国风云雾效果 =====
  drawClouds();
  
  // ===== 建筑轮廓（顶部和底部） =====
  drawBuildings();
  
  // ===== 章节主题色 =====
  const s = S.cellSize;
  const themes = {
    1: { cell: 'rgba(255,248,226,0.25)', cellFill: 'rgba(250,240,211,0.98)', border: 'rgba(101,76,40,0.4)', borderUnit: 'rgba(101,76,40,0.6)', gold: '#c49a48', goldLight: '#e8c860' },
    2: { cell: 'rgba(255,220,180,0.25)', cellFill: 'rgba(255,235,200,0.98)', border: 'rgba(140,60,30,0.45)', borderUnit: 'rgba(140,60,30,0.65)', gold: '#d97827', goldLight: '#f4a460' },
    3: { cell: 'rgba(220,200,255,0.25)', cellFill: 'rgba(240,230,255,0.98)', border: 'rgba(80,60,120,0.45)', borderUnit: 'rgba(80,60,120,0.65)', gold: '#9333ea', goldLight: '#c084fc' },
    4: { cell: 'rgba(255,240,200,0.25)', cellFill: 'rgba(255,248,220,0.98)', border: 'rgba(160,120,30,0.45)', borderUnit: 'rgba(160,120,30,0.65)', gold: '#daa520', goldLight: '#ffd700' },
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
        const alpha = (1 - age) * 0.3;
        const scale = 0.35 + age * 0.15;
        
        ctx.save();
        ctx.translate(cell.px, cell.py);
        
        // 内圈金色光晕
        ctx.fillStyle = `rgba(255,215,100,${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // 外圈光晕
        ctx.fillStyle = `rgba(255,180,60,${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * (scale + 0.1), 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
      
      // 轨迹连线（金色流星线）
      if (rider.history.length >= 3) {
        ctx.strokeStyle = 'rgba(255,215,100,0.4)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#ffd76a';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < rider.history.length; i++) {
          const h = rider.history[i];
          const cell = S.cells.find(c => c.gc === h.x && c.gr === h.y);
          if (!cell) continue;
          const age = i / rider.history.length;
          if (i === 0) ctx.moveTo(cell.px, cell.py);
          else ctx.lineTo(cell.px, cell.py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });
  }

  // ===== 火焰路径（烈焰冲锋技能视觉） =====
  if (S.fireTrails && S.fireTrails.length > 0) {
    S.fireTrails.forEach(f => {
      const p = f.t / f.dur;
      const alpha = Math.max(0, 1 - p) * 0.7;
      const scale = 0.6 + Math.sin(f.t * 8) * 0.1;
      ctx.save();
      ctx.translate(f.x, f.y);
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.45 * scale);
      grd.addColorStop(0, `rgba(255,180,60,${alpha})`);
      grd.addColorStop(0.4, `rgba(255,100,30,${alpha * 0.7})`);
      grd.addColorStop(1, `rgba(255,50,20,0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45 * scale, 0, Math.PI * 2);
      ctx.fill();
      // 火苗
      for (let i = 0; i < 3; i++) {
        const fy = -s * 0.15 * (1 + i * 0.4) + Math.sin(f.t * 10 + i) * 2;
        const fx = Math.sin(f.t * 6 + i * 2) * 3;
        const fh = s * 0.15 * (1 - p * 0.5);
        const fw = s * 0.08 * (1 - p * 0.5);
        ctx.fillStyle = `rgba(255,${180 - i * 40},40,${alpha * (0.6 + i * 0.2)})`;
        ctx.beginPath();
        ctx.ellipse(fx, fy, fw, fh, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // ===== 格子主体 =====
  for (const c of S.cells) {
    const u = c.unit;
    ctx.save();
    ctx.translate(c.px, c.py);
    
    const cw = s * 1.15;  // 格子宽度（稍宽，卡牌风格）
    const ch = s * 0.9;   // 格子高度（稍矮，卡牌风格）
    const cr = 6;         // 圆角
    
    // 格子阴影
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    roundRect(-cw/2 + 3, -ch/2 + 3, cw, ch, cr);
    ctx.fill();
    
    // 格子背景
    roundRect(-cw/2, -ch/2, cw, ch, cr);
    ctx.fillStyle = u ? '#fff8e8' : '#f5ecd4';
    ctx.fill();
    
    // 木纹边框
    ctx.lineWidth = 3;
    ctx.strokeStyle = u ? '#c49a48' : '#c9a878';
    ctx.stroke();
    
    // 内边框（装饰线）
    ctx.lineWidth = 1;
    ctx.strokeStyle = u ? 'rgba(196,154,72,0.4)' : 'rgba(201,168,120,0.5)';
    roundRect(-cw/2 + 4, -ch/2 + 4, cw - 8, ch - 8, cr - 2);
    ctx.stroke();
    
    // 单位combo发光效果
    if (u && u.combo) {
      const comboColor = COMBO_INFO[UNITS[u.ch].combo].color;
      ctx.shadowColor = comboColor;
      ctx.shadowBlur = 15 + Math.sin(S.time * 3) * 5;
      ctx.lineWidth = 3;
      ctx.strokeStyle = comboColor;
      roundRect(-cw/2, -ch/2, cw, ch, cr);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

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
      // 护盾效果
      if (u.shield && u.shield > 0) {
        ctx.strokeStyle='#88ddff'; ctx.lineWidth=2;
        ctx.globalAlpha=0.6+Math.sin(S.time*4)*0.3;
        roundRect(-cw/2+2, -ch/2+2, cw-4, ch-4, cr-1);
        ctx.stroke();
        ctx.globalAlpha=1;
      }
      
      // 等级角标（左上角）
      const lv = u.lv || 1;
      const lvSize = s * 0.28;
      ctx.fillStyle = u.combo ? COMBO_INFO[UNITS[u.ch].combo].color : '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(-cw/2, -ch/2);
      ctx.lineTo(-cw/2 + lvSize * 1.6, -ch/2);
      ctx.lineTo(-cw/2, -ch/2 + lvSize * 1.6);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${s*0.2}px "PingFang SC",sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(lv, -cw/2 + 4, -ch/2 + 2);
      
      // 单位大字名字（居中）
      const d = UNITS[u.ch];
      const displayName = d.name || u.ch;
      ctx.fillStyle = d.color || '#2a2118';
      ctx.font = `900 ${s*0.5}px "PingFang SC","STKaiti","KaiTi",serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(displayName, 0, -s*0.02);
      
      // 名字描边
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeText(displayName, 0, -s*0.02);
      
      // 血条
      const hpw = cw * 0.7;
      const ratio = Math.max(0, u.hp / unitMaxHp(u));
      const hpY = ch / 2 - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-hpw/2, hpY, hpw, 6);
      ctx.fillStyle = ratio > 0.4 ? '#4fc07a' : (ratio > 0.2 ? '#f4c95d' : '#e05a5a');
      ctx.fillRect(-hpw/2, hpY, hpw * ratio, 6);
      // 血条边框
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-hpw/2, hpY, hpw, 6);

      // 镜魂充能进度条（仅可生成镜像的兵种显示）
      if (canMirrorUnit(u) && u.charge > 0) {
        const chRatio = u.charge / (u.maxCharge || MIRROR_CHARGE_MAX);
        const chY = hpY + 8;
        const chw = cw * 0.6;
        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-chw/2, chY, chw, 3);
        // 充能颜色：绿→黄→红
        let chColor;
        if (chRatio < 0.4) chColor = '#4ade80';
        else if (chRatio < 0.7) chColor = '#f4c95d';
        else chColor = '#ff6a4a';
        // 充能接近满时闪烁
        if (chRatio > 0.85) {
          ctx.shadowColor = chColor;
          ctx.shadowBlur = 6 + Math.sin(S.time * 8) * 3;
        }
        ctx.fillStyle = chColor;
        ctx.fillRect(-chw/2, chY, chw * chRatio, 3);
        ctx.shadowBlur = 0;
        // 镜魂标识
        if (chRatio > 0.85) {
          ctx.font = `${s*0.15}px serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255, 200, 100, ' + (0.6 + Math.sin(S.time*6)*0.3) + ')';
          ctx.fillText('✨', 0, chY - 6);
        }
      }
      // 可充能兵种标识（右上角小图标，提示玩家此单位可生成镜像）
      if (canMirrorUnit(u)) {
        ctx.font = `${s*0.16}px serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(136, 221, 255, 0.7)';
        ctx.fillText('✨', cw/2 - 4, -ch/2 + 2);
      }
      
      if (u.aura > 1) { 
        ctx.fillStyle = '#4fc07a'; 
        ctx.font = `700 ${s*0.15}px sans-serif`; 
        ctx.textAlign = 'right';
        ctx.fillText('▲速', cw/2 - 4, -ch/2 + 4); 
      }
      if (u.rallyBuff > 0) {
        ctx.strokeStyle = '#ffdd44'; ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + Math.sin(S.time*6)*0.25;
        roundRect(-cw/2+1, -ch/2+1, cw-2, ch-2, cr-1);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffdd44'; 
        ctx.font = `700 ${s*0.13}px sans-serif`; 
        ctx.textAlign = 'right';
        ctx.fillText('号', cw/2 - 4, -ch/2 + 18);
      }
      // 合成单位大招冷却指示
      if (u.combo && u.comboSkillCd > 0) {
        const cdRatio = Math.min(1, u.comboSkillCd / 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s*0.4, -Math.PI/2, -Math.PI/2 + (1-cdRatio)*Math.PI*2);
        ctx.stroke();
      }
    }
    if (S.selCell === S.cells.indexOf(c)) {
      ctx.strokeStyle = '#7dd0ff'; 
      ctx.lineWidth = 3;
      roundRect(-cw/2 - 3, -ch/2 - 3, cw + 6, ch + 6, cr + 2);
      ctx.stroke();
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
    
    // 阴影
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, e.r * 0.85, e.r * 0.7, e.r * 0.28, 0, 0, Math.PI*2); ctx.fill();
    
    // 定身/冰冻效果
    if(e.root>0){
      ctx.fillStyle='rgba(100,200,255,0.4)';
      ctx.beginPath();ctx.arc(0,0,e.r*1.2,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#4fd0f8';ctx.lineWidth=2;
      for(let i=0;i<6;i++){
        const a=(i/6)*Math.PI*2;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*e.r*0.6,Math.sin(a)*e.r*0.6);
        ctx.lineTo(Math.cos(a)*e.r*1.1,Math.sin(a)*e.r*1.1);ctx.stroke();
      }
    }
    // 眩晕效果
    if(e.stun>0){
      ctx.fillStyle='rgba(255,200,0,0.3)';
      ctx.beginPath();ctx.arc(0,0,e.r*1.15,0,Math.PI*2);ctx.fill();
      for(let i=0;i<3;i++){
        const a=S.time*2+(i/3)*Math.PI*2;
        ctx.fillStyle='#ffd700';
        ctx.font=`900 ${e.r*0.4}px sans-serif`;
        ctx.textAlign='center';
        ctx.fillText('★',Math.cos(a)*e.r*0.9,-e.r*0.8+Math.sin(a)*4);
      }
    }
    // 燃烧效果
    if(e.burning>0){
      ctx.fillStyle='rgba(255,100,30,0.25)';
      ctx.beginPath();ctx.arc(0,0,e.r*1.1,0,Math.PI*2);ctx.fill();
    }
    // 子牙减速效果
    if(e.jiangSlow>0){
      ctx.strokeStyle='rgba(218,165,32,0.6)';ctx.lineWidth=2;
      ctx.setLineDash([3,3]);ctx.lineDashOffset=-S.time*20;
      ctx.beginPath();ctx.arc(0,0,e.r*1.05,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // BOSS/精英光环
    if(e.boss||e.elite){
      ctx.shadowColor = d.color;
      ctx.shadowBlur = 12 + Math.sin(S.time * 3) * 4;
    }
    
    // 敌人名字（书法字体风格）
    ctx.font = `900 ${e.r * 1.1}px "STKaiti","KaiTi","楷体","PingFang SC",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 名字阴影/描边
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    
    const displayName = e.ch;
    if (displayName.length > 2) {
      const fs = e.r * 0.75;
      ctx.font = `900 ${fs}px "STKaiti","KaiTi","楷体","PingFang SC",serif`;
      ctx.strokeText(displayName.slice(0, 2), 0, -fs * 0.45);
      ctx.strokeText(displayName.slice(2), 0, fs * 0.5);
      ctx.fillStyle = d.color;
      ctx.fillText(displayName.slice(0, 2), 0, -fs * 0.45);
      ctx.fillText(displayName.slice(2), 0, fs * 0.5);
    } else {
      ctx.strokeText(displayName, 0, 2);
      ctx.fillStyle = d.color;
      ctx.fillText(displayName, 0, 2);
    }
    
    ctx.shadowBlur = 0;
    
    // 小装饰图标（精英/BOSS）
    if (e.boss) {
      ctx.font = `${e.r * 0.8}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('👑', 0, -e.r - 6);
    } else if (e.elite) {
      ctx.font = `${e.r * 0.7}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚔️', 0, -e.r - 4);
    }
    
    // 血条
    const bw2 = e.r * 2.4;
    const rr2 = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-bw2/2, -e.r - 12, bw2, 5);
    ctx.fillStyle = e.boss ? '#ffb84f' : (e.elite ? '#ff9a4a' : '#ff6a6a');
    ctx.fillRect(-bw2/2, -e.r - 12, bw2 * rr2, 5);
    // 血条边框
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-bw2/2, -e.r - 12, bw2, 5);
    
    ctx.restore();
  }

  // 公豹召唤的友军单位
  if (S.friendlies && S.friendlies.length > 0) {
    for (const f of S.friendlies) {
      if (f.dead) continue;
      ctx.save();ctx.translate(f.x,f.y);
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.beginPath();ctx.ellipse(0,f.r*0.85,f.r*0.7,f.r*0.25,0,0,Math.PI*2);ctx.fill();
      // 紫色魔光
      ctx.shadowColor='#9932cc';ctx.shadowBlur=10;
      ctx.fillStyle='#8b008b';
      ctx.beginPath();ctx.arc(0,0,f.r,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#fff';
      ctx.font=`900 ${f.r*0.9}px "PingFang SC",sans-serif`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('魔',0,1);
      // 剩余时间条
      const lr=Math.max(0,f.lifetime/10);
      ctx.fillStyle='rgba(0,0,0,0.4)';
      ctx.fillRect(-f.r*1.2,-f.r-8,f.r*2.4,3);
      ctx.fillStyle='#9932cc';
      ctx.fillRect(-f.r*1.2,-f.r-8,f.r*2.4*lr,3);
      ctx.restore();
    }
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
    } else if(f.type==='combo_heal'){
      // 唐僧治疗：金色同心圆
      ctx.strokeStyle='#ffd700';ctx.lineWidth=2;
      ctx.shadowColor='#ffd700';ctx.shadowBlur=10;
      for(let i=0;i<3;i++){
        const rr=f.r*(0.3+p*0.7+i*0.15);
        ctx.globalAlpha=Math.max(0,1-p)* (0.8-i*0.25);
        ctx.beginPath();ctx.arc(f.x,f.y,rr,0,Math.PI*2);ctx.stroke();
      }
      ctx.shadowBlur=0;
    } else if(f.type==='combo_buddha'){
      // 佛光普照：卍字光芒
      ctx.save();ctx.translate(f.x,f.y);ctx.rotate(p*Math.PI*0.5);
      ctx.fillStyle='rgba(255,215,0,0.6)';
      ctx.shadowColor='#ffd700';ctx.shadowBlur=15;
      for(let i=0;i<4;i++){
        ctx.rotate(Math.PI/2);
        ctx.fillRect(-3,-S.cellSize*0.4*(0.5+p*0.5),6,S.cellSize*0.4*(0.5+p*0.5));
        ctx.fillRect(-S.cellSize*0.3*(0.5+p*0.5),-3,S.cellSize*0.3*(0.5+p*0.5),6);
      }
      ctx.shadowBlur=0;ctx.restore();
    } else if(f.type==='combo_buddha_big'){
      // 佛光普照大招：全场金色光晕
      const grd=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);
      grd.addColorStop(0,`rgba(255,215,0,${0.25*(1-p)})`);
      grd.addColorStop(0.5,`rgba(255,200,50,${0.1*(1-p)})`);
      grd.addColorStop(1,'rgba(255,180,0,0)');
      ctx.fillStyle=grd;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.5+p*0.5),0,Math.PI*2);ctx.fill();
    } else if(f.type==='combo_monkey'){
      // 悟空大闹天宫：旋转金箍棒+扩散冲击波
      ctx.save();ctx.translate(f.x,f.y);ctx.rotate(p*Math.PI*4);
      ctx.strokeStyle='#ff8c00';ctx.lineWidth=5*(1-p*0.5);
      ctx.shadowColor='#ff8c00';ctx.shadowBlur=15;
      ctx.beginPath();ctx.arc(0,0,f.r*(0.3+p*0.7),0,Math.PI*2);ctx.stroke();
      ctx.lineWidth=4*(1-p*0.3);
      for(let i=0;i<3;i++){
        ctx.rotate(Math.PI*2/3);
        ctx.beginPath();ctx.moveTo(0,0);
        ctx.lineTo(f.r*(0.4+p*0.6),0);ctx.stroke();
      }
      ctx.shadowBlur=0;ctx.restore();
    } else if(f.type==='combo_pig'){
      // 八戒扇形横扫
      ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.ang||0);
      ctx.fillStyle='rgba(70,130,180,0.5)';
      ctx.strokeStyle='#4682b4';ctx.lineWidth=3;
      ctx.shadowColor='#4682b4';ctx.shadowBlur=10;
      const a=(Math.PI*0.7)*(0.5+p*0.5);
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,f.r*(0.6+p*0.4),-a/2,a/2);
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.shadowBlur=0;ctx.restore();
    } else if(f.type==='combo_sha_explode'){
      // 沙僧死亡爆炸：绿色冲击波+水纹
      ctx.strokeStyle='#2e8b57';ctx.lineWidth=4*(1-p);
      ctx.shadowColor='#2e8b57';ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.2+p*0.8),0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='rgba(46,139,87,0.3)';
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.1+p*0.9),0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
    } else if(f.type==='combo_whip'){
      // 打神鞭：金色闪电落下
      ctx.strokeStyle='#daa520';ctx.lineWidth=3;
      ctx.shadowColor='#ffd700';ctx.shadowBlur=12;
      ctx.beginPath();
      ctx.moveTo(f.x,f.y-40);
      const segs=4;
      for(let i=1;i<=segs;i++){
        const t=i/segs;
        ctx.lineTo(f.x+(Math.random()-0.5)*16,f.y-40+t*40);
      }
      ctx.stroke();ctx.shadowBlur=0;
    } else if(f.type==='combo_whip_big'){
      // 打神鞭全场：金色雷光
      ctx.fillStyle=`rgba(218,165,32,${0.15*(1-p)})`;
      ctx.fillRect(0,0,W,H);
    } else if(f.type==='combo_summon'){
      // 公豹召唤：紫色魔光从地下升起
      ctx.strokeStyle='#8b008b';ctx.lineWidth=3;
      ctx.shadowColor='#9932cc';ctx.shadowBlur=10;
      for(let i=0;i<5;i++){
        const ang=(i/5)*Math.PI*2+p*2;
        const h=30*(0.5+p*0.5);
        ctx.beginPath();
        ctx.moveTo(f.x+Math.cos(ang)*15,f.y);
        ctx.quadraticCurveTo(f.x+Math.cos(ang)*20,f.y-h*0.5,f.x+Math.cos(ang)*10,f.y-h);
        ctx.stroke();
      }
      ctx.shadowBlur=0;
    } else if(f.type==='combo_explode'){
      // 公豹召唤物自爆：紫色爆炸
      ctx.strokeStyle='#8b008b';ctx.lineWidth=4*(1-p);
      ctx.shadowColor='#9932cc';ctx.shadowBlur=15;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.3+p*0.7),0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='rgba(139,0,139,0.3)';
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.2+p*0.8),0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
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

/* ============ 中国风云雾渲染 ============ */
function drawClouds() {
  const cloudAlpha = 0.25 + Math.sin(S.time * 0.3) * 0.08;
  const cloudSpeed = 0.3;
  
  const clouds = [
    { x: (S.time * cloudSpeed * 20 + W * 0.1) % (W * 1.2), y: H * 0.08, s: 0.8 },
    { x: (S.time * cloudSpeed * 15 + W * 0.5) % (W * 1.2), y: H * 0.12, s: 1.2 },
    { x: (S.time * cloudSpeed * 25 + W * 0.8) % (W * 1.2), y: H * 0.05, s: 0.6 },
    { x: (S.time * cloudSpeed * 18 + W * 0.3) % (W * 1.2), y: H * 0.92, s: 0.9 },
    { x: (S.time * cloudSpeed * 22 + W * 0.7) % (W * 1.2), y: H * 0.88, s: 1.0 },
  ];
  
  ctx.fillStyle = `rgba(255,255,255,${cloudAlpha})`;
  clouds.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 40 * c.s, 0, Math.PI * 2);
    ctx.arc(c.x + 30 * c.s, c.y - 10 * c.s, 35 * c.s, 0, Math.PI * 2);
    ctx.arc(c.x + 50 * c.s, c.y, 30 * c.s, 0, Math.PI * 2);
    ctx.arc(c.x + 20 * c.s, c.y + 10 * c.s, 25 * c.s, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ============ 中国风建筑渲染 ============ */
function drawBuildings() {
  const topH = H * 0.18;
  const botH = H * 0.16;
  
  ctx.save();
  
  // ===== 顶部城墙 =====
  const wallColor = '#c9a878';
  const wallDark = '#a08050';
  const wallLight = '#d8b888';
  
  // 城墙主体
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, topH - 40, W, 40);
  
  // 城墙底座阴影
  ctx.fillStyle = wallDark;
  ctx.fillRect(0, topH - 8, W, 8);
  
  // 城垛（锯齿状）
  ctx.fillStyle = wallColor;
  const merlons = Math.floor(W / 40);
  for (let i = 0; i < merlons; i++) {
    ctx.fillRect(i * 40 + 5, topH - 55, 20, 15);
  }
  
  // 城墙纹理（横线）
  ctx.strokeStyle = wallDark;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  for (let y = topH - 35; y < topH - 5; y += 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  
  // ===== 左侧城楼 =====
  const towerW = 70;
  const towerX = 20;
  const towerTop = topH - 90;
  
  // 城楼主体
  ctx.fillStyle = wallLight;
  ctx.fillRect(towerX, towerTop, towerW, 50);
  ctx.strokeStyle = wallDark;
  ctx.lineWidth = 2;
  ctx.strokeRect(towerX, towerTop, towerW, 50);
  
  // 城楼屋顶（飞檐）
  ctx.fillStyle = '#7a4a2a';
  ctx.beginPath();
  ctx.moveTo(towerX - 10, towerTop);
  ctx.lineTo(towerX + towerW / 2, towerTop - 25);
  ctx.lineTo(towerX + towerW + 10, towerTop);
  ctx.closePath();
  ctx.fill();
  
  // 屋顶瓦片
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const tx = towerX + 5 + i * 14;
    ctx.beginPath();
    ctx.moveTo(tx, towerTop - 2);
    ctx.lineTo(tx + 5, towerTop - 15);
    ctx.stroke();
  }
  
  // 城楼门
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(towerX + 25, towerTop + 20, 20, 30);
  ctx.beginPath();
  ctx.arc(towerX + 35, towerTop + 20, 10, Math.PI, 0);
  ctx.fill();
  
  // ===== 右侧城楼 =====
  const towerX2 = W - 20 - towerW;
  ctx.fillStyle = wallLight;
  ctx.fillRect(towerX2, towerTop, towerW, 50);
  ctx.strokeStyle = wallDark;
  ctx.strokeRect(towerX2, towerTop, towerW, 50);
  
  ctx.fillStyle = '#7a4a2a';
  ctx.beginPath();
  ctx.moveTo(towerX2 - 10, towerTop);
  ctx.lineTo(towerX2 + towerW / 2, towerTop - 25);
  ctx.lineTo(towerX2 + towerW + 10, towerTop);
  ctx.closePath();
  ctx.fill();
  
  for (let i = 0; i < 5; i++) {
    const tx = towerX2 + 5 + i * 14;
    ctx.beginPath();
    ctx.moveTo(tx, towerTop - 2);
    ctx.lineTo(tx + 5, towerTop - 15);
    ctx.stroke();
  }
  
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(towerX2 + 25, towerTop + 20, 20, 30);
  ctx.beginPath();
  ctx.arc(towerX2 + 35, towerTop + 20, 10, Math.PI, 0);
  ctx.fill();
  
  // ===== 旗帜 =====
  const flagColors = ['#c9483c', '#c9483c', '#c9483c', '#c9483c', '#c9483c'];
  const flagPositions = [
    { x: towerX + towerW / 2, y: towerTop - 35 },
    { x: W * 0.25, y: topH - 60 },
    { x: W * 0.5, y: topH - 65 },
    { x: W * 0.75, y: topH - 60 },
    { x: towerX2 + towerW / 2, y: towerTop - 35 },
  ];
  
  flagPositions.forEach((pos, idx) => {
    // 旗杆
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y - 30);
    ctx.stroke();
    
    // 旗杆顶
    ctx.fillStyle = '#c9a82e';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 32, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 旗帜（飘动）
    const flagWave = Math.sin(S.time * 2.5 + idx) * 5;
    const flagWave2 = Math.sin(S.time * 3 + idx * 0.8) * 3;
    ctx.fillStyle = flagColors[idx];
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - 30);
    ctx.lineTo(pos.x + 25 + flagWave, pos.y - 24 + flagWave2);
    ctx.lineTo(pos.x + 18 + flagWave, pos.y - 15);
    ctx.lineTo(pos.x + 28 + flagWave, pos.y - 8 + flagWave2);
    ctx.lineTo(pos.x, pos.y - 2);
    ctx.closePath();
    ctx.fill();
    
    // 旗帜边缘暗纹
    ctx.strokeStyle = '#8a2820';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  
  // ===== 底部城墙 =====
  const botWallY = H - botH + 10;
  
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, botWallY, W, botH - 10);
  
  ctx.fillStyle = wallDark;
  ctx.fillRect(0, botWallY, W, 6);
  
  // 底部城垛
  ctx.fillStyle = wallColor;
  for (let i = 0; i < merlons; i++) {
    ctx.fillRect(i * 40 + 5, botWallY - 12, 20, 12);
  }
  
  // 底部城门（中央）
  const gateW = 100;
  const gateX = W / 2 - gateW / 2;
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(gateX, botWallY + 10, gateW, botH - 20);
  ctx.beginPath();
  ctx.arc(W / 2, botWallY + 10, gateW / 2, Math.PI, 0);
  ctx.fill();
  
  // 城门装饰
  ctx.strokeStyle = '#c9a82e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, botWallY + 10, gateW / 2 - 8, Math.PI, 0);
  ctx.stroke();
  
  // 门钉
  ctx.fillStyle = '#c9a82e';
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      ctx.beginPath();
      ctx.arc(gateX + 15 + col * 17, botWallY + 30 + row * 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // 底部左右角楼
  [20, W - 20 - 50].forEach(tx => {
    ctx.fillStyle = wallLight;
    ctx.fillRect(tx, botWallY - 35, 50, 35);
    ctx.strokeStyle = wallDark;
    ctx.strokeRect(tx, botWallY - 35, 50, 35);
    
    ctx.fillStyle = '#7a4a2a';
    ctx.beginPath();
    ctx.moveTo(tx - 8, botWallY - 35);
    ctx.lineTo(tx + 25, botWallY - 55);
    ctx.lineTo(tx + 58, botWallY - 35);
    ctx.closePath();
    ctx.fill();
  });
  
  ctx.restore();
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
  // 应用天赋血量加成
  if (typeof applyTalentHeartBonus === 'function') applyTalentHeartBonus();
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

/* ============================================================
 *  装备系统 UI
 * ============================================================ */

/* 渲染武器卡片 */
function renderEquipGrid() {
  const grid = $('equipGrid');
  if (!grid) return;
  grid.innerHTML = '';

  WEAPONS.forEach(w => {
    const save = SaveMgr.get();
    const unlocked = isWeaponUnlocked(w, save);
    const lv = save.weapons[w.id]?.level || (unlocked ? 1 : 0);
    const isMax = lv >= w.maxLv;
    const cost = isMax ? 0 : getWeaponUpgradeCost(w, lv);

    const card = document.createElement('div');
    card.className = 'weapon-card quality-' + w.quality + (unlocked ? '' : ' locked');
    card.dataset.weaponId = w.id;

    // 显示大字
    let bigText = w.ch;
    if (w.type === 'combo') {
      // 组合武器：显示组合名（如悟空）
      bigText = w.name;
    } else if (w.type === 'fun') {
      bigText = w.unitType || w.name;
    } else if (w.type === 'beast') {
      bigText = w.name;
    }

    // 攻击力显示
    let atkVal = 0;
    if (w.type === 'combo' && w.comboKey) {
      // 组合武器找基础攻击
      const baseUnit = Object.values(UNITS).find(u => u.combo === w.comboKey);
      atkVal = baseUnit ? Math.round(baseUnit.atk * (1 + (lv - 1) * QUALITY[w.quality].atkPerLv)) : 0;
    } else if (w.type === 'fun') {
      const baseUnit = UNITS[w.unitType];
      atkVal = baseUnit ? Math.round(baseUnit.atk * (1 + (lv - 1) * QUALITY[w.quality].atkPerLv)) : 0;
    } else {
      const baseUnit = UNITS[w.ch];
      atkVal = baseUnit ? Math.round(baseUnit.atk * (1 + (lv - 1) * QUALITY[w.quality].atkPerLv)) : 0;
    }

    card.innerHTML = `
      <div class="wp-level">Lv.${lv}</div>
      <div class="wp-name">${w.name}</div>
      <div class="wp-big">${bigText}</div>
    `;

    card.addEventListener('click', () => {
      if (!unlocked) {
        if (w.unlock?.type === 'diamond') {
          if (SaveMgr.spendDiamond(w.unlock.cost)) {
            SaveMgr.unlockWeapon(w.id);
            toast(`解锁成功：${w.name}！`);
            renderEquipGrid();
            updateAllResourceUI();
          } else {
            toast('钻石不足！');
          }
        } else if (w.unlock?.type === 'weapon') {
          const hasBase = SaveMgr.get().unlockedWeapons?.includes(w.unlock.weaponId);
          if (hasBase) {
            if (SaveMgr.spendDiamond(w.unlock.costDiamond)) {
              SaveMgr.unlockWeapon(w.id);
              toast(`觉醒成功：${w.name}！`);
              renderEquipGrid();
              updateAllResourceUI();
            } else {
              toast('钻石不足！');
            }
          } else {
            toast('需先解锁前置武器！');
          }
        } else {
          toast('未解锁');
        }
        return;
      }
      if (isMax) {
        toast('已满级！');
        return;
      }
      const result = SaveMgr.upgradeWeapon(w.id);
      if (result.ok) {
        toast(`升级成功！Lv.${result.newLevel}`);
        renderEquipGrid();
        updateAllResourceUI();
      } else {
        toast(result.msg);
      }
    });

    grid.appendChild(card);
  });
}

/* 数字格式化 */
function formatNumber(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(2) + '万';
  return n.toString();
}

/* ============================================================
 *  天赋系统 UI
 * ============================================================ */

const TALENT_DEFS = [
  { key: 'attack',  name: '攻击', icon: '⚔️', maxLv: 20, desc: lv => '+' + (lv * 10) + '%攻击' },
  { key: 'hp',      name: '血量', icon: '❤️', maxLv: 20, desc: lv => '+' + (lv * 12) + '血量' },
  { key: 'defense', name: '防御', icon: '🛡️', maxLv: 20, desc: lv => '+' + (lv * 5) + '%减伤' },
];

function renderTalents() {
  const container = $('talentContainer');
  if (!container) return;
  container.innerHTML = '';

  TALENT_DEFS.forEach(tal => {
    const save = SaveMgr.get();
    const lv = save.talents[tal.key] || 0;

    const col = document.createElement('div');
    col.className = 'talent-column';
    col.innerHTML = `<div class="talent-column-title">${tal.icon} ${tal.name}</div>`;

    // 显示5个节点（代表前5级，满级显示更多）
    const nodeCount = 5;
    for (let i = nodeCount - 1; i >= 0; i--) {
      const nodeLv = lv >= i + 1 ? i + 1 : (i < lv ? i + 1 : 0);
      const isUnlocked = i < lv;
      const isMax = lv >= tal.maxLv && i === nodeCount - 1;

      // 连线
      if (i < nodeCount - 1) {
        const conn = document.createElement('div');
        conn.className = 'talent-connector' + (isUnlocked ? ' active' : '');
        col.appendChild(conn);
      }

      const node = document.createElement('div');
      node.className = 'talent-node' + (isUnlocked ? ' unlocked' : '') + (isMax ? ' max' : '');
      node.innerHTML = `
        <div class="tn-icon">${tal.icon}</div>
        <div class="tn-value">${tal.desc(i + 1)}</div>
        ${lv > 0 ? `<div class="tn-lv">Lv.${lv}</div>` : ''}
      `;

      node.addEventListener('click', () => {
        const result = SaveMgr.upgradeTalent(tal.key);
        if (result.ok) {
          toast(`${tal.name}天赋升级！Lv.${result.newLevel}`);
          renderTalents();
          updateAllResourceUI();
        } else {
          toast(result.msg);
        }
      });

      col.appendChild(node);
    }

    container.appendChild(col);
  });
}

/* ============================================================
 *  底部Tab切换
 * ============================================================ */
let currentTab = 'equip';

function switchTab(tabName) {
  currentTab = tabName;

  // 更新Tab高亮
  document.querySelectorAll('.tab-item').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });

  // 切换View
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  if (tabName === 'equip') {
    $('equipView').classList.add('active');
    renderEquipGrid();
  } else if (tabName === 'battle') {
    $('battleView').classList.add('active');
  } else if (tabName === 'talent') {
    $('talentView').classList.add('active');
    renderTalents();
  }
  updateAllResourceUI();
}

function setupTabBar() {
  document.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab);
    });
  });
}

/* ============================================================
 *  资源UI同步
 * ============================================================ */
function updateAllResourceUI() {
  const save = SaveMgr.get();
  const goldStr = formatNumber(save.gold);
  const diaStr = formatNumber(save.diamond);

  // 装备界面
  const eqGold = $('eqGold'); if (eqGold) eqGold.textContent = goldStr;
  const eqDia = $('eqDiamond'); if (eqDia) eqDia.textContent = diaStr;

  // 天赋界面
  const taGold = $('taGold'); if (taGold) taGold.textContent = goldStr;
  const taDia = $('taDiamond'); if (taDia) taDia.textContent = diaStr;

  // 战斗界面（顶部金币从存档读，战斗内金币另算）
  const tbG = $('tbGold');
  if (tbG && S.gold !== undefined) {
    // 战斗中显示当前关卡金币
    tbG.textContent = S.gold;
  }
}

/* ============================================================
 *  胜利结算
 * ============================================================ */
let victoryReward = { gold: 0, diamond: 0 };

function showVictory(wave, maxWave) {
  const lv = LEVELS.find(l => l.id === S.level) || LEVELS[0];

  // 计算奖励
  const baseGold = 50 + wave * 20 + S.level * 30;
  const baseDiamond = 5 + Math.floor(S.level * 2) + Math.floor(wave / 3);

  victoryReward = { gold: baseGold, diamond: baseDiamond };

  $('vicWave').textContent = wave;
  $('vicMaxWave').textContent = maxWave;
  $('vicGold').textContent = baseGold;
  $('vicDiamond').textContent = baseDiamond;

  $('victoryOverlay').classList.remove('hidden');
}

function claimVictory(isDouble) {
  let g = victoryReward.gold;
  let d = victoryReward.diamond;
  if (isDouble) { g *= 2; d *= 2; }

  SaveMgr.addGold(g);
  SaveMgr.addDiamond(d);

  // 记录最高波次/章节
  SaveMgr.setHighestWave(Math.max(S.bestWave || 0, S.wave));
  SaveMgr.setHighestChapter(Math.max(SaveMgr.get().highestChapter || 1, S.level));

  toast(`获得 ${g}💰 ${d}💎`);
  $('victoryOverlay').classList.add('hidden');

  // 重置关卡
  reset();
  // 切回装备界面
  switchTab('equip');
}

function setupVictoryButtons() {
  $('btnVicNormal').addEventListener('click', () => claimVictory(false));
  $('btnVicDouble').addEventListener('click', () => claimVictory(true));
}

/* 基地血量加成（天赋） */
function applyTalentHeartBonus() {
  const save = SaveMgr.get();
  const hpLv = save.talents?.hp || 0;
  const bonus = hpLv * 12;
  S.heartMax += bonus;
  S.heartHp += bonus;
}

/* ============================================================
 *  初始化
 * ============================================================ */
function initGameUI() {
  setupTabBar();
  setupVictoryButtons();
  switchTab('equip'); // 默认进入装备界面

  // +号按钮（测试用，给资源）
  const gp = $('btnGoldPlus'); if (gp) gp.addEventListener('click', () => {
    SaveMgr.addGold(10000); updateAllResourceUI(); renderEquipGrid(); toast('+10000 💰');
  });
  const dp = $('btnDiaPlus'); if (dp) dp.addEventListener('click', () => {
    SaveMgr.addDiamond(100); updateAllResourceUI(); renderTalents(); toast('+100 💎');
  });
  const tgp = $('btnTaGoldPlus'); if (tgp) tgp.addEventListener('click', () => {
    SaveMgr.addGold(10000); updateAllResourceUI(); toast('+10000 💰');
  });
  const tdp = $('btnTaDiaPlus'); if (tdp) tdp.addEventListener('click', () => {
    SaveMgr.addDiamond(100); updateAllResourceUI(); renderTalents(); toast('+100 💎');
  });
}

ovAction = reset;
resize();
setupRiderPanelDrag();
initGameUI();
reset();
startLoop();
