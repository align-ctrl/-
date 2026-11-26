import { ChevronLeft, LoaderCircle } from 'lucide-react';
import { type ButtonHTMLAttributes, type ReactNode, useEffect } from 'react';

export const STEP_LABELS = ['진료 유형', '좋았던 점', '추가 의견', '리뷰 생성', '확인·수정', '완료'];

export function StepHeader({ step, onBack, markUrl, hospitalName }: { step: number; onBack?: () => void; markUrl: string; hospitalName: string }) {
  const total = STEP_LABELS.length;
  return (
    <header className="safe-top sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-14 items-center px-2">
        {onBack ? (
          <button onClick={onBack} className="press flex h-11 w-11 items-center justify-center rounded-full text-navy hover:bg-mist" aria-label="이전 단계">
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <span className="w-11" />
        )}
        <div className="flex flex-1 items-center justify-center gap-2">
          <img src={markUrl} alt="" className="h-5 w-auto" />
          <span className="text-[15px] font-semibold tracking-tight text-navy">{hospitalName}</span>
        </div>
        <span className="w-11" />
      </div>
      <div className="px-5 pb-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-accent">
            STEP {step} <span className="font-normal text-ink-400">/ {total}</span>
          </span>
          <span className="text-[13px] font-medium text-ink-500">{STEP_LABELS[step - 1]}</span>
        </div>
        <div className="flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label={`진행 단계 ${step}/${total}`}>
          {STEP_LABELS.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-soft-100">
              <div className={`h-full rounded-full bg-navy transition-all duration-500 ${i < step ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; loading?: boolean; icon?: ReactNode };
export function Button({ variant = 'primary', loading, icon, className = '', children, disabled, ...rest }: BtnProps) {
  const base = 'press inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-semibold disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-navy text-white shadow-lift hover:bg-navy-600 disabled:bg-soft-200 disabled:text-white disabled:shadow-none',
    secondary: 'border border-soft-200 bg-white text-navy hover:border-soft disabled:text-ink-400',
    ghost: 'min-h-[48px] text-ink-500 hover:text-navy'
  }[variant];
  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function BottomBar({ children, sticky = true }: { children: ReactNode; sticky?: boolean }) {
  if (!sticky) return <div className="safe-bottom mt-auto space-y-2 px-5 pt-6">{children}</div>;
  return (
    <div className="safe-bottom sticky bottom-0 z-10 mt-auto bg-white px-5 pt-3">
      {/* 위쪽으로 부드럽게 사라지는 페이드 (내용과 겹치지 않도록 바 자체는 불투명) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-white to-white/0" />
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-6" role="status" aria-live="polite">
      <div className="animate-fadeUp rounded-full bg-navy-900/95 px-5 py-3 text-[15px] font-medium text-white shadow-lift">{message}</div>
    </div>
  );
}

export function Modal({ open, title, children, actions }: { open: boolean; title: string; children: ReactNode; actions: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/40 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="safe-bottom w-full max-w-md animate-fadeUp rounded-t-3xl bg-white px-6 pt-7 sm:rounded-3xl sm:pb-6">
        <h2 className="text-[19px] font-bold text-navy">{title}</h2>
        <div className="mt-2 text-[15px] leading-relaxed text-ink-600">{children}</div>
        <div className="mt-6 space-y-2">{actions}</div>
      </div>
    </div>
  );
}

export function Notice({ tone = 'info', icon, children }: { tone?: 'info' | 'warn' | 'demo'; icon?: ReactNode; children: ReactNode }) {
  const s = {
    info: 'bg-accent-50 text-navy',
    warn: 'bg-[#FDF3F2] text-[#9B2C2C]',
    demo: 'bg-[#FFF8E8] text-[#7A5A12]'
  }[tone];
  return (
    <div className={`flex gap-2.5 rounded-xl px-4 py-3 text-[14px] leading-relaxed ${s}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}
