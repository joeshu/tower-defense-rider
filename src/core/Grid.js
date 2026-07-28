import { manhattan } from '../utils/math.js';

export function adjacent(a, b) {
  const dc = Math.abs(a.gc - b.gc);
  const dr = Math.abs(a.gr - b.gr);
  return dc + dr === 1;
}

export function buildLayoutCells(layout, width, height) {
  const cx = width / 2;
  const cy = height * 0.44;
  const maxDim = Math.max(layout.cols, layout.rows, 5);
  const cellSize = Math.min(width * 0.95 / maxDim, height * 0.38 / maxDim, 70);
  const cellGap = cellSize * 1.02;

  const centerGx = layout.centerGx !== undefined ? layout.centerGx : Math.floor(layout.cols / 2);
  const centerGy = layout.centerGy !== undefined ? layout.centerGy : Math.floor(layout.rows / 2);

  let heartOffsetY = -cellSize * 0.15;
  let heartScale = 1;
  switch (layout.type) {
    case 'ring':    heartOffsetY = 0;              heartScale = 1.1;  break;
    case 'cross':   heartOffsetY = -cellSize*0.1;  heartScale = 1;    break;
    case 'triangle':heartOffsetY = cellSize*0.3;   heartScale = 1;    break;
    case 'hex':     heartOffsetY = 0;              heartScale = 1;    break;
  }

  const slotSet = new Set(layout.slots.map(s => s[0] + ',' + s[1]));
  const obsSet = new Set((layout.obstacles || []).map(s => s[0] + ',' + s[1]));

  const specialMap = {};
  if (layout.specials) {
    for (const sp of layout.specials) {
      for (const c of sp.cells) {
        specialMap[c[0] + ',' + c[1]] = sp.type;
      }
    }
  }

  const cells = [];
  const obstacles = [];

  for (let gy = 0; gy < layout.rows; gy++) {
    for (let gx = 0; gx < layout.cols; gx++) {
      const key = gx + ',' + gy;
      if (gx === centerGx && gy === centerGy) continue;
      const px = cx + (gx - centerGx) * cellGap;
      const py = cy + (gy - centerGy) * cellGap;

      if (obsSet.has(key)) {
        obstacles.push({ gx, gy, px, py });
        continue;
      }
      if (!slotSet.has(key)) continue;

      const cellObj = { gc: gx, gr: gy, px, py, unit: null };
      if (specialMap[key]) cellObj.special = specialMap[key];
      cells.push(cellObj);
    }
  }

  return {
    cells,
    obstacles,
    cellSize,
    heartX: cx,
    heartY: cy + heartOffsetY,
    heartScale,
    centerGx, centerGy,
    cellGap,
  };
}

export function recomputeCombos(cells, comboPairs) {
  for (const c of cells) {
    if (!c.unit) continue;
    c.unit.combo = false;
    c.unit.partner = -1;
    c.unit.aura = 1;
  }

  const pair = (a, b) => {
    const used = new Set();
    cells.forEach((ca, i) => {
      if (!ca.unit || ca.unit.ch !== a || used.has(i) || ca.unit.combo) return;
      cells.forEach((cb, j) => {
        if (ca.unit.combo || !cb.unit || cb.unit.ch !== b || used.has(j) || cb.unit.combo) return;
        if (adjacent(ca, cb)) {
          ca.unit.combo = cb.unit.combo = true;
          ca.unit.partner = j;
          cb.unit.partner = i;
          used.add(i); used.add(j);
        }
      });
    });
  };

  for (const [a, b] of comboPairs) pair(a, b);

  for (const c of cells) {
    if (!c.unit || c.unit.ch === '速') continue;
    let m = 1;
    for (const o of cells) {
      if (o.unit && o.unit.ch === '速' && adjacent(c, o)) {
        m += 0.35 * o.unit.lv;
      }
    }
    c.unit.aura = m;
  }
}

export function findCellByGrid(cells, gx, gy) {
  return cells.find(c => c.gc === gx && c.gr === gy);
}

export function cellKey(gx, gy) {
  return gx + ',' + gy;
}

export function buildCellIndex(cells) {
  const map = new Map();
  for (const c of cells) {
    map.set(cellKey(c.gc, c.gr), c);
  }
  return map;
}

export function neighborsOf(cell, cellIndex) {
  const result = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of dirs) {
    const n = cellIndex.get(cellKey(cell.gc + dx, cell.gr + dy));
    if (n) result.push(n);
  }
  return result;
}
