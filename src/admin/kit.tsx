import type React from 'react';

// 공용 소형 컴포넌트 (sections/panels에서 사용)
export function Card({ title, desc, children, action }: { title: string; desc?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-navy">{title}</h2>
          {desc && <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block last:mb-0">
      <span className="mb-1.5 block text-[14px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-400">{hint}</span>}
    </label>
  );
}
export const inputCls = 'w-full rounded-xl border border-soft-200 bg-white px-3.5 py-2.5 text-[15px] focus:border-navy focus:outline-none';
export function IconBtn({ onClick, label, children, danger, disabled }: { onClick: () => void; label: string; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-soft-100 disabled:opacity-30 ${danger ? 'text-[#9B2C2C] hover:bg-[#FDF3F2]' : 'text-ink-600 hover:bg-mist'}`}>
      {children}
    </button>
  );
}
