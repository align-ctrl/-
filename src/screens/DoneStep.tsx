import { Check, ClipboardCheck, Copy, ExternalLink, RotateCcw } from 'lucide-react';
import { useRef, useState } from 'react';
import type { PublicConfig } from '../types';
import { Button, Modal, Notice } from '../components/ui';
import { copyText } from '../lib/clipboard';

export function DoneStep({
  config, text, onChange, onRestart, toast, onCopied, onNaver
}: {
  config: PublicConfig; text: string; onChange: (t: string) => void; onRestart: () => void;
  toast: (m: string) => void; onCopied: () => void; onNaver: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const [restartAsk, setRestartAsk] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const naverUrl = config.naverPlaceUrl;

  const doCopy = async () => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      toast('리뷰가 복사되었어요');
      onCopied();
    } else {
      // 자동 복사가 불가능한 환경: 텍스트를 선택해 직접 복사하도록 안내
      setManual(true);
      setTimeout(() => { areaRef.current?.focus(); areaRef.current?.select(); }, 50);
    }
    return ok;
  };

  const goNaver = () => {
    if (!naverUrl) return;
    // iOS Safari는 await 이후의 window.open을 팝업으로 차단하므로, 복사 시작과 창 열기를 같은 탭 동작 안에서 동기적으로 처리
    const copying = copied ? null : doCopy(); // writeText()는 이 시점에 동기 호출됨
    onNaver();
    const w = window.open(naverUrl, '_blank');
    if (w) {
      try { w.opener = null; } catch { /* ignore */ }
    } else {
      // 팝업 차단 시 현재 창에서 이동 (작성 내용은 탭 임시 저장소에 유지 → 돌아오면 이어서 작성 가능)
      Promise.resolve(copying).finally(() => { window.location.href = naverUrl; });
    }
  };

  return (
    <>
      <section className="px-5 pt-6">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-navy text-white shadow-lift">
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 text-[24px] font-bold tracking-tight text-navy">{config.texts.doneTitle}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{config.texts.doneSubtitle}</p>
        </div>

        <div className="mt-6 rounded-2xl bg-mist p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-navy">최종 리뷰</span>
            <span className="text-[12px] text-ink-400">{text.length}자 · 터치해서 수정</span>
          </div>
          <textarea
            ref={areaRef}
            value={text}
            onChange={(e) => onChange(e.target.value.slice(0, 1000))}
            rows={6}
            aria-label="최종 리뷰"
            className="w-full resize-y rounded-xl border border-soft-100 bg-white px-3.5 py-3 text-[16px] leading-[1.75] text-ink focus:border-navy focus:outline-none"
          />
        </div>

        {manual && (
          <div className="mt-3">
            <Notice tone="warn">자동 복사가 지원되지 않는 환경이에요. 위 글을 길게 눌러 <b>전체 선택 → 복사</b>해 주세요.</Notice>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Button onClick={doCopy} disabled={!text.trim()} icon={copied ? <ClipboardCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}>
            {copied ? '복사 완료 · 다시 복사' : '최종 리뷰 복사하기'}
          </Button>
          {naverUrl ? (
            <Button variant="secondary" onClick={goNaver} disabled={!text.trim()} icon={<ExternalLink className="h-5 w-5" />}>
              네이버 플레이스에서 리뷰 쓰기
            </Button>
          ) : (
            <p className="rounded-xl bg-mist px-4 py-3 text-center text-[13px] text-ink-500">네이버 플레이스 주소가 아직 등록되지 않았어요. 네이버 앱에서 병원을 검색해 리뷰를 남겨 주세요.</p>
          )}
        </div>

        <ol className="mt-6 space-y-3">
          {[
            ['리뷰 복사하기', '아래 버튼으로 최종 리뷰를 복사해요.'],
            ['네이버에서 방문 인증', '네이버에 직접 로그인하고 방문(영수증·예약) 인증을 진행해요.'],
            ['붙여넣고 직접 등록', '별점과 내용을 직접 확인·선택한 뒤 등록해 주세요.']
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-soft-200 text-[13px] font-semibold text-navy">{i + 1}</span>
              <div>
                <p className="text-[15px] font-semibold text-ink">{t}</p>
                <p className="text-[14px] leading-relaxed text-ink-500">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-center text-[12px] leading-relaxed text-ink-400">
          작성 내용은 서버에 저장되지 않으며, 이 창을 닫으면 기기에서도 삭제돼요.
        </p>
        <div className="mt-4">
          <Button variant="ghost" onClick={() => setRestartAsk(true)} icon={<RotateCcw className="h-4 w-4" />}>처음부터 다시 작성하기</Button>
        </div>
        <img src="/brand/aplus-slogan.png" alt="A Plus Care System - 환자를 최우선 하는 수준 높은 진료 원칙" className="mx-auto mt-4 w-[220px] opacity-70" />
      </section>
      <div className="safe-bottom" />


      <Modal
        open={restartAsk}
        title="처음부터 다시 작성할까요?"
        actions={
          <>
            <Button onClick={() => { setRestartAsk(false); onRestart(); }}>새로 작성하기</Button>
            <Button variant="ghost" onClick={() => setRestartAsk(false)}>취소</Button>
          </>
        }
      >
        지금까지 선택하고 작성한 내용이 모두 지워져요.
      </Modal>
    </>
  );
}
