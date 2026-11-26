import { ApiError } from '../lib/api';
import type { FullConfig } from '../types';

const TOKEN_KEY = 'align-review:admin-token';
export const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

export async function adminFetch<T>(url: string, init: { method?: string; json?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method || 'GET',
    headers: { Authorization: `Bearer ${getToken() || ''}`, ...(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined
  }).catch(() => { throw new ApiError('NETWORK', '서버에 연결할 수 없습니다.'); });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || 'HTTP', data?.message || `요청 실패 (${res.status})`, res.status);
  return data as T;
}

export interface AdminConfigResponse { config: FullConfig; defaults: FullConfig; aiEnabled: boolean; envModel: string; storage: 'd1' | 'memory' }
export type Stats = { days: Record<string, Record<string, number>> };
export type ErrorEntry = { at: string; code: string; where: string; detail: string };
