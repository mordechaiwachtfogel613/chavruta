// In-memory stand-in for @vercel/kv, used only by tests/dev-server.mjs
const store = new Map();
const ttl = new Map();
const alive = (k) => { const t = ttl.get(k); if (t && t < Date.now()) { store.delete(k); ttl.delete(k); } return store.has(k); };
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export const kv = {
  async get(k) { return alive(k) ? clone(store.get(k)) : null; },
  async set(k, v, opts) { store.set(k, clone(v)); if (opts?.ex) ttl.set(k, Date.now() + opts.ex * 1000); return 'OK'; },
  async del(k) { store.delete(k); },
  async incr(k) { const n = (alive(k) ? store.get(k) : 0) + 1; store.set(k, n); return n; },
  async expire(k, s) { ttl.set(k, Date.now() + s * 1000); },
  async sadd(k, ...m) { const s = new Set(store.get(k) || []); m.forEach(x => s.add(x)); store.set(k, [...s]); },
  async smembers(k) { return clone(store.get(k) || []); },
  async hset(k, obj) { const h = store.get(k) || {}; Object.assign(h, obj); store.set(k, h); },
  async hget(k, f) { const h = store.get(k) || {}; return clone(h[f] ?? null); },
  async hgetall(k) { return store.has(k) ? clone(store.get(k)) : null; },
  async hdel(k, f) { const h = store.get(k) || {}; delete h[f]; store.set(k, h); },
  async lpush(k, v) { const l = store.get(k) || []; l.unshift(v); store.set(k, l); },
  async lrange(k, a, b) { const l = store.get(k) || []; return clone(l.slice(a, b === -1 ? undefined : b + 1)); },
};
export default kv;
