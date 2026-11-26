import { Check, Info } from 'lucide-react';
import type { Category } from '../types';
import { BottomBar, Button, Notice } from '../components/ui';
import { Icon } from '../lib/icons';

export function visibleCategories(categories: Category[], treatmentId: string | null) {
  return categories
    .map((c) => ({ ...c, items: c.items.filter((i) => !i.treatments.length || (treatmentId && i.treatments.includes(treatmentId))) }))
    .filter((c) => c.items.length);
}

export function ExperienceStep({
  question, help, categories, selected, onToggle, onClear, onNext
}: {
  question: string; help: string; categories: Category[]; selected: string[];
  onToggle: (id: string) => void; onClear: () => void; onNext: () => void;
}) {
  const count = selected.length;
  return (
    <>
      <section className="px-5 pt-4">
        <h1 className="text-[23px] font-bold leading-snug tracking-tight text-navy">{question}</h1>
        <div className="mt-3">
          <Notice icon={<Info className="h-4 w-4" />}>{help}</Notice>
        </div>

        <div className="mt-6 space-y-7">
          {categories.map((c) => (
            <fieldset key={c.id}>
              <legend className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold text-navy">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist"><Icon name={c.icon} className="h-4 w-4" /></span>
                {c.name}
              </legend>
              <div className="space-y-2">
                {c.items.map((i) => {
                  const on = selected.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => onToggle(i.id)}
                      className={`press flex min-h-[54px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[16px] ${
                        on ? 'border-navy bg-accent-50 font-semibold text-navy' : 'border-soft-100 bg-white text-ink hover:border-soft-200'
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${on ? 'border-navy bg-navy text-white' : 'border-soft-200 bg-white text-transparent'}`}>
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      {i.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>
      <BottomBar>
        <div className="flex items-center justify-between px-1 pb-1 text-[14px]">
          <span className="text-ink-500">
            {count ? <><b className="text-navy">{count}개</b> 선택됨</> : '선택하지 않아도 진행할 수 있어요'}
          </span>
          {count > 0 && <button onClick={onClear} className="min-h-[36px] px-2 text-ink-400 underline underline-offset-2">선택 해제</button>}
        </div>
        <Button onClick={onNext}>다음</Button>
      </BottomBar>
    </>
  );
}
