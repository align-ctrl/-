// 저장소 어댑터 (Cloudflare 무료 플랜 기준)
//  - d1    : Cloudflare D1 (무료) — 병원 설정 / 날짜별 이용 횟수 / 오류 코드 / 요청 제한 카운터
//  - memory: D1 미연결 — 기본 설정(+환경변수)으로 동작, 관리자 저장 불가(명확히 안내)
// 환자 이름·전화번호·차트번호·진료기록·자유 입력·리뷰 원문은 어떤 테이블에도 저장하지 않는다.
import defaults from '../shared/default-config.json';

export class StorageUnavailable extends Error {}
export const EVENT_TYPES = ['visit', 'start', 'generate_ai', 'generate_demo', 'regenerate', 'select', 'copy', 'naver', 'error', 'ai_call'];
const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

export function getDefaults(env) {
  const d = structuredClone(defaults);
  if (env.NAVER_PLACE_URL) d.naverPlaceUrl = String(env.NAVER_PLACE_URL).trim();
  if (env.HOSPITAL_NAME) d.hospital.name = String(env.HOSPITAL_NAME).trim();
  return d;
}
function merge(env, saved) {
  const d = getDefaults(env);
  if (!saved) return d;
  return { ...d, ...saved, naverPlaceUrl: saved.naverPlaceUrl || d.naverPlaceUrl, texts: { ...d.texts, ...(saved.texts || {}) } };
}

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS stats (day TEXT NOT NULL, type TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, type))',
  'CREATE TABLE IF NOT EXISTS errors (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, code TEXT NOT NULL, place TEXT, detail TEXT)',
  'CREATE TABLE IF NOT EXISTS ratelimit (k TEXT PRIMARY KEY, n INTEGER NOT NULL, exp INTEGER NOT NULL)'
];
let schemaReady = null; // 격리 인스턴스(isolate)당 1회 테이블 자동 생성 → 별도 마이그레이션 작업 불필요

function d1Store(db) {
  const ready = () => (schemaReady ||= db.batch(SCHEMA.map((s) => db.prepare(s))).catch((e) => { schemaReady = null; throw e; }));
  return {
    backend: 'd1',
    async loadConfig() { await ready(); const r = await db.prepare('SELECT v FROM settings WHERE k = ?').bind('config').first(); return r ? JSON.parse(r.v) : null; },
    async saveConfig(cfg) { await ready(); await db.prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind('config', JSON.stringify(cfg)).run(); },
    async count(type) { await ready(); await db.prepare('INSERT INTO stats (day, type, n) VALUES (?, ?, 1) ON CONFLICT(day, type) DO UPDATE SET n = n + 1').bind(kstDay(), type).run(); },
    async todayCount(type) { await ready(); const r = await db.prepare('SELECT n FROM stats WHERE day = ? AND type = ?').bind(kstDay(), type).first(); return r ? r.n : 0; },
    async stats() {
      await ready();
      const { results } = await db.prepare('SELECT day, type, n FROM stats WHERE day >= ? ORDER BY day DESC').bind(new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)).all();
      const days = {};
      for (const r of results) (days[r.day] ||= {})[r.type] = r.n;
      return { days };
    },
    async pushError(e) {
      await ready();
      await db.batch([
        db.prepare('INSERT INTO errors (at, code, place, detail) VALUES (?, ?, ?, ?)').bind(e.at, e.code, e.where, e.detail),
        db.prepare('DELETE FROM errors WHERE id <= (SELECT MAX(id) - 200 FROM errors)')
      ]);
    },
    async errors() { await ready(); const { results } = await db.prepare('SELECT at, code, place AS "where", detail FROM errors ORDER BY id DESC LIMIT 200').all(); return results; },
    async clearErrors() { await ready(); await db.prepare('DELETE FROM errors').run(); },
    async hit(key, windowSec) {
      await ready();
      const now = Date.now();
      const r = await db.prepare(
        'INSERT INTO ratelimit (k, n, exp) VALUES (?1, 1, ?2) ON CONFLICT(k) DO UPDATE SET n = CASE WHEN exp < ?3 THEN 1 ELSE n + 1 END, exp = CASE WHEN exp < ?3 THEN ?2 ELSE exp END RETURNING n'
      ).bind(key, now + windowSec * 1000, now).first();
      if (Math.random() < 0.02) await db.prepare('DELETE FROM ratelimit WHERE exp < ?').bind(now).run(); // 만료 키 정리
      return r.n;
    }
  };
}

// D1 미연결 시: isolate 메모리 (영구 저장 아님)
const mem = { errors: [], stats: {}, rl: new Map() };
const memoryStore = {
  backend: 'memory',
  async loadConfig() { return null; },
  async saveConfig() { throw new StorageUnavailable('memory'); },
  async count(type) { const d = (mem.stats[kstDay()] ||= {}); d[type] = (d[type] || 0) + 1; },
  async todayCount(type) { return mem.stats[kstDay()]?.[type] || 0; },
  async stats() { return { days: mem.stats }; },
  async pushError(e) { mem.errors.unshift(e); mem.errors.length = Math.min(mem.errors.length, 50); },
  async errors() { return mem.errors; },
  async clearErrors() { mem.errors = []; },
  async hit(key, windowSec) {
    const now = Date.now();
    const h = mem.rl.get(key);
    if (!h || h.exp < now) { if (mem.rl.size > 5000) mem.rl.clear(); mem.rl.set(key, { n: 1, exp: now + windowSec * 1000 }); return 1; }
    return ++h.n;
  }
};

let cache = null;
let cacheAt = 0;
export function createStore(env) {
  const s = env.DB ? d1Store(env.DB) : memoryStore;
  return {
    backend: s.backend,
    async getConfig() {
      if (cache && Date.now() - cacheAt < 30_000) return cache;
      try { cache = merge(env, await s.loadConfig()); } catch { cache = cache || merge(env, null); }
      cacheAt = Date.now();
      return cache;
    },
    async saveConfig(cfg) { await s.saveConfig(cfg); cache = merge(env, cfg); cacheAt = Date.now(); },
    async countEvent(type) { if (EVENT_TYPES.includes(type)) { try { await s.count(type); } catch { /* 통계 실패 무시 */ } } },
    async todayCount(type) { try { return await s.todayCount(type); } catch { return 0; } },
    getStats: () => s.stats(),
    async logError(code, where, detail = '') {
      try {
        await s.pushError({ at: new Date().toISOString(), code: String(code).slice(0, 60), where: String(where).slice(0, 60), detail: String(detail).slice(0, 120) });
        await s.count('error');
      } catch { /* ignore */ }
    },
    getErrors: () => s.errors(),
    clearErrors: () => s.clearErrors(),
    async hit(name, ipHash, windowSec) {
      const key = `${name}:${ipHash}:${Math.floor(Date.now() / 1000 / windowSec)}`;
      try { return await s.hit(key, windowSec); } catch { return memoryStore.hit(key, windowSec); }
    }
  };
}
