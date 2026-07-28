import { dist2 } from '../utils/math.js';

export class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this._count = 0;
  }

  clear() {
    this.grid.clear();
    this._count = 0;
  }

  get count() {
    return this._count;
  }

  _key(gx, gy) {
    return gx + ',' + gy;
  }

  _gridCoord(x, y) {
    return [
      Math.floor(x / this.cellSize),
      Math.floor(y / this.cellSize)
    ];
  }

  insert(item, x, y) {
    const [gx, gy] = this._gridCoord(x, y);
    const key = this._key(gx, gy);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(item);
    this._count++;
  }

  remove(item, x, y) {
    const [gx, gy] = this._gridCoord(x, y);
    const key = this._key(gx, gy);
    const bucket = this.grid.get(key);
    if (!bucket) return false;
    const idx = bucket.indexOf(item);
    if (idx < 0) return false;
    bucket.splice(idx, 1);
    this._count--;
    if (bucket.length === 0) {
      this.grid.delete(key);
    }
    return true;
  }

  update(item, oldX, oldY, newX, newY) {
    const [ogx, ogy] = this._gridCoord(oldX, oldY);
    const [ngx, ngy] = this._gridCoord(newX, newY);
    if (ogx === ngx && ogy === ngy) return;
    this.remove(item, oldX, oldY);
    this.insert(item, newX, newY);
  }

  queryRect(x, y, w, h, out = []) {
    const [gx0, gy0] = this._gridCoord(x, y);
    const [gx1, gy1] = this._gridCoord(x + w, y + h);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const bucket = this.grid.get(this._key(gx, gy));
        if (bucket) {
          for (const item of bucket) out.push(item);
        }
      }
    }
    return out;
  }

  queryRadius(cx, cy, radius, out = []) {
    const r2 = radius * radius;
    const [gx0, gy0] = this._gridCoord(cx - radius, cy - radius);
    const [gx1, gy1] = this._gridCoord(cx + radius, cy + radius);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const bucket = this.grid.get(this._key(gx, gy));
        if (!bucket) continue;
        for (const item of bucket) {
          if (dist2(cx, cy, item.x, item.y) <= r2) {
            out.push(item);
          }
        }
      }
    }
    return out;
  }

  findNearest(cx, cy, radius, filter = null) {
    const r2 = radius * radius;
    let best = null;
    let bestDist = Infinity;
    const [gx0, gy0] = this._gridCoord(cx - radius, cy - radius);
    const [gx1, gy1] = this._gridCoord(cx + radius, cy + radius);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const bucket = this.grid.get(this._key(gx, gy));
        if (!bucket) continue;
        for (const item of bucket) {
          if (filter && !filter(item)) continue;
          const d2 = dist2(cx, cy, item.x, item.y);
          if (d2 <= r2 && d2 < bestDist) {
            bestDist = d2;
            best = item;
          }
        }
      }
    }
    return best ? { item, dist: Math.sqrt(bestDist) } : null;
  }

  forEachInRadius(cx, cy, radius, callback, filter = null) {
    const r2 = radius * radius;
    const [gx0, gy0] = this._gridCoord(cx - radius, cy - radius);
    const [gx1, gy1] = this._gridCoord(cx + radius, cy + radius);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const bucket = this.grid.get(this._key(gx, gy));
        if (!bucket) continue;
        for (const item of bucket) {
          if (filter && !filter(item)) continue;
          if (dist2(cx, cy, item.x, item.y) <= r2) {
            callback(item);
          }
        }
      }
    }
  }
}
