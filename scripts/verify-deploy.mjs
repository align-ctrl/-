#!/usr/bin/env node
// 배포 검증: node scripts/verify-deploy.mjs https://<프로젝트>.pages.dev
// 필요: npm i -D playwright && npx playwright install chromium
// HTTPS·리다이렉트·보안헤더·Manifest·아이콘·서비스워커·설치 가능 조건(Chrome DevTools 판정)·오프라인 실행·
// 모바일(Android/iPhone 에뮬레이션) 리뷰 생성→수정→다시 생성→선택→복사(클립보드 실제 읽기)→대체 복사→네이버 이동 확인
const BASE = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(BASE)) { console.error('사용법: node scripts/verify-deploy.mjs https://<배포주소>'); process.exit(2); }
let pw;
try { pw = await import('playwright'); } catch { try { pw = (await import('node:module')).createRequire(import.meta.url)('playwright'); } catch { /* not installed */ } }
if (!pw) { console.error('playwright 가 필요합니다: npm i -D playwright && npx playwright install chromium'); process.exit(2); }
const { chromium, devices } = pw;

const results = [];
const rec = (status, name, detail = '') => { results.push({ status, name, detail }); console.log(`${status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌'} ${name}${detail ? ' — ' + detail : ''}`); };
const check = async (name, fn) => { try { const d = await fn(); rec(d && d.warn ? 'WARN' : 'PASS', name, d && (d.warn || d.detail) ? d.warn || d.detail : ''); } catch (e) { rec('FAIL', name, e.message.split('\n')[0]); } };
const assert = (c, m) => { if (!c) throw new Error(m); };
const isHttps = BASE.startsWith('https://');
const isLocal = /localhost|127\.0\.0\.1/.test(BASE);

console.log(`\n▶ 검증 대상: ${BASE}\n\n[1] 서버·HTTPS`);
await check('HTTPS 사용', () => { assert(isHttps || isLocal, 'https:// 주소가 아닙니다'); return isHttps ? { detail: '인증서 검증 통과(Node fetch)' } : { warn: 'localhost 테스트 (보안 컨텍스트로 간주됨)' }; });
if (isHttps) await check('HTTP → HTTPS 리다이렉트', async () => {
  const r = await fetch(BASE.replace('https://', 'http://'), { redirect: 'manual' });
  assert([301, 302, 307, 308].includes(r.status) && (r.headers.get('location') || '').startsWith('https://'), `status ${r.status}`);
  return { detail: `${r.status} → ${r.headers.get('location')}` };
});
const home = await fetch(BASE + '/');
const html = await home.text();
await check('메인 페이지 200', () => assert(home.ok, `status ${home.status}`));
await check('HSTS 헤더', () => (home.headers.get('strict-transport-security') ? { detail: home.headers.get('strict-transport-security') } : { warn: '없음' }));
await check('CSP·nosniff 보안 헤더', () => assert(home.headers.get('content-security-policy') && home.headers.get('x-content-type-options') === 'nosniff', '누락'));
await check('SPA 딥링크(/admin) 200', async () => { const r = await fetch(BASE + '/admin'); assert(r.ok && (await r.text()).includes('id="root"'), `status ${r.status}`); });
let health;
await check('API /api/health', async () => { const r = await fetch(BASE + '/api/health'); health = await r.json(); assert(r.ok && health.ok, `status ${r.status}`); return { detail: `AI=${health.mode}, storage=${health.storage}, admin=${health.admin ? 'on' : 'off'}` }; });
if (health) {
  if (health.mode === 'demo') rec('WARN', 'AI 모드', 'OPENAI_API_KEY 미설정 → 데모 모드 (선택 사항)');
  if (health.storage === 'memory') rec('WARN', '저장소', 'D1 미연결 → 관리자 설정 저장·통계 불가 (README 4단계)');
  if (!health.admin) rec('WARN', '관리자', 'ADMIN_PASSWORD 미설정');
}
let cfg;
await check('API /api/config', async () => { cfg = await (await fetch(BASE + '/api/config')).json(); assert(cfg.treatments?.length, '진료 유형 없음'); assert(!JSON.stringify(cfg).includes('systemPrompt'), '공개 설정에 프롬프트 노출'); });
await check('네이버 플레이스 URL 설정', () => (cfg?.naverPlaceUrl ? { detail: cfg.naverPlaceUrl } : { warn: '미설정 (관리자 또는 NAVER_PLACE_URL)' }));

