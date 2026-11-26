import { emptyDraft, type Draft } from '../types';
// 작성 중 상태는 sessionStorage(현재 탭)에만 임시 보관 → 탭을 닫으면 삭제. 서버로 전송/저장하지 않음.
const KEY = 'align-review:draft:v1';
export function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = { ...emptyDraft(), ...JSON.parse(raw) } as Draft;
    return d.step > 0 ? d : null;
  } catch { return null; }
}
export function saveDraft(d: Draft) {
  try {
    if (d.step === 0 && !d.treatmentId) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch { /* private mode 등 */ }
}
export function clearDraft() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
export function onceThisSession(flag: string): boolean {
  try {
    if (sessionStorage.getItem(flag)) return false;
    sessionStorage.setItem(flag, '1');
    return true;
  } catch { return true; }
}
