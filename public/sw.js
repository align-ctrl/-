/* ALIGN REVIEW Service Worker
 * - 앱 셸/정적 자원 캐시 → 빠른 실행, 홈 화면 앱 지원
 * - 리뷰 생성·관리자 API는 절대 캐시하지 않음 (개인 입력 미저장 원칙)
 */
const VERSION = 'align-review-__BUILD_ID__'; // 빌드마다 자동 교체 → 배포 시 이전 캐시 정리
const SHELL = ['/', '/manifest.webmanifest', '/brand/logo-horizontal.png', '/brand/logo-mark.png', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    // 공개 설정만 네트워크 우선 + 오프라인 대비 캐시
    if (url.pathname === '/api/config') e.respondWith(networkFirst(req));
    return;
  }
  if (req.mode === 'navigate') {
    if (url.pathname.startsWith('/admin')) return; // 관리자 화면은 항상 네트워크
    e.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(cacheFirst(req));
  }
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
  return res;
}
async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}
