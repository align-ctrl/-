import type { PublicConfig, ReviewStyle } from '../types';
import defaults from '../../shared/default-config.json';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit & { json?: unknown; signal?: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...(init?.json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers || {}) },
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('NETWORK', '인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
  }
  if (res.status === 204) return undefined as T;
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new ApiError(data?.error || `HTTP_${res.status}`, data?.message || '요청을 처리하지 못했어요.', res.status);
  return data as T;
}

export async function fetchConfig(): Promise<PublicConfig> {
  try {
    return await request<PublicConfig>('/api/config');
  } catch {
    // 서버에 연결할 수 없을 때 기본 설정으로 화면은 표시 (생성 단계에서 오류 안내)
    const d = defaults as unknown as PublicConfig;
    return { ...d, treatments: d.treatments.filter((t) => t.enabled), mode: 'demo' };
  }
}

export interface GenerateResult {
  mode: 'ai' | 'demo';
  reviews: Partial<Record<ReviewStyle, string>>;
}
export function generateReviews(
  body: { treatmentId: string; itemIds: string[]; comment: string; only?: ReviewStyle; previous?: string; demo?: boolean },
  signal?: AbortSignal
) {
  return request<GenerateResult>('/api/generate', { method: 'POST', json: body, signal });
}

export type EventType = 'visit' | 'start' | 'regenerate' | 'select' | 'copy' | 'naver';
export function track(type: EventType) {
  try {
    const body = JSON.stringify({ type });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
    else fetch('/api/events', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
  } catch { /* 통계 실패는 무시 */ }
}
// 오류 코드만 전송 (리뷰 원문·입력값 미전송)
export function reportError(code: string, where: string) {
  try {
    fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, where }), keepalive: true }).catch(() => {});
  } catch { /* ignore */ }
}
