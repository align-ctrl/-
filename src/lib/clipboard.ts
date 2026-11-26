// 1순위: Clipboard API (HTTPS + 사용자 동작 필요)
// 2순위: textarea + execCommand('copy') (구형 iOS Safari / 인앱 브라우저 대응)
export async function copyText(text: string): Promise<boolean> {
  // 주의: 이 함수는 탭(사용자 동작) 핸들러에서 await 없이 바로 호출해야 iOS에서 권한이 유지됩니다.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* NotAllowedError, 인앱 브라우저 제한 등 → 대체 복사 */
    }
  }
  return legacyCopy(text);
}
function legacyCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
  document.body.appendChild(ta);
  const range = document.createRange();
  range.selectNodeContents(ta);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  sel?.removeAllRanges();
  document.body.removeChild(ta);
  return ok;
}
