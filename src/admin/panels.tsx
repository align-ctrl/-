import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import { Card, Field, inputCls } from './kit';
import { adminFetch, type ErrorEntry, type Stats } from './adminApi';

export function QrSection() {
  const [url, setUrl] = useState(`${location.origin}/?source=qr`);
  const [png, setPng] = useState('');
  useEffect(() => {
    QRCode.toDataURL(url, { width: 1024, margin: 2, color: { dark: '#243B58', light: '#FFFFFF' }, errorCorrectionLevel: 'M' })
      .then(setPng).catch(() => setPng(''));
  }, [url]);
  return (
    <Card title="QR 코드" desc="진료실·데스크에 비치할 QR 코드입니다. 스캔하면 환자 스마트폰에서 리뷰 작성 화면이 열립니다.">
      <Field label="연결 주소" hint="배포된 HTTPS 주소인지 확인하세요."><input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
      {png && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-mist p-6">
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <img src={png} alt="리뷰 작성 QR 코드" className="h-56 w-56" />
            <p className="mt-2 text-center text-[13px] font-semibold text-navy">리뷰 작성하기</p>
          </div>
          <a href={png} download="align-review-qr.png" className="flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-[14px] font-semibold text-white"><Download className="h-4 w-4" /> PNG 다운로드</a>
        </div>
      )}
    </Card>
  );
}

const LABELS: Record<string, string> = {
  visit: '접속', start: '작성 시작', generate_ai: 'AI 생성', generate_demo: '데모 생성', regenerate: '다시 생성', select: '리뷰 선택', copy: '복사', naver: '네이버 이동', error: '오류'
};
export function StatsSection({ onError }: { onError: (e: unknown) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const load = () => adminFetch<Stats>('/api/admin/stats').then(setStats).catch(onError);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!stats) return <p className="text-ink-500">불러오는 중…</p>;
  const days = Object.keys(stats.days).sort().reverse();
  const total: Record<string, number> = {};
  for (const d of days) for (const [k, v] of Object.entries(stats.days[d])) total[k] = (total[k] || 0) + v;
  const keys = Object.keys(LABELS);
  const gen = (total.generate_ai || 0) + (total.generate_demo || 0);
  return (
    <Card title="이용 통계" desc="개인정보·리뷰 내용 없이 날짜별 이용 횟수만 집계합니다. (KST 기준)"
      action={<button onClick={load} className="flex items-center gap-1 rounded-lg border border-soft-200 px-3 py-2 text-[13px]"><RefreshCw className="h-3.5 w-3.5" /> 새로고침</button>}>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['접속', total.visit || 0], ['리뷰 생성', gen], ['복사', total.copy || 0], ['네이버 이동', total.naver || 0]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-mist p-4">
            <p className="text-[13px] text-ink-500">{l}</p>
            <p className="mt-1 text-[24px] font-bold text-navy">{Number(v).toLocaleString()}</p>
          </div>
        ))}
      </div>
      {gen > 0 && <p className="mb-4 text-[13px] text-ink-500">생성 대비 네이버 이동 비율: <b className="text-navy">{Math.round(((total.naver || 0) / gen) * 100)}%</b></p>}
      {days.length === 0 ? <p className="text-[14px] text-ink-400">아직 집계된 데이터가 없습니다.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead><tr className="border-b border-soft-100 text-left text-ink-500"><th className="py-2 pr-2">날짜</th>{keys.map((k) => <th key={k} className="px-2 py-2 text-right">{LABELS[k]}</th>)}</tr></thead>
            <tbody>
              {days.slice(0, 60).map((d) => (
                <tr key={d} className="border-b border-soft-50">
                  <td className="py-2 pr-2 font-medium">{d}</td>
                  {keys.map((k) => <td key={k} className="px-2 py-2 text-right tabular-nums">{stats.days[d][k] || 0}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

const ERROR_HELP: Record<string, string> = {
  AI_AUTH: 'API 키가 잘못되었거나 만료되었습니다.',
  AI_RATE_LIMIT: 'OpenAI 사용량 한도 초과 또는 결제 확인 필요.',
  AI_TIMEOUT: 'AI 응답 시간 초과.',
  AI_NETWORK: '서버에서 OpenAI로 연결 실패.',
  AI_HTTP_ERROR: 'OpenAI 오류 응답 (모델명 확인).',
  AI_BAD_RESPONSE: 'AI 응답 형식 오류.',
  AI_EMPTY_RESULT: 'AI가 빈 결과를 반환.',
  ADMIN_LOGIN_FAILED: '관리자 로그인 실패.'
};
export function ErrorsSection({ onError }: { onError: (e: unknown) => void }) {
  const [list, setList] = useState<ErrorEntry[] | null>(null);
  const load = () => adminFetch<ErrorEntry[]>('/api/admin/errors').then(setList).catch(onError);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card title="오류 확인" desc="오류 코드·발생 위치·시각만 기록합니다. 리뷰 원문, 환자 입력, IP는 기록하지 않습니다. (최근 200건)"
      action={
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1 rounded-lg border border-soft-200 px-3 py-2 text-[13px]"><RefreshCw className="h-3.5 w-3.5" /></button>
          <button onClick={() => confirm('오류 로그를 모두 삭제할까요?') && adminFetch('/api/admin/errors', { method: 'DELETE' }).then(load).catch(onError)}
            className="flex items-center gap-1 rounded-lg border border-soft-200 px-3 py-2 text-[13px] text-[#9B2C2C]"><Trash2 className="h-3.5 w-3.5" /> 비우기</button>
        </div>
      }>
      {!list ? <p className="text-ink-500">불러오는 중…</p> : list.length === 0 ? <p className="text-[14px] text-ink-400">기록된 오류가 없습니다. 👍</p> : (
        <ul className="divide-y divide-soft-50">
          {list.map((e, i) => (
            <li key={i} className="py-2.5 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#FDF3F2] px-1.5 py-0.5 font-mono font-semibold text-[#9B2C2C]">{e.code}</span>
                <span className="text-ink-500">{e.where}</span>
                {e.detail && <span className="text-ink-400">{e.detail}</span>}
                <span className="ml-auto text-ink-400">{new Date(e.at).toLocaleString('ko-KR')}</span>
              </div>
              {ERROR_HELP[e.code] && <p className="mt-1 text-ink-500">{ERROR_HELP[e.code]}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
