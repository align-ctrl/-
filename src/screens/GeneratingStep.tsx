import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BottomBar, Button } from '../components/ui';

const MESSAGES = ['선택하신 경험을 정리하고 있어요', '세 가지 문체로 초안을 쓰고 있어요', '문장을 자연스럽게 다듬고 있어요'];

export function GeneratingStep({
  mode, error, onRetry, onBack, onDemo
}: { mode: 'ai' | 'demo'; error: string | null; onRetry: () => void; onBack: () => void; onDemo?: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (error) return;
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 1600);
    return () => clearInterval(t);
  }, [error]);

  if (error) {
    return (
      <>
        <section className="flex flex-1 flex-col items-center px-6 pt-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FDF3F2] text-[#9B2C2C]"><AlertTriangle className="h-8 w-8" /></span>
          <h1 className="mt-5 text-[21px] font-bold text-navy">리뷰 초안을 만들지 못했어요</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{error}</p>
          <p className="mt-1 text-[14px] text-ink-400">선택하신 내용은 그대로 유지돼요.</p>
        </section>
        <BottomBar>
          <Button onClick={onRetry} icon={<RefreshCw className="h-5 w-5" />}>다시 시도하기</Button>
          {onDemo && <Button variant="secondary" onClick={onDemo}>예시 문장 조합으로 만들기</Button>}
          <Button variant="ghost" onClick={onBack}>이전 단계로</Button>
        </BottomBar>
      </>
    );
  }

  return (
    <section className="flex flex-1 flex-col items-center px-6 pt-16 text-center" aria-busy="true">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-4 border-soft-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-navy" />
        <img src="/brand/logo-mark-navy.png" alt="" className="absolute inset-0 m-auto h-8 w-auto" />
      </div>
      <h1 className="mt-6 text-[21px] font-bold text-navy">{mode === 'ai' ? 'AI가 리뷰 초안을 작성 중이에요' : '리뷰 초안을 만들고 있어요'}</h1>
      <p key={i} className="mt-2 animate-fadeUp text-[15px] text-ink-500">{MESSAGES[i]}</p>
      <div className="mt-10 w-full space-y-3">
        {[0, 1, 2].map((k) => (
          <div key={k} className="rounded-2xl border border-soft-100 p-4">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton mt-3 h-3.5 w-full" />
            <div className="skeleton mt-2 h-3.5 w-4/5" />
          </div>
        ))}
      </div>
    </section>
  );
}
