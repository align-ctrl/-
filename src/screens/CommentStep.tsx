import { Lightbulb, ShieldAlert } from 'lucide-react';
import type { Texts } from '../types';
import { BottomBar, Button, Notice } from '../components/ui';
import { detectPersonalInfo } from '../lib/privacy';

export const COMMENT_MAX = 300;

export function CommentStep({ texts, value, onChange, onNext, mode }: { texts: Texts; value: string; onChange: (v: string) => void; onNext: () => void; mode: 'ai' | 'demo' }) {
  const pii = detectPersonalInfo(value);
  return (
    <>
      <section className="px-5 pt-4">
        <h1 className="text-[23px] font-bold leading-snug tracking-tight text-navy">{texts.commentQuestion}</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-500">{texts.commentHelp}</p>

        <div className="mt-5 rounded-2xl bg-mist px-4 py-4">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-accent"><Lightbulb className="h-4 w-4" /> 이런 이야기도 좋아요</p>
          <ul className="space-y-1.5 text-[14px] text-ink-600">
            {texts.commentExamples.filter((e) => e.trim() && e !== texts.commentQuestion).map((e) => <li key={e}>· {e}</li>)}
          </ul>
        </div>

        <label className="mt-5 block">
          <span className="sr-only">추가 의견</span>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, COMMENT_MAX))}
            maxLength={COMMENT_MAX}
            rows={6}
            placeholder="자유롭게 적어 주세요. (선택 사항)"
            className="w-full resize-none rounded-2xl border border-soft-200 bg-white px-4 py-3.5 text-[16px] leading-relaxed text-ink placeholder:text-ink-400 focus:border-navy focus:outline-none focus:ring-4 focus:ring-accent-50"
          />
        </label>
        <div className="mt-1 flex justify-end text-[13px] text-ink-400">
          <span className={value.length >= COMMENT_MAX ? 'font-semibold text-[#9B2C2C]' : ''}>{value.length}</span>&nbsp;/ {COMMENT_MAX}자
        </div>

        <div className="mt-3 space-y-2">
          {pii && (
            <Notice tone="warn" icon={<ShieldAlert className="h-4 w-4" />}>
              {pii}로 보이는 내용이 있어요. 개인정보는 지워 주세요. 전송 시 자동으로 가려집니다.
            </Notice>
          )}
          <p className="flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-400">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {texts.commentPrivacy}
          </p>
        </div>
      </section>
      <BottomBar>
        <Button onClick={onNext}>{mode === 'ai' ? 'AI 리뷰 초안 만들기' : '리뷰 초안 만들기'}</Button>
      </BottomBar>
    </>
  );
}
