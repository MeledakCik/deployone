const store = new Map();
const exp = new Map();
const alive = (k) => { const e = exp.get(k); if (e && e < Date.now()) { store.delete(k); exp.delete(k); } return store.has(k); };
export const kv = {
  _store: store,
  async get(k) { return alive(k) ? store.get(k) : null; },
  async set(k, v, o = {}) { if (o.nx && alive(k)) return null; store.set(k, v); if (o.ex) exp.set(k, Date.now() + o.ex * 1000); else exp.delete(k); return "OK"; },
  async del(...ks) { let n = 0; for (const k of ks) { if (store.delete(k)) n++; exp.delete(k); } return n; },
  async exists(...ks) { return ks.filter((k) => alive(k)).length; },
  async incr(k) { const n = Number(alive(k) ? store.get(k) : 0) + 1; store.set(k, n); return n; },
  async expire(k, s) { exp.set(k, Date.now() + s * 1000); return 1; },
  async mget(...ks) { return ks.map((k) => (alive(k) ? store.get(k) : null)); },
  async sismember() { return 0; },
  pipeline() { const ops = []; const p = { set: (...a) => (ops.push(() => kv.set(...a)), p), expire: (...a) => (ops.push(() => kv.expire(...a)), p), async exec() { for (const o of ops) await o(); } }; return p; },
};