console.log('\n[2] PWA Manifest · 아이콘 · Service Worker 파일');
let manifest;
await check('<link rel=manifest> / apple-touch-icon / viewport-fit', () => {
  assert(/rel="manifest"/.test(html), 'manifest 링크 없음');
  assert(/rel="apple-touch-icon"/.test(html), 'apple-touch-icon 없음');
  assert(/apple-mobile-web-app-capable/.test(html), 'iOS 웹앱 메타 없음');
  assert(/viewport-fit=cover/.test(html), 'viewport-fit 없음');
});
await check('manifest 필드', async () => {
  const r = await fetch(BASE + '/manifest.webmanifest');
  assert(/manifest\+json|json/.test(r.headers.get('content-type') || ''), 'content-type ' + r.headers.get('content-type'));
  manifest = await r.json();
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) assert(manifest[k], `${k} 없음`);
  assert(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display), 'display');
  const sizes = manifest.icons.map((i) => i.sizes);
  assert(sizes.includes('192x192') && sizes.includes('512x512'), '192/512 아이콘 필요');
  assert(manifest.icons.some((i) => (i.purpose || '').includes('maskable')), 'maskable 아이콘 없음');
});
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
await check('아이콘 파일 (실제 크기 확인)', async () => {
  const list = [...(manifest?.icons || []).map((i) => [i.src, i.sizes]), ['/icons/apple-touch-icon.png', '180x180']];
  for (const [src, sizes] of list) {
    const r = await fetch(new URL(src, BASE));
    assert(r.ok && r.headers.get('content-type')?.includes('image/png'), `${src} ${r.status}`);
    const [w, h] = pngSize(Buffer.from(await r.arrayBuffer()));
    assert(`${w}x${h}` === sizes, `${src} 실제 ${w}x${h} ≠ ${sizes}`);
  }
  return { detail: `${list.length}개` };
});
await check('sw.js (JS 타입, 캐시 무효화 헤더)', async () => {
  const r = await fetch(BASE + '/sw.js');
  assert(r.ok && /javascript/.test(r.headers.get('content-type') || ''), `status ${r.status} ${r.headers.get('content-type')}`);
  assert(!/__BUILD_ID__/.test(await r.text()), '빌드 ID 미치환');
  return { detail: r.headers.get('cache-control') };
});

console.log('\n[3] 브라우저 검증 (Chromium)');
const browser = await chromium.launch();
const NAVER_STUB = (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>naver stub</title>' });

// --- 설치 가능 조건 / 서비스워커 / 오프라인 (Android Chrome 에뮬레이션) ---
{
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await check('Service Worker 등록·활성화', async () => {
    const st = await page.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 10000))]); return { scope: r.scope, state: r.active?.state }; });
    assert(st.state === 'activated' || st.state === 'activating', `state=${st.state}`);
    return { detail: `scope=${st.scope}` };
  });
  await page.reload({ waitUntil: 'load' });
  await check('Service Worker 페이지 제어(controller)', async () => assert(await page.evaluate(() => !!navigator.serviceWorker.controller), 'controller 없음'));
  await check('PWA 설치 가능 조건 (Chrome DevTools 판정)', async () => {
    const cdp = await ctx.newCDPSession(page);
    const m = await cdp.send('Page.getAppManifest');
    assert(!m.errors?.length, 'manifest 오류: ' + JSON.stringify(m.errors));
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    assert(!installabilityErrors.length, installabilityErrors.map((e) => e.errorId).join(', '));
    return { detail: '설치 가능 (installabilityErrors 없음)' };
  });
  await check('오프라인 실행 (앱 셸 캐시)', async () => {
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.getByRole('button', { name: /리뷰 작성 시작하기/ }).waitFor({ timeout: 8000 });
    await ctx.setOffline(false);
  });
  await ctx.close();
}

