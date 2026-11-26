import { Check } from 'lucide-react';
import type { PublicConfig } from '../types';
import { BottomBar, Button } from '../components/ui';
import { Icon } from '../lib/icons';

export function TreatmentStep({ config, value, onChange, onNext }: { config: PublicConfig; value: string | null; onChange: (id: string) => void; onNext: () => void }) {
  return (
    <>
      <section className="px-5 pt-4">
        <h1 className="text-[23px] font-bold leading-snug tracking-tight text-navy">{config.texts.treatmentQuestion}</h1>
        <p className="mt-1.5 text-[15px] text-ink-500">{config.texts.treatmentHelp}</p>
        <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="진료 유형">
          {config.treatments.map((t) => {
            const on = value === t.id;
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={on}
                onClick={() => onChange(t.id)}
                className={`press relative flex min-h-[132px] flex-col items-start rounded-2xl border p-4 text-left ${
                  on ? 'border-navy bg-accent-50 shadow-card' : 'border-soft-100 bg-white hover:border-soft-200'
                }`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${on ? 'bg-navy text-white' : 'bg-mist text-navy'}`}>
                  <Icon name={t.icon} className="h-[22px] w-[22px]" />
                </span>
                <span className="mt-3 text-[16px] font-semibold leading-tight text-ink">{t.label}</span>
                <span className="mt-1 text-[13px] leading-snug text-ink-500">{t.description}</span>
                {on && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 animate-pop items-center justify-center rounded-full bg-navy text-white">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      <BottomBar>
        <Button disabled={!value} onClick={onNext}>다음</Button>
      </BottomBar>
    </>
  );
}
