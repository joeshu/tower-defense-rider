/* ============================================================
 * levels.js —— 30关配置 + 棋盘布局 + 波次生成
 * 每种棋盘布局对"骑马走格"玩法有不同影响
 * ============================================================ */
'use strict';

/* ---------- 棋盘布局模板 ----------
 * 每个布局定义了格子的排列方式。
 * 骑马单位会在这些格子上按规则移动（走格而非自由移动）。
 *
 * layout 类型说明：
 *   "grid"      标准矩形网格
 *   "ring"      环形围绕"心"
 *   "cross"     十字形长廊（适合骑马冲锋）
 *   "maze"      迷宫式（路径曲折，考验走格策略）
 *   "dual_lane" 双车道（左右两排，中间隔墙）
 *   "spiral"    螺旋阵（从外圈向内，或反之）
 */
const LAYOUTS = {

  /* ---------- 3×3 九宫格（第1-5关） ---------- */
  "grid_3x3": {
    type: "grid", cols: 3, rows: 3,
    // 格子坐标 → 像素位置由 buildLayout() 计算
    obstacles: [],   // 无障
    // 哪些格子可放置单位
    slots: [
      [1,0],[2,0],
      [0,1],      [2,1],
      [0,2],[1,2],[2,2],
      // 中心(1,1)是"心"，不可放置
    ],
    specials: [
      { type: 'speed', cells: [[2,0]] },
      { type: 'heal',  cells: [[0,2]] },
    ],
    desc: "九宫格·初阵"
  },

  /* ---------- 3×4 矩形（第6-10关） ---------- */
  "grid_3x4": {
    type: "grid", cols: 4, rows: 3,
    obstacles: [],
    slots: [
      [0,0],[1,0],[2,0],[3,0],
      [0,1],            [3,1],
      [0,2],[1,2],[2,2],[3,2],
      // (1,1)(2,1) 留给心 或 通道
    ],
    specials: [
      { type: 'speed', cells: [[0,0]] },
      { type: 'rage',  cells: [[3,0]] },
      { type: 'heal',  cells: [[0,2]] },
    ],
    desc: "矩形·四门"
  },

  /* ---------- 4×4 带障碍（第11-15关·解锁骑马） ---------- */
  "grid_4x4_obs": {
    type: "grid", cols: 4, rows: 4,
    obstacles: [[1,1],[2,2]],  // 对角线障碍
    slots: [
      [0,0],[1,0],[2,0],[3,0],
      [0,1],      [3,1],
      [0,2],[3,2],
      [0,3],[1,3],[2,3],[3,3],
    ],
    specials: [
      { type: 'rage',  cells: [[0,0],[3,3]] },
      { type: 'speed', cells: [[3,0]] },
      { type: 'heal',  cells: [[0,3]] },
    ],
    desc: "四四阵·断龙石"
  },

  /* ---------- 十字长廊（第16-20关·骑马天堂） ---------- */
  "cross": {
    type: "cross", cols: 5, rows: 5,
    obstacles: [[1,0],[3,0],[1,4],[3,4],[0,2],[4,2]],
    // 十字形可放置格
    slots: [
      [2,0],
      [1,1],[2,1],[3,1],
      [0,2],[1,2],      [3,2],[4,2],
      [1,3],[2,3],[3,3],
      [2,4],
    ],
    specials: [
      { type: 'speed', cells: [[2,0],[2,4]] },
      { type: 'rage',  cells: [[0,2],[4,2]] },
    ],
    desc: "十字长廊·骑兵冲锋"
  },

  /* ---------- 双车道（第21-25关） ---------- */
  "dual_lane": {
    type: "dual_lane", cols: 5, rows: 4,
    obstacles: [[2,0],[2,1],[2,2],[2,3]],  // 中间隔墙
    slots: [
      [0,0],[1,0],      [3,0],[4,0],
      [0,1],[1,1],      [3,1],[4,1],
      [0,2],[1,2],      [3,2],[4,2],
      [0,3],[1,3],      [3,3],[4,3],
    ],
    specials: [
      { type: 'speed', cells: [[1,0],[3,3]] },
      { type: 'rage',  cells: [[1,3],[3,0]] },
    ],
    desc: "双车道·分兵把关"
  },

  /* ---------- 螺旋阵（第26-30关·终局） ---------- */
  "spiral": {
    type: "spiral", cols: 5, rows: 5,
    obstacles: [[2,2]],  // 中心是心
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],                  [4,1],
      [0,2],                  [4,2],
      [0,3],                  [4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
      [1,4],[3,4],
      [1,1],[3,1],
    ],
    specials: [
      { type: 'heal',  cells: [[0,0],[4,4]] },
      { type: 'rage',  cells: [[4,0],[0,4]] },
      { type: 'speed', cells: [[2,0],[2,4]] },
    ],
    desc: "螺旋阵·千军万马"
  },

  /* ---------- 三角阵（支援型布局） ---------- */
  "triangle": {
    type: "triangle", cols: 5, rows: 4,
    obstacles: [[2,1]],
    slots: [
              [2,0],
        [1,1],      [3,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
    ],
    specials: [
      { type: 'speed', cells: [[2,0]] },
      { type: 'rage',  cells: [[0,3],[4,3]] },
    ],
    desc: "三角阵·速援"
  },

  /* ---------- 阶梯阵（高低错落） ---------- */
  "stair": {
    type: "stair", cols: 5, rows: 5,
    obstacles: [[0,1],[1,2],[2,3],[3,2],[4,1]],
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
            [1,1],[2,1],[3,1],
                  [2,2],
            [1,3],[2,3],[3,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [
      { type: 'speed', cells: [[2,0],[2,4]] },
      { type: 'heal',  cells: [[2,2]] },
      { type: 'rage',  cells: [[0,0],[4,0]] },
    ],
    desc: "阶梯阵·错落"
  },

  /* ---------- 回字形（环形防御） ---------- */
  "ring": {
    type: "ring", cols: 5, rows: 5,
    obstacles: [[1,1],[1,2],[1,3],[2,1],[2,3],[3,1],[3,2],[3,3]],
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],                  [4,1],
      [0,2],                  [4,2],
      [0,3],                  [4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [
      { type: 'speed', cells: [[2,0],[2,4]] },
      { type: 'rage',  cells: [[0,2],[4,2]] },
      { type: 'heal',  cells: [[0,0],[4,4]] },
    ],
    desc: "回字阵·环形"
  },

  /* ---------- 六边形（6向移动） ---------- */
  "hex": {
    type: "hex", cols: 5, rows: 5,
    obstacles: [],
    slots: [
              [2,0],
        [1,1],      [3,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
        [1,3],      [3,3],
              [2,4],
    ],
    specials: [
      { type: 'speed', cells: [[2,0],[2,4]] },
      { type: 'rage',  cells: [[0,2],[4,2]] },
      { type: 'heal',  cells: [[2,2]] },
    ],
    desc: "六边形·六向"
  },

  /* ---------- 迷宫阵（曲折路径） ---------- */
  "maze": {
    type: "maze", cols: 5, rows: 5,
    obstacles: [[1,0],[3,0],[0,2],[4,2],[1,4],[3,4]],
    slots: [
      [0,0],      [2,0],      [4,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
                  [1,2],[2,2],[3,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [0,4],      [2,4],      [4,4],
    ],
    specials: [
      { type: 'speed', cells: [[2,0],[2,4]] },
      { type: 'rage',  cells: [[0,1],[4,3]] },
      { type: 'heal',  cells: [[2,2]] },
    ],
    desc: "迷宫阵·曲折"
  },
};

/* ---------- 40关配置 ----------
 * unlock 字段说明：
 *   - 写入的是「商店可刷出的字」，必须存在于 UNITS 表中
 *   - 骑马单位「骑」默认永久存在，无需通过商店合成
 *   - 早期关卡逐步解锁元素兵种，中期解锁进阶兵种，后期解锁封神角色
 */
const LEVELS = [
  // ===== 第一章·黄风岭（1-10）·基础+元素兵种+骑马初始 =====
  { id: 1,  layout: "grid_3x3",    chapter: 1, waveBonus: 4,  unlock: ["雷","冰","火","毒"],         rule: { type: "mirror_unlock", text: "🐴 骑马单位已就位！路过友军可召唤镜像出战！" } },
  { id: 2,  layout: "grid_3x3",    chapter: 1, waveBonus: 5,  unlock: ["唐","僧"],                     rule: null },
  { id: 3,  layout: "grid_3x3",    chapter: 1, waveBonus: 5,  unlock: ["唐","僧"],                     rule: { type: "no_archer", text: "本关禁用「箭」" } },
  { id: 4,  layout: "grid_3x3",    chapter: 1, waveBonus: 6,  unlock: ["悟","空"],                     rule: { type: "fast_enemy", text: "妖魔加速来袭！" } },
  { id: 5,  layout: "grid_3x3",    chapter: 1, waveBonus: 8,  unlock: ["悟","空"],                     rule: { type: "boss", text: "白骨精登场！" } },
  { id: 6,  layout: "grid_3x4",    chapter: 1, waveBonus: 6,  unlock: ["八","戒"],                     rule: null },
  { id: 7,  layout: "grid_3x4",    chapter: 1, waveBonus: 7,  unlock: ["八","戒"],                     rule: { type: "more_spawns", text: "怪物数量+30%" } },
  { id: 8,  layout: "grid_3x4",    chapter: 1, waveBonus: 7,  unlock: ["沙"],                          rule: { type: "no_shield", text: "本关禁用「盾」" } },
  { id: 9,  layout: "grid_3x4",    chapter: 1, waveBonus: 8,  unlock: ["沙","奶"],                      rule: { type: "fast_enemy", text: "妖魔加速来袭！" } },
  { id: 10, layout: "grid_3x4",    chapter: 1, waveBonus: 10, unlock: ["沙","奶"],                      rule: { type: "boss", text: "白骨精·双生降临！" } },

  // ===== 第二章·火焰山（11-20）·进阶兵种+骑术进阶 =====
  { id: 11, layout: "grid_4x4_obs", chapter: 2, waveBonus: 8,  unlock: ["枪","弓"],                     rule: null },
  { id: 12, layout: "grid_4x4_obs", chapter: 2, waveBonus: 9,  unlock: ["枪","弓"],                     rule: { type: "rider_mirror_boost", text: "镜像召唤概率提升！" } },
  { id: 13, layout: "cross",        chapter: 2, waveBonus: 9,  unlock: ["炮","刺"],                     rule: { type: "rider_only", text: "本关考验骑马单位走格！" } },
  { id: 14, layout: "cross",        chapter: 2, waveBonus: 10, unlock: ["炮","刺"],                     rule: null },
  { id: 15, layout: "cross",        chapter: 2, waveBonus: 12, unlock: ["甲","锤"],                     rule: { type: "boss", text: "牛魔王先锋到来！" } },
  { id: 16, layout: "triangle",     chapter: 2, waveBonus: 10, unlock: ["甲","锤"],                     rule: { type: "long_charge", text: "三角地形·骑兵冲锋距离+1格！" } },
  { id: 17, layout: "triangle",     chapter: 2, waveBonus: 11, unlock: [],                             rule: { type: "more_spawns", text: "怪物海！" } },
  { id: 18, layout: "dual_lane",    chapter: 2, waveBonus: 11, unlock: ["吒"],                          rule: null },
  { id: 19, layout: "dual_lane",    chapter: 2, waveBonus: 12, unlock: ["吒"],                          rule: { type: "dual_lane_rider", text: "双车道·骑兵可跨线支援！" } },
  { id: 20, layout: "dual_lane",    chapter: 2, waveBonus: 15, unlock: [],                             rule: { type: "boss", text: "牛魔王亲征！" } },

  // ===== 第三章·灵山（21-30）·封神角色+全机制 =====
  { id: 21, layout: "spiral",       chapter: 3, waveBonus: 12, unlock: ["姜","牙"],                     rule: null },
  { id: 22, layout: "spiral",       chapter: 3, waveBonus: 13, unlock: ["姜","牙"],                     rule: { type: "fast_enemy", text: "极速妖魔！" } },
  { id: 23, layout: "ring",         chapter: 3, waveBonus: 13, unlock: ["申","豹"],                     rule: { type: "rider_charge_x2", text: "环形地形·骑兵冲锋伤害翻倍！" } },
  { id: 24, layout: "ring",         chapter: 3, waveBonus: 14, unlock: ["申","豹"],                     rule: { type: "no_rider_move", text: "障碍密布·骑兵走格受限！" } },
  { id: 25, layout: "stair",        chapter: 3, waveBonus: 15, unlock: [],                             rule: { type: "boss", text: "金翅大鹏降临！" } },
  { id: 26, layout: "stair",        chapter: 3, waveBonus: 14, unlock: [],                             rule: { type: "more_spawns", text: "无尽妖海！" } },
  { id: 27, layout: "hex",          chapter: 3, waveBonus: 15, unlock: [],                             rule: { type: "rider_jump", text: "六边形·骑兵可跳过障碍！" } },
  { id: 28, layout: "hex",          chapter: 3, waveBonus: 16, unlock: [],                             rule: { type: "fast_enemy", text: "全速冲锋！" } },
  { id: 29, layout: "maze",         chapter: 3, waveBonus: 17, unlock: [],                             rule: { type: "more_spawns", text: "最终试炼·怪海！" } },
  { id: 30, layout: "maze",         chapter: 3, waveBonus: 25, unlock: [],                             rule: { type: "final_boss", text: "终极BOSS·如来现身！" } },

  // ===== 第四章·封神台（31-40）·封神之战 =====
  { id: 31, layout: "grid_4x4_obs", chapter: 4, waveBonus: 15, unlock: [],                             rule: { type: "rider_berserk", text: "封神之力·骑兵狂暴时间翻倍！" } },
  { id: 32, layout: "cross",        chapter: 4, waveBonus: 16, unlock: [],                             rule: { type: "fast_enemy", text: "极速封神之战！" } },
  { id: 33, layout: "triangle",     chapter: 4, waveBonus: 17, unlock: [],                             rule: { type: "more_spawns", text: "封神怪物海！" } },
  { id: 34, layout: "dual_lane",    chapter: 4, waveBonus: 18, unlock: [],                             rule: { type: "rider_jump", text: "双车道·骑兵跳跃支援！" } },
  { id: 35, layout: "spiral",       chapter: 4, waveBonus: 20, unlock: [],                             rule: { type: "boss", text: "通天教主降临！" } },
  { id: 36, layout: "ring",         chapter: 4, waveBonus: 18, unlock: [],                             rule: { type: "rider_charge_x2", text: "环形冲锋·伤害翻倍！" } },
  { id: 37, layout: "stair",        chapter: 4, waveBonus: 19, unlock: [],                             rule: { type: "more_spawns", text: "万妖来袭！" } },
  { id: 38, layout: "hex",          chapter: 4, waveBonus: 20, unlock: [],                             rule: { type: "fast_enemy", text: "终极速度挑战！" } },
  { id: 39, layout: "maze",         chapter: 4, waveBonus: 22, unlock: [],                             rule: { type: "more_spawns", text: "最终封神之战！" } },
  { id: 40, layout: "spiral",       chapter: 4, waveBonus: 35, unlock: [],                             rule: { type: "final_boss", text: "终极BOSS·鸿钧老祖现身！" } },
];

/* ---------- 波次生成 ----------
 * 根据关卡 + 波次 + 规则生成敌人列表
 */
function generateWave(levelId, waveIdx) {
  const lv = LEVELS.find(l => l.id === levelId) || LEVELS[0];
  const list = [];
  let count = 4 + waveIdx * 2 + (lv.chapter - 1) * 3;

  // 规则修正
  if (lv.rule && lv.rule.type === "more_spawns") count = Math.ceil(count * 1.3);
  if (lv.rule && lv.rule.type === "fast_enemy") count += 2;

  const pool = ["妖","妖","妖","魔"];
  if (waveIdx >= 2) pool.push("鬼","小钻风");
  if (waveIdx >= 3) pool.push("鬼","鬼");
  if (lv.chapter >= 2) pool.push("小钻风","小钻风");
  if (lv.chapter >= 3) pool.push("鬼","魔","小钻风");

  for (let i = 0; i < count; i++) {
    list.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  // BOSS 关
  if (lv.rule && lv.rule.type === "boss" && waveIdx >= 4) {
    if (levelId >= 35) list.push("通天教主");
    else if (levelId >= 25) list.push("金翅大鹏");
    else if (lv.chapter === 1) list.push("白骨精");
    else list.push("牛魔王");
  }
  if (lv.rule && lv.rule.type === "final_boss" && waveIdx >= 5) {
    list.push(levelId >= 40 ? "鸿钧老祖" : "如来");
  }

  return list;
}

/* ---------- 敌人属性表（扩展） ---------- */
const ENEMY_DEFS = {
  "妖":      { hp: 30,  spd: 42, atk: 7,  r: 15, color: "#7fae52", gold: 1 },
  "魔":      { hp: 24,  spd: 68, atk: 6,  r: 13, color: "#c05fb0", gold: 1 },
  "鬼":      { hp: 65,  spd: 30, atk: 10, r: 17, color: "#6a7fd0", gold: 1 },
  "小钻风":  { hp: 50,  spd: 52, atk: 9,  r: 16, color: "#d0a44f", gold: 2 },
  "白骨精":  { hp: 240, spd: 36, atk: 16, r: 22, color: "#e8e8f0", gold: 8,  elite: true },
  "牛魔王":  { hp: 700, spd: 24, atk: 28, r: 30, color: "#c04040", gold: 25, boss: true },
  "金翅大鹏":{ hp: 1200,spd: 52, atk: 35, r: 28, color: "#e8c83a", gold: 40, boss: true },
  "如来":    { hp: 3000,spd: 18, atk: 50, r: 36, color: "#ffd700", gold: 100,boss: true },
  "通天教主":{ hp: 5000,spd: 22, atk: 65, r: 34, color: "#9333ea", gold: 150,boss: true },
  "鸿钧老祖":{ hp: 10000,spd: 15, atk: 80, r: 40, color: "#00ffff", gold: 300,boss: true },
};

/* ---------- 关卡规则效果查询 ---------- */
function getRuleEffect(levelId, effectType) {
  const lv = LEVELS.find(l => l.id === levelId);
  if (!lv || !lv.rule) return null;
  if (lv.rule.type === effectType) return lv.rule;
  return null;
}
