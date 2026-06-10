// Brain LRU cache — tiny, no deps. Per-key TTL.
// Invalidation: store.ts emits via global bus, brain.ts subscribes.

type Entry<V> = { v: V; exp: number };

export class Lru<K, V> {
  private map = new Map<K, Entry<V>>();
  constructor(private max: number, private ttlMs: number) {}

  get(k: K): V | undefined {
    const e = this.map.get(k);
    if (!e) return;
    if (e.exp < Date.now()) {
      this.map.delete(k);
      return;
    }
    // touch — move to end
    this.map.delete(k);
    this.map.set(k, e);
    return e.v;
  }

  set(k: K, v: V): void {
    if (this.map.has(k)) this.map.delete(k);
    else if (this.map.size >= this.max) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(k, { v, exp: Date.now() + this.ttlMs });
  }

  delete(k: K): void {
    this.map.delete(k);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}
