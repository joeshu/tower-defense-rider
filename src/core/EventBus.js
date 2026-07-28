export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const set = this._listeners.get(event);
    if (set) set.delete(handler);
  }

  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const h of set) {
      try { h(payload); } catch (e) { console.error(`[EventBus] ${event} handler error:`, e); }
    }
  }

  clear() {
    this._listeners.clear();
  }
}

export const bus = new EventBus();