// --- 사용자 흐름 ---
async function flow(label, device) {
  const ctx = await browser.newContext({ ...device, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.route(/naver\.(com|me)/, NAVER_STUB); // 실제 네이버 대신 이동 URL만 확인
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/?source=verify');
  const t0 = Date.now();
  await check(`[${label}] 진료 유형 → 만족 항목 → 추가 의견`, async () => {
    await page.getByRole('button', { name: /리뷰 작성 시작하기/ }).click();
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: '다음' }).click();
    const boxes = page.getByRole('checkbox');
    await boxes.nth(0).click(); await boxes.nth(1).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.locator('textarea').fill('주차가 조금 불편했어요');
  });
  await check(`[${label}] 리뷰 3종 생성`, async () => {
    await page.getByRole('button', { name: /리뷰 초안 만들기/ }).click();
    await page.locator('article').first().waitFor({ timeout: 45000 });
    const n = await page.locator('article').count();
    assert(n === 3, `카드 ${n}개`);
    return { detail: `${((Date.now() - t0) / 1000).toFixed(1)}s, ${cfg?.mode === 'ai' ? 'AI' : '데모'} 모드` };
  });
  const cards = page.locator('article');
  const EDITED = `[검증] 직접 수정한 리뷰입니다. ${label}`;
  await check(`[${label}] 직접 수정`, async () => {
    await cards.nth(0).getByRole('button', { name: '직접 수정' }).click();
    await cards.nth(0).locator('textarea').fill(EDITED);
    await cards.nth(0).getByRole('button', { name: '수정 완료' }).click();
    await cards.nth(0).getByText('직접 수정함').waitFor();
  });
  await check(`[${label}] 다시 생성`, async () => {
    const before = await cards.nth(2).locator('p').innerText();
    await cards.nth(2).getByRole('button', { name: '다시 생성' }).click();
    await page.waitForFunction(() => !document.querySelector('article .animate-spin'), null, { timeout: 45000 });
    const after = await cards.nth(2).locator('p').innerText();
    return before === after ? { warn: '같은 문장이 생성됨(데모 조합이 적을 때 가능)' } : { detail: '새 문장 생성' };
  });
  await check(`[${label}] 선택 → 완료 화면`, async () => {
    await cards.nth(0).getByRole('button', { name: /^선택$/ }).click();
    await page.getByRole('button', { name: '이 리뷰로 결정하기' }).click();
    await page.getByText('리뷰 초안이 완성됐어요!').waitFor();
  });
  await check(`[${label}] 복사: navigator.clipboard.writeText`, async () => {
    await page.getByRole('button', { name: '최종 리뷰 복사하기' }).click();
    await page.getByText('리뷰가 복사되었어요').waitFor();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert(clip === EDITED, `클립보드 내용 불일치: ${clip.slice(0, 40)}`);
    return { detail: '클립보드 실제 읽기 일치' };
  });
  await check(`[${label}] 복사: writeText 실패 시 대체 복사`, async () => {
    await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new DOMException('blocked', 'NotAllowedError')); });
    await page.getByRole('button', { name: /다시 복사/ }).click();
    await page.waitForTimeout(400);
    const toast = await page.getByText('리뷰가 복사되었어요').count();
    const manual = await page.getByText(/자동 복사가 지원되지 않는/).count();
    assert(toast || manual, '대체 복사/안내 없음');
    return { detail: toast ? 'execCommand 대체 복사 성공' : '수동 복사 안내 표시' };
  });
  if (cfg?.naverPlaceUrl) {
    await check(`[${label}] 네이버 플레이스 이동`, async () => {
      const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }), page.getByRole('button', { name: /네이버 플레이스에서 리뷰 쓰기/ }).click()]);
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      assert(popup.url().startsWith(cfg.naverPlaceUrl.split('?')[0].replace(/\/$/, '')), `이동 주소 ${popup.url()}`);
      assert(page.url().startsWith(BASE), '앱 화면이 함께 이동됨');
      return { detail: popup.url() };
    });
  } else rec('WARN', `[${label}] 네이버 플레이스 이동`, 'URL 미설정으로 생략');
  await check(`[${label}] 페이지 오류 없음`, () => assert(!errors.length, errors.join(' | ')));
  await page.screenshot({ path: `verify-${label}.png` });
  await ctx.close();
}
await flow('android-chrome', devices['Pixel 7']);
await flow('iphone-safari-ua', devices['iPhone 13']);
await browser.close();

const fail = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n결과: ✅ ${results.length - fail - warn}  ⚠️ ${warn}  ❌ ${fail}`);
console.log('참고: iPhone 항목은 Chromium에 iPhone 화면/UA를 적용한 에뮬레이션입니다. Safari 홈 화면 추가는 실제 기기에서 README의 체크리스트로 확인하세요.');
process.exit(fail ? 1 : 0);
