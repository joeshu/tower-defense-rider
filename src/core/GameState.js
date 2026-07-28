import { bus } from './EventBus.js';

export const GamePhase = Object.freeze({
  IDLE: 'idle',
  SHOP: 'shop',
  BATTLE: 'battle',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
});

export class GameState {
  constructor() {
    this.phase = GamePhase.IDLE;
    this.level = 1;
    this.chapter = 1;
    this.wave = 1;
    this.gold = 12;
    this.speed = 1;
    this.time = 0;
    this.shake = 0;

    this.heartHp = 100;
    this.heartMax = 100;
    this.heartX = 0;
    this.heartY = 0;
    this.heartScale = 1;

    this.cells = [];
    this.obstacles = [];
    this.cellSize = 0;
    this.layoutName = '';

    this.enemies = [];
    this.shots = [];
    this.floats = [];
    this.fx = [];

    this.cards = [];
    this.selCard = -1;
    this.selCell = -1;
    this.hoverCell = -1;
    this.dragging = -1;
    this.dragMoved = false;

    this.toSpawn = [];
    this.spawnT = 0;
    this.waveTotal = 0;
    this.waveKilled = 0;

    this.riders = [];
    this.riderMirrors = [];
    this.unlockedTypes = [];
  }

  setPhase(newPhase) {
    const oldPhase = this.phase;
    this.phase = newPhase;
    bus.emit('phase:change', { old: oldPhase, new: newPhase });
  }

  addGold(amount) {
    this.gold += amount;
    bus.emit('gold:change', { amount, total: this.gold });
  }

  spendGold(amount) {
    if (this.gold < amount) return false;
    this.gold -= amount;
    bus.emit('gold:change', { amount: -amount, total: this.gold });
    return true;
  }

  damageHeart(damage) {
    this.heartHp = Math.max(0, this.heartHp - damage);
    this.shake = Math.max(this.shake, Math.min(damage * 0.3, 10));
    bus.emit('heart:damage', { damage, hp: this.heartHp });
    if (this.heartHp <= 0) {
      this.setPhase(GamePhase.DEFEAT);
    }
  }

  healHeart(amount) {
    const before = this.heartHp;
    this.heartHp = Math.min(this.heartMax, this.heartHp + amount);
    const actual = this.heartHp - before;
    if (actual > 0) {
      bus.emit('heart:heal', { amount: actual, hp: this.heartHp });
    }
    return actual;
  }

  addFloat(x, y, text, color, big = false) {
    this.floats.push({ x, y, t: 0, txt: text, color, big });
  }

  addFx(type, x, y, extra = {}) {
    this.fx.push({ type, x, y, t: 0, ...extra });
  }

  reset() {
    this.phase = GamePhase.IDLE;
    this.wave = 1;
    this.gold = 12;
    this.heartHp = this.heartMax;
    this.enemies = [];
    this.shots = [];
    this.floats = [];
    this.fx = [];
    this.cells = [];
    this.selCard = -1;
    this.selCell = -1;
    this.hoverCell = -1;
    this.dragging = -1;
    this.riders = [];
    this.riderMirrors = [];
    this.toSpawn = [];
    this.spawnT = 0;
    this.waveTotal = 0;
    this.waveKilled = 0;
    this.time = 0;
    this.shake = 0;
    bus.emit('game:reset');
  }
}

export const game = new GameState();
