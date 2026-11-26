import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3, Bot, Building2, FileText, ListChecks, Lock, LogOut, QrCode, Save, Stethoscope, TriangleAlert
} from 'lucide-react';
import type { FullConfig } from '../types';
import { ApiError } from '../lib/api';
import { adminFetch, getToken, setToken, type AdminConfigResponse } from './adminApi';
import { BasicSection, TextsSection, TreatmentsSection, CategoriesSection, AiSection } from './sections';
import { QrSection, StatsSection, ErrorsSection } from './panels';

const TABS = [
  { id: 'basic', name: '기본 설정', icon: Building2 },
  { id: 'texts', name: '안내 문구', icon: FileText },
  { id: 'treatments', name: '진료 유형', icon: Stethoscope },
  { id: 'items', name: '만족 항목', icon: ListChecks },
  { id: 'ai', name: 'AI 프롬프트', icon: Bot },
  { id: 'qr', name: 'QR 코드', icon: QrCode },
  { id: 'stats', name: '이용 통계', icon: BarChart3 },
  { id: 'errors', name: '오류 확인', icon: TriangleAlert }
] as const;
type Tab = (typeof TABS)[number]['id'];
const CONFIG_TABS: Tab[] = ['basic', 'texts', 'treatments', 'items', 'ai'];

export default function AdminApp() {
  const [authed, setAuthed] = useState(!!getToken());
  useEffect(() => { document.title = 'ALIGN REVIEW 관리자'; }, []);
  return authed ? <Console onLogout={() => { setToken(null); setAuthed(false); }} /> : <Login onOk={() => setAuthed(true)} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await adminFetch<{ token: string }>('/api/admin/login', { method: 'POST', json: { password: pw } });
      setToken(r.token);
      onOk();
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-mist px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-card">
        <img src="/brand/logo-horizontal.png" alt="에이라인치과병원" className="mx-auto w-48" />
        <h1 className="mt-6 flex items-center justify-center gap-2 text-[18px] font-bold text-navy"><Lock className="h-4 w-4" /> 관리자 로그인</h1>
        <input
          type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)}
          placeholder="관리자 비밀번호" className="mt-5 w-full rounded-xl border border-soft-200 px-4 py-3 focus:border-navy focus:outline-none" autoFocus
        />
        {err && <p className="mt-2 text-[14px] text-[#9B2C2C]">{err}</p>}
        <button disabled={busy || !pw} className="press mt-4 min-h-[52px] w-full rounded-xl bg-navy font-semibold text-white disabled:bg-soft-200">로그인</button>
      </form>
    </div>
  );
}

function Console({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('basic');
  const [data, setData] = useState<AdminConfigResponse | null>(null);
  const [cfg, setCfg] = useState<FullConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleErr = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) return onLogout();
    setMsg({ ok: false, text: (e as Error).message });
  }, [onLogout]);

  useEffect(() => {
    adminFetch<AdminConfigResponse>('/api/admin/config').then((r) => { setData(r); setCfg(r.config); }).catch(handleErr);
  }, [handleErr]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const change = (next: FullConfig) => { setCfg(next); setDirty(true); setMsg(null); };
  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const r = await adminFetch<{ config: FullConfig }>('/api/admin/config', { method: 'PUT', json: cfg });
      setCfg(r.config); setDirty(false);
      setMsg({ ok: true, text: '저장되었습니다. 환자용 화면에 바로 반영됩니다.' });
    } catch (e) { handleErr(e); } finally { setSaving(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-mist">
      <header className="sticky top-0 z-20 border-b border-soft-100 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/brand/logo-mark-navy.png" alt="" className="h-6" />
            <span className="font-bold text-navy">ALIGN REVIEW</span>
            <span className="rounded-md bg-mist px-2 py-0.5 text-[12px] font-semibold text-ink-500">관리자</span>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1 text-[14px] text-ink-500 hover:text-navy"><LogOut className="h-4 w-4" /> 로그아웃</button>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-3 pb-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-medium ${tab === t.id ? 'bg-navy text-white' : 'text-ink-600 hover:bg-mist'}`}>
              <t.icon className="h-4 w-4" /> {t.name}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-32 pt-5">
        {data?.storage === 'memory' && (
          <p className="mb-4 rounded-xl bg-[#FFF8E8] px-4 py-3 text-[14px] leading-relaxed text-[#7A5A12]">
            ⚠️ 저장소가 연결되지 않았습니다. 지금은 기본 설정(및 NAVER_PLACE_URL 환경변수)으로 동작하며, 설정 저장·통계·오류 기록이 유지되지 않습니다.
            Cloudflare 대시보드에서 무료 <b>D1 데이터베이스</b>를 만들고 Pages 프로젝트 → 설정 → 바인딩에 변수 이름 <b>DB</b>로 연결한 뒤 다시 배포해 주세요.
          </p>
        )}
        {msg && <p className={`mb-4 rounded-xl px-4 py-3 text-[14px] ${msg.ok ? 'bg-accent-50 text-navy' : 'bg-[#FDF3F2] text-[#9B2C2C]'}`}>{msg.text}</p>}
        {!cfg || !data ? (
          <p className="text-ink-500">불러오는 중…</p>
        ) : (
          <>
            {tab === 'basic' && <BasicSection cfg={cfg} onChange={change} />}
            {tab === 'texts' && <TextsSection cfg={cfg} defaults={data.defaults} onChange={change} />}
            {tab === 'treatments' && <TreatmentsSection cfg={cfg} onChange={change} />}
            {tab === 'items' && <CategoriesSection cfg={cfg} onChange={change} />}
            {tab === 'ai' && <AiSection cfg={cfg} defaults={data.defaults} aiEnabled={data.aiEnabled} envModel={data.envModel} onChange={change} dirty={dirty} onError={handleErr} />}
            {tab === 'qr' && <QrSection />}
            {tab === 'stats' && <StatsSection onError={handleErr} />}
            {tab === 'errors' && <ErrorsSection onError={handleErr} />}
          </>
        )}
      </main>

      {CONFIG_TABS.includes(tab) && cfg && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-soft-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <span className="text-[14px] text-ink-500">{dirty ? '저장되지 않은 변경사항이 있습니다.' : '모든 변경사항이 저장되었습니다.'}</span>
            <button onClick={save} disabled={!dirty || saving} className="press flex min-h-[46px] items-center gap-2 rounded-xl bg-navy px-5 font-semibold text-white disabled:bg-soft-200">
              <Save className="h-4 w-4" /> {saving ? '저장 중…' : '저장하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

