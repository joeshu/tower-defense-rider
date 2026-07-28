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
 *   "triangle"  三角形阵列
 *   "stair"     阶梯形
 *   "hex"       六边形
 *   "diamond"   菱形
 *   "L_shape"   L形转角
 */
const LAYOUTS = {

  /* ===== 第一章·黄风岭（第1-10关） ===== */

  "lv1_grid_3x3_a": {
    type: "grid", cols: 3, rows: 3, centerGx: 1, centerGy: 1,
    slots: [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]],
    specials: [{ type: 'speed', cells: [[2,0]] }, { type: 'heal',  cells: [[0,2]] }],
    desc: "九宫·初阵"
  },

  "lv2_grid_3x3_b": {
    type: "grid", cols: 3, rows: 3, centerGx: 1, centerGy: 1,
    slots: [[0,0],[1,0],[2,0],[0,1],[2,1],[1,2],[2,2]],
    specials: [{ type: 'rage', cells: [[2,0]] }, { type: 'speed', cells: [[0,0]] }],
    desc: "九宫·石柱"
  },

  "lv3_cross_tiny": {
    type: "cross", cols: 3, rows: 3, centerGx: 1, centerGy: 1,
    slots: [[1,0],[0,1],[2,1],[1,2]],
    specials: [{ type: 'speed', cells: [[1,0]] }, { type: 'heal', cells: [[1,2]] }],
    desc: "小十字·初见"
  },

  "lv4_grid_3x3_c": {
    type: "grid", cols: 3, rows: 3, centerGx: 1, centerGy: 1,
    slots: [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2]],
    specials: [{ type: 'rage', cells: [[0,0],[2,0]] }],
    desc: "九宫·双角"
  },

  "lv5_diamond_3": {
    type: "diamond", cols: 3, rows: 3, centerGx: 1, centerGy: 1,
    slots: [[1,0],[0,1],[2,1],[1,2],[0,0],[2,0],[0,2],[2,2]],
    specials: [{ type: 'speed', cells: [[1,0]] }, { type: 'heal', cells: [[1,2]] }],
    desc: "菱形·白骨精"
  },

  "lv6_grid_3x4_a": {
    type: "grid", cols: 4, rows: 3, centerGx: 2, centerGy: 1,
    slots: [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[3,1],[0,2],[1,2],[2,2],[3,2]],
    specials: [{ type: 'speed', cells: [[0,0]] }, { type: 'rage', cells: [[3,0]] }, { type: 'heal', cells: [[0,2]] }],
    desc: "长阵·四门"
  },

  "lv7_grid_3x4_b": {
    type: "grid", cols: 4, rows: 3, centerGx: 2, centerGy: 1,
    slots: [[0,0],[1,0],[3,0],[0,1],[3,1],[0,2],[1,2],[2,2],[3,2]],
    specials: [{ type: 'rage', cells: [[0,0],[3,0]] }, { type: 'speed', cells: [[0,2]] }],
    desc: "长阵·双柱"
  },

  "lv8_L_shape": {
    type: "L_shape", cols: 4, rows: 3, centerGx: 1, centerGy: 1,
    slots: [[0,0],[1,0],[2,0],[0,1],[0,2],[1,2],[2,2],[3,2]],
    specials: [{ type: 'speed', cells: [[0,0]] }, { type: 'rage', cells: [[3,2]] }],
    desc: "L形·转角"
  },

  "lv9_cross_small": {
    type: "cross", cols: 5, rows: 3, centerGx: 2, centerGy: 1,
    slots: [[2,0],[1,1],[2,1],[3,1],[0,1],[4,1],[2,2]],
    specials: [{ type: 'speed', cells: [[2,0],[2,2]] }, { type: 'rage', cells: [[0,1],[4,1]] }],
    desc: "十字·疾风"
  },

  "lv10_grid_4x3_boss": {
    type: "grid", cols: 4, rows: 3, centerGx: 2, centerGy: 1,
    slots: [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[3,1],[0,2],[1,2],[2,2],[3,2]],
    specials: [{ type: 'rage', cells: [[0,0],[3,0]] }, { type: 'heal', cells: [[0,2],[3,2]] }],
    desc: "长阵·双生"
  },

  /* ===== 第二章·火焰山（第11-20关） ===== */

  "lv11_grid_4x4_a": {
    type: "grid", cols: 4, rows: 4, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],
      [0,1],[1,1],[2,1],[3,1],
      [0,2],[1,2],[3,2],
      [0,3],[1,3],[2,3],[3,3],
    ],
    specials: [{ type: 'rage', cells: [[0,0],[3,3]] }, { type: 'speed', cells: [[3,0]] }, { type: 'heal', cells: [[0,3]] }],
    desc: "四方·开放"
  },

  "lv12_grid_4x4_plus": {
    type: "grid", cols: 4, rows: 4, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],
      [0,1],[1,1],[3,1],
      [0,2],[1,2],[3,2],
      [0,3],[1,3],[2,3],[3,3],
    ],
    specials: [{ type: 'speed', cells: [[0,0],[3,0]] }, { type: 'heal', cells: [[0,3],[3,3]] }],
    desc: "四方·石像"
  },

  "lv13_cross_long": {
    type: "cross", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [2,0],
      [2,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [2,3],
      [2,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'rage', cells: [[0,2],[4,2]] }],
    desc: "长十字·冲锋"
  },

  "lv14_cross_wide": {
    type: "cross", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [1,0],[2,0],[3,0],
      [1,1],[2,1],[3,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [1,3],[2,3],[3,3],
      [1,4],[2,4],[3,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'rage', cells: [[0,2],[4,2]] }],
    desc: "宽十字·驰骋"
  },

  "lv15_cross_boss": {
    type: "cross", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [2,0],
      [1,1],[2,1],[3,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [1,3],[2,3],[3,3],
      [2,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0]] }, { type: 'rage', cells: [[0,2],[4,2]] }, { type: 'heal', cells: [[2,4]] }],
    desc: "十字·牛魔王"
  },

  "lv16_triangle_up": {
    type: "triangle", cols: 5, rows: 4, centerGx: 2, centerGy: 2,
    slots: [
              [2,0],
        [1,1],[2,1],[3,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
    ],
    specials: [{ type: 'speed', cells: [[2,0]] }, { type: 'rage', cells: [[0,3],[4,3]] }],
    desc: "正三角·冲锋"
  },

  "lv17_triangle_down": {
    type: "triangle", cols: 5, rows: 4, centerGx: 2, centerGy: 1,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[1,1],[3,1],[4,1],
        [1,2],[2,2],[3,2],
              [2,3],
    ],
    specials: [{ type: 'rage', cells: [[0,0],[4,0]] }, { type: 'heal', cells: [[2,3]] }],
    desc: "倒三角·怪海"
  },

  "lv18_dual_lane_a": {
    type: "dual_lane", cols: 5, rows: 4, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[3,0],[4,0],
      [0,1],[1,1],[3,1],[4,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[1,3],[3,3],[4,3],
    ],
    specials: [{ type: 'speed', cells: [[0,0],[4,3]] }, { type: 'rage', cells: [[4,0],[0,3]] }],
    desc: "双道·分兵"
  },

  "lv19_dual_lane_b": {
    type: "dual_lane", cols: 5, rows: 4, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[1,1],[3,1],[4,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,3]] }, { type: 'rage', cells: [[0,0],[4,3]] }],
    desc: "双道·连桥"
  },

  "lv20_dual_lane_boss": {
    type: "dual_lane", cols: 5, rows: 4, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
    ],
    specials: [{ type: 'rage', cells: [[0,0],[4,0]] }, { type: 'heal', cells: [[0,3],[4,3]] }, { type: 'speed', cells: [[2,1]] }],
    desc: "双道·牛王"
  },

  /* ===== 第三章·灵山（第21-30关） ===== */

  "lv21_spiral_in": {
    type: "spiral", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[4,1],
      [0,2],[4,2],
      [0,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'heal', cells: [[0,0],[4,4]] }],
    desc: "内螺旋·子牙"
  },

  "lv22_spiral_out": {
    type: "spiral", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0]] }, { type: 'rage', cells: [[0,0],[4,0]] }, { type: 'heal', cells: [[2,4]] }],
    desc: "外螺旋·疾风"
  },

  "lv23_ring_outer": {
    type: "ring", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[4,1],
      [0,2],[4,2],
      [0,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'rage', cells: [[0,2],[4,2]] }],
    desc: "外环·冲锋"
  },

  "lv24_ring_inner": {
    type: "ring", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[2,0],[4,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [0,4],[2,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'heal', cells: [[0,0],[4,4]] }],
    desc: "内环·困兽"
  },

  "lv25_stair_up": {
    type: "stair", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
              [2,0],
            [1,1],[2,1],[3,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0]] }, { type: 'rage', cells: [[0,4],[4,4]] }],
    desc: "升阶·金翅"
  },

  "lv26_stair_down": {
    type: "stair", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
            [1,3],[2,3],[3,3],
              [2,4],
    ],
    specials: [{ type: 'rage', cells: [[0,0],[4,0]] }, { type: 'heal', cells: [[2,4]] }],
    desc: "降阶·妖海"
  },

  "lv27_hex_6": {
    type: "hex", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
              [2,0],
        [1,1],[2,1],[3,1],
      [0,2],[1,2],[3,2],[4,2],
        [1,3],[2,3],[3,3],
              [2,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'rage', cells: [[0,2],[4,2]] }],
    desc: "六角·腾跃"
  },

  "lv28_hex_plus": {
    type: "hex", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
            [1,0],[2,0],[3,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
            [1,4],[2,4],[3,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'rage', cells: [[0,1],[4,1]] }, { type: 'heal', cells: [[0,3],[4,3]] }],
    desc: "大六角·神速"
  },

  "lv29_maze_simple": {
    type: "maze", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[4,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
                          [4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0]] }, { type: 'rage', cells: [[4,0]] }, { type: 'heal', cells: [[0,4]] }],
    desc: "迷宫·试炼"
  },

  "lv30_maze_boss": {
    type: "maze", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[2,1],[4,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[2,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0]] }, { type: 'rage', cells: [[0,0],[4,0]] }, { type: 'heal', cells: [[2,4]] }],
    desc: "迷宫·如来"
  },

  /* ===== 第四章·封神台（第31-40关） ===== */

  "lv31_grid_5x5_a": {
    type: "grid", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'rage', cells: [[0,0],[4,0],[0,4],[4,4]] }, { type: 'speed', cells: [[2,0],[2,4]] }],
    desc: "五五·封神"
  },

  "lv32_cross_giant": {
    type: "cross", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
            [2,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
            [2,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'rage', cells: [[0,2],[4,2]] }],
    desc: "巨十字·极速"
  },

  "lv33_triangle_big": {
    type: "triangle", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
              [2,0],
        [1,1],[2,1],[3,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0]] }, { type: 'rage', cells: [[0,4],[4,4]] }, { type: 'heal', cells: [[0,2],[4,2]] }],
    desc: "大三角·妖海"
  },

  "lv34_dual_lane_cross": {
    type: "dual_lane", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[3,0],[4,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [0,4],[1,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,1],[2,3]] }, { type: 'rage', cells: [[0,0],[4,0]] }],
    desc: "双十字·跳跃"
  },

  "lv35_spiral_boss": {
    type: "spiral", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'rage', cells: [[0,0],[4,0],[0,4],[4,4]] }, { type: 'heal', cells: [[2,2]] }],
    desc: "螺旋·通天"
  },

  "lv36_ring_double": {
    type: "ring", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[1,1],[3,1],[4,1],
      [0,2],[1,2],[3,2],[4,2],
      [0,3],[1,3],[3,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'rage', cells: [[0,2],[4,2]] }],
    desc: "双环·冲锋"
  },

  "lv37_stair_complex": {
    type: "stair", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],
      [0,1],[1,1],[2,1],[3,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
            [1,3],[2,3],[3,3],[4,3],
                  [2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[0,0]] }, { type: 'rage', cells: [[4,4]] }, { type: 'heal', cells: [[2,2]] }],
    desc: "错阶·万妖"
  },

  "lv38_hex_giant": {
    type: "hex", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
            [1,0],[2,0],[3,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
            [1,4],[2,4],[3,4],
    ],
    specials: [{ type: 'speed', cells: [[2,0],[2,4]] }, { type: 'rage', cells: [[0,1],[4,1]] }, { type: 'heal', cells: [[0,3],[4,3]] }],
    desc: "巨六角·极限"
  },

  "lv39_maze_hard": {
    type: "maze", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[2,1],[4,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [0,3],[2,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'speed', cells: [[0,0],[4,0]] }, { type: 'rage', cells: [[2,0]] }, { type: 'heal', cells: [[2,4]] }],
    desc: "迷宫·封神"
  },

  "lv40_spiral_final": {
    type: "spiral", cols: 5, rows: 5, centerGx: 2, centerGy: 2,
    slots: [
      [0,0],[1,0],[2,0],[3,0],[4,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],
    ],
    specials: [{ type: 'rage', cells: [[0,0],[4,0],[0,4],[4,4]] }, { type: 'speed', cells: [[2,0],[2,4]] }, { type: 'heal', cells: [[2,2]] }],
    desc: "终极·鸿钧"
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
  { id: 1,  layout: "lv1_grid_3x3_a",   chapter: 1, waveBonus: 4,  unlock: ["疗","退"],                    rule: { type: "mirror_unlock", text: "🐴 骑马单位已就位！路过友军可召唤镜像出战！" } },
  { id: 2,  layout: "lv2_grid_3x3_b",   chapter: 1, waveBonus: 5,  unlock: ["雷","冰"],                    rule: null },
  { id: 3,  layout: "lv3_cross_tiny",   chapter: 1, waveBonus: 5,  unlock: ["唐","僧"],                    rule: { type: "no_archer", text: "本关禁用「箭」" } },
  { id: 4,  layout: "lv4_grid_3x3_c",   chapter: 1, waveBonus: 6,  unlock: ["火","毒"],                    rule: { type: "fast_enemy", text: "妖魔加速来袭！" } },
  { id: 5,  layout: "lv5_diamond_3",    chapter: 1, waveBonus: 8,  unlock: ["悟","空"],                    rule: { type: "boss", text: "白骨精登场！" } },
  { id: 6,  layout: "lv6_grid_3x4_a",   chapter: 1, waveBonus: 6,  unlock: ["八","戒"],                    rule: null },
  { id: 7,  layout: "lv7_grid_3x4_b",   chapter: 1, waveBonus: 7,  unlock: ["爆"],                          rule: { type: "more_spawns", text: "怪物数量+30%" } },
  { id: 8,  layout: "lv8_L_shape",      chapter: 1, waveBonus: 7,  unlock: ["沙"],                          rule: { type: "no_shield", text: "本关禁用「盾」" } },
  { id: 9,  layout: "lv9_cross_small",  chapter: 1, waveBonus: 8,  unlock: ["娥"],                          rule: { type: "fast_enemy", text: "妖魔加速来袭！" } },
  { id: 10, layout: "lv10_grid_4x3_boss", chapter: 1, waveBonus: 10, unlock: ["奶"],                        rule: { type: "boss", text: "白骨精·双生降临！" } },

  // ===== 第二章·火焰山（11-20）·进阶兵种+骑术进阶 =====
  { id: 11, layout: "lv11_grid_4x4_a",  chapter: 2, waveBonus: 8,  unlock: ["枪","弓"],                    rule: null },
  { id: 12, layout: "lv12_grid_4x4_plus", chapter: 2, waveBonus: 9, unlock: ["神"],                        rule: { type: "rider_mirror_boost", text: "镜像召唤概率提升！" } },
  { id: 13, layout: "lv13_cross_long",  chapter: 2, waveBonus: 9,  unlock: ["炮","刺"],                    rule: { type: "rider_only", text: "本关考验骑马单位走格！" } },
  { id: 14, layout: "lv14_cross_wide",  chapter: 2, waveBonus: 10, unlock: ["豪"],                          rule: null },
  { id: 15, layout: "lv15_cross_boss",  chapter: 2, waveBonus: 12, unlock: ["甲","锤"],                    rule: { type: "boss", text: "牛魔王先锋到来！" } },
  { id: 16, layout: "lv16_triangle_up", chapter: 2, waveBonus: 10, unlock: ["甲","锤"],                     rule: { type: "long_charge", text: "三角地形·骑兵冲锋距离+1格！" } },
  { id: 17, layout: "lv17_triangle_down", chapter: 2, waveBonus: 11, unlock: [],                           rule: { type: "more_spawns", text: "怪物海！" } },
  { id: 18, layout: "lv18_dual_lane_a", chapter: 2, waveBonus: 11, unlock: ["吒"],                          rule: null },
  { id: 19, layout: "lv19_dual_lane_b", chapter: 2, waveBonus: 12, unlock: ["吒"],                          rule: { type: "dual_lane_rider", text: "双车道·骑兵可跨线支援！" } },
  { id: 20, layout: "lv20_dual_lane_boss", chapter: 2, waveBonus: 15, unlock: [],                          rule: { type: "boss", text: "牛魔王亲征！" } },

  // ===== 第三章·灵山（21-30）·封神角色+全机制 =====
  { id: 21, layout: "lv21_spiral_in",   chapter: 3, waveBonus: 12, unlock: ["姜","牙"],                     rule: null },
  { id: 22, layout: "lv22_spiral_out",  chapter: 3, waveBonus: 13, unlock: ["姜","牙"],                     rule: { type: "fast_enemy", text: "极速妖魔！" } },
  { id: 23, layout: "lv23_ring_outer",  chapter: 3, waveBonus: 13, unlock: ["申","豹"],                     rule: { type: "rider_charge_x2", text: "环形地形·骑兵冲锋伤害翻倍！" } },
  { id: 24, layout: "lv24_ring_inner",  chapter: 3, waveBonus: 14, unlock: ["申","豹"],                     rule: { type: "no_rider_move", text: "障碍密布·骑兵走格受限！" } },
  { id: 25, layout: "lv25_stair_up",    chapter: 3, waveBonus: 15, unlock: [],                             rule: { type: "boss", text: "金翅大鹏降临！" } },
  { id: 26, layout: "lv26_stair_down",  chapter: 3, waveBonus: 14, unlock: [],                             rule: { type: "more_spawns", text: "无尽妖海！" } },
  { id: 27, layout: "lv27_hex_6",       chapter: 3, waveBonus: 15, unlock: [],                             rule: { type: "rider_jump", text: "六边形·骑兵可跳过障碍！" } },
  { id: 28, layout: "lv28_hex_plus",    chapter: 3, waveBonus: 16, unlock: [],                             rule: { type: "fast_enemy", text: "全速冲锋！" } },
  { id: 29, layout: "lv29_maze_simple", chapter: 3, waveBonus: 17, unlock: [],                             rule: { type: "more_spawns", text: "最终试炼·怪海！" } },
  { id: 30, layout: "lv30_maze_boss",   chapter: 3, waveBonus: 25, unlock: [],                             rule: { type: "final_boss", text: "终极BOSS·如来现身！" } },

  // ===== 第四章·封神台（31-40）·封神之战 =====
  { id: 31, layout: "lv31_grid_5x5_a",  chapter: 4, waveBonus: 15, unlock: [],                             rule: { type: "rider_berserk", text: "封神之力·骑兵狂暴时间翻倍！" } },
  { id: 32, layout: "lv32_cross_giant", chapter: 4, waveBonus: 16, unlock: [],                             rule: { type: "fast_enemy", text: "极速封神之战！" } },
  { id: 33, layout: "lv33_triangle_big", chapter: 4, waveBonus: 17, unlock: [],                            rule: { type: "more_spawns", text: "封神怪物海！" } },
  { id: 34, layout: "lv34_dual_lane_cross", chapter: 4, waveBonus: 18, unlock: [],                         rule: { type: "rider_jump", text: "双车道·骑兵跳跃支援！" } },
  { id: 35, layout: "lv35_spiral_boss", chapter: 4, waveBonus: 20, unlock: [],                             rule: { type: "boss", text: "通天教主降临！" } },
  { id: 36, layout: "lv36_ring_double", chapter: 4, waveBonus: 18, unlock: [],                             rule: { type: "rider_charge_x2", text: "环形冲锋·伤害翻倍！" } },
  { id: 37, layout: "lv37_stair_complex", chapter: 4, waveBonus: 19, unlock: [],                           rule: { type: "more_spawns", text: "万妖来袭！" } },
  { id: 38, layout: "lv38_hex_giant",   chapter: 4, waveBonus: 20, unlock: [],                             rule: { type: "fast_enemy", text: "终极速度挑战！" } },
  { id: 39, layout: "lv39_maze_hard",   chapter: 4, waveBonus: 22, unlock: [],                             rule: { type: "more_spawns", text: "最终封神之战！" } },
  { id: 40, layout: "lv40_spiral_final", chapter: 4, waveBonus: 35, unlock: [],                            rule: { type: "final_boss", text: "终极BOSS·鸿钧老祖现身！" } },
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
