// ALIGN REVIEW API — Cloudflare Pages Functions (Web 표준 Request/Response)
// 엔드포인트와 동작은 기존 Express 버전과 동일하다.
import { createStore, EVENT_TYPES, getDefaults, StorageUnavailable } from './store.mjs';
import { aiEnabled, generateWithAI, AiError, STYLES } from './ai.mjs';
import { generateDemo } from './demo.mjs';
import { maskPersonalInfo } from './privacy.mjs';
import { adminConfigured, checkPassword, issueToken, verifyToken, hashIp } from './auth.mjs';
import { sanitizeConfig, ValidationError } from './sanitize.mjs';

const SEC_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: SEC_HEADERS });
const noContent = () => new Response(null, { status: 204, headers: SEC_HEADERS });
const fail = (status, error, message) => json({ error, message }, status);

class HttpError extends Error { constructor(status, code, msg) { super(msg); this.status = status; this.code = code; } }
async function readJson(request, limitBytes) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > limitBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', '요청 크기가 너무 큽니다.');
  const text = await request.text();
  if (text.length > limitBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', '요청 크기가 너무 큽니다.');
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'BAD_JSON', '잘못된 요청 형식입니다.'); }
}

export async function handle(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;
  const store = createStore(env);
  const later = (p) => ctx.waitUntil(p); // 응답 지연 없이 통계 기록
  const ipHash = await hashIp(request.headers.get('CF-Connecting-IP') || 'local');
  const limited = async (name, windowSec, max) => (await store.hit(name, ipHash, windowSec)) > max;
  const RATE = () => fail(429, 'RATE_LIMITED', '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.');

  async function buildInput(body) {
    const cfg = await store.getConfig();
    const treatment = cfg.treatments.find((t) => t.id === body?.treatmentId && t.enabled);
    if (!treatment) return { error: '진료 유형을 선택해 주세요.' };
    const ids = Array.isArray(body.itemIds) ? body.itemIds.slice(0, 40) : [];
    // 서버에 등록된 항목 ID만 허용 → 선택하지 않은 경험을 주입/생성할 수 없음
    const selected = [];
    for (const c of cfg.categories) for (const i of c.items) {
      if (ids.includes(i.id)) selected.push({ id: i.id, label: i.label, categoryId: c.id, categoryName: c.name, lead: c.lead });
    }
    const comment = maskPersonalInfo(String(body.comment || '').slice(0, 300)).trim();
    return { input: { hospitalName: cfg.hospital.name, treatment, selected, comment }, cfg };
  }
  async function requireAdmin() {
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!(await verifyToken(env, token))) throw new HttpError(401, 'UNAUTHORIZED', '관리자 인증이 필요합니다.');
  }

  try {
    // ---------- 환자용 ----------
    if (path === '/api/health' && method === 'GET') {
      return json({ ok: true, mode: aiEnabled(env) ? 'ai' : 'demo', storage: store.backend, admin: adminConfigured(env), runtime: 'cloudflare-pages' });
    }
    if (path === '/api/config' && method === 'GET') {
      const c = await store.getConfig();
      return json({ hospital: c.hospital, naverPlaceUrl: c.naverPlaceUrl, texts: c.texts, treatments: c.treatments.filter((t) => t.enabled), categories: c.categories, mode: aiEnabled(env) ? 'ai' : 'demo' });
    }
    if (path === '/api/events' && method === 'POST') {
      const body = await readJson(request, 1024);
      if (await limited('ev', 60, 60)) return RATE();
      if (EVENT_TYPES.includes(body.type) && !['error', 'ai_call'].includes(body.type)) later(store.countEvent(body.type));
      return noContent();
    }
    if (path === '/api/client-error' && method === 'POST') {
      const body = await readJson(request, 1024);
      if (await limited('ce', 60, 20)) return RATE();
      const code = String(body.code || 'CLIENT_ERROR').replace(/[^\w-]/g, '').slice(0, 40);
      const where = String(body.where || 'client').replace(/[^\w/-]/g, '').slice(0, 40);
      later(store.logError(code, `client:${where}`));
      return noContent();
    }
    if (path === '/api/generate' && method === 'POST') {
      const body = await readJson(request, 8 * 1024);
      if (await limited('gen', 600, 40)) return RATE();
      const { input, cfg, error } = await buildInput(body);
      if (error) return fail(400, 'BAD_INPUT', error);
      const only = STYLES.includes(body.only) ? body.only : null;
      const previous = typeof body.previous === 'string' ? body.previous : '';
      const useAI = aiEnabled(env) && body.demo !== true;
      later(store.countEvent(only ? 'regenerate' : useAI ? 'generate_ai' : 'generate_demo'));
      if (!useAI) return json({ mode: 'demo', reviews: generateDemo(input, only) });

      // AI 사용료 보호: 하루 AI 호출 상한 (DAILY_AI_LIMIT, 기본 300회)
      const cap = Number(env.DAILY_AI_LIMIT || 300);
      if ((await store.todayCount('ai_call')) >= cap) {
        later(store.logError('AI_DAILY_LIMIT', '/api/generate', `limit=${cap}`));
        return fail(503, 'AI_DAILY_LIMIT', '오늘 AI 생성 가능 횟수를 모두 사용했어요.');
      }
      later(store.countEvent('ai_call'));
      try {
        const { reviews } = await generateWithAI(env, input, cfg.ai, only, previous);
        return json({ mode: 'ai', reviews });
      } catch (e) {
        const code = e instanceof AiError ? e.code : 'AI_UNKNOWN';
        later(store.logError(code, '/api/generate', e.status ? `status=${e.status}` : '')); // 입력값·리뷰 원문 미기록
        return fail(502, code, 'AI 리뷰 생성에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    }

    // ---------- 관리자 ----------
    if (path === '/api/admin/login' && method === 'POST') {
      const body = await readJson(request, 1024);
      if (await limited('login', 900, 10)) return RATE();
      if (!adminConfigured(env)) return fail(503, 'ADMIN_DISABLED', '서버에 ADMIN_PASSWORD 환경변수가 설정되지 않아 관리자 기능이 비활성화되어 있습니다.');
      if (!(await checkPassword(env, String(body.password || '')))) {
        later(store.logError('ADMIN_LOGIN_FAILED', '/api/admin/login'));
        return fail(401, 'WRONG_PASSWORD', '비밀번호가 올바르지 않습니다.');
      }
      return json({ token: await issueToken(env) });
    }
    if (path.startsWith('/api/admin/')) {
      await requireAdmin();
      if (path === '/api/admin/config' && method === 'GET') {
        return json({ config: await store.getConfig(), defaults: getDefaults(env), aiEnabled: aiEnabled(env), envModel: env.OPENAI_MODEL || 'gpt-4.1-mini', storage: store.backend });
      }
      if (path === '/api/admin/config' && method === 'PUT') {
        const body = await readJson(request, 2 * 1024 * 1024);
        try {
          const clean = sanitizeConfig(body, getDefaults(env));
          await store.saveConfig(clean);
          return json({ config: clean });
        } catch (e) {
          if (e instanceof ValidationError) return fail(400, 'INVALID', e.message);
          if (e instanceof StorageUnavailable) return fail(503, 'STORAGE_REQUIRED', '설정을 저장할 저장소가 연결되지 않았습니다. Cloudflare Pages 프로젝트에 D1 데이터베이스(변수 이름 DB)를 연결해 주세요. (README 참고)');
          throw e;
        }
      }
      if (path === '/api/admin/preview' && method === 'POST') {
        const { input, cfg, error } = await buildInput(await readJson(request, 8 * 1024));
        if (error) return fail(400, 'BAD_INPUT', error);
        try {
          if (!aiEnabled(env)) return json({ mode: 'demo', reviews: generateDemo(input) });
          later(store.countEvent('ai_call'));
          return json({ mode: 'ai', ...(await generateWithAI(env, input, cfg.ai)) });
        } catch (e) {
          return fail(502, e.code || 'AI_UNKNOWN', `AI 호출 실패 (${e.code || 'unknown'}${e.status ? `, HTTP ${e.status}` : ''})`);
        }
      }
      if (path === '/api/admin/stats' && method === 'GET') return json(await store.getStats());
      if (path === '/api/admin/errors' && method === 'GET') return json(await store.getErrors());
      if (path === '/api/admin/errors' && method === 'DELETE') { await store.clearErrors(); return noContent(); }
    }
    return fail(404, 'NOT_FOUND', '존재하지 않는 API입니다.');
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.code, e.message);
    later(store.logError('SERVER_ERROR', path));
    return fail(500, 'SERVER_ERROR', '요청을 처리하지 못했습니다.');
  }
}
