// 관리자 인증 (WebCrypto — Cloudflare Workers 런타임 호환)
// ADMIN_PASSWORD(암호화 환경변수) + HMAC-SHA256 서명 토큰(8시간)
const enc = new TextEncoder();
const TTL = 8 * 3600 * 1000;

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));
const sha256 = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(s))));
function equal(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt ? a.charCodeAt(i) ^ b.charCodeAt(i) : a[i] ^ b[i];
  return r === 0;
}

export const adminConfigured = (env) => Boolean(env.ADMIN_PASSWORD);

export async function checkPassword(env, pw) {
  if (!adminConfigured(env)) return false;
  return equal(await sha256(pw), await sha256(env.ADMIN_PASSWORD)); // 고정 길이 비교
}
async function hmacKey(env) {
  const secret = env.ADMIN_TOKEN_SECRET || b64url(await sha256('align-review-token:' + env.ADMIN_PASSWORD));
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
const sign = async (env, payload) => b64url(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload)));

export async function issueToken(env) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + TTL })));
  return `${payload}.${await sign(env, payload)}`;
}
export async function verifyToken(env, token) {
  if (!adminConfigured(env) || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (!equal(sig, await sign(env, payload))) return false;
  try { return JSON.parse(fromB64url(payload)).exp > Date.now(); } catch { return false; }
}
export async function hashIp(ip) {
  return b64url(await sha256('ip:' + ip)).slice(0, 16); // 원본 IP는 저장하지 않음
}
