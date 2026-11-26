import { Check, CircleCheck, Info, LoaderCircle, Pencil, RefreshCw, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { REVIEW_STYLES, STYLE_META, type Draft, type ReviewStyle } from '../types';
import { BottomBar, Button, Modal, Notice } from '../components/ui';

export function ReviewStep({
  draft, regenerating, onEdit, onRestore, onRegenerate, onChoose, onConfirm
}: {
  draft: Draft;
  regenerating: ReviewStyle | null;
  onEdit: (s: ReviewStyle, text: string) => void;
  onRestore: (s: ReviewStyle) => void;
  onRegenerate: (s: ReviewStyle) => void;
  onChoose: (s: ReviewStyle) => void;
  onConfirm: () => void;
}) {
  const [editing, setEditing] = useState<ReviewStyle | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<ReviewStyle | null>(null);
  const styles = REVIEW_STYLES.filter((s) => draft.reviews[s]);

  return (
    <>
      <section className="px-5 pt-4">
        <h1 className="text-[23px] font-bold leading-snug tracking-tight text-navy">마음에 드는 리뷰를 골라 주세요</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-500">직접 수정할 수 있어요. 사실과 다른 내용이 없는지 꼭 확인해 주세요.</p>
        <div className="mt-4">
          {draft.mode === 'demo' ? (
            <Notice tone="demo" icon={<Info className="h-4 w-4" />}>
              <b>데모 모드</b> · AI가 연결되지 않아, 선택하신 항목을 조합한 <b>예시 문장</b>을 보여드려요. 실제 AI가 작성한 문장이 아닙니다.
            </Notice>
          ) : (
            <Notice icon={<Info className="h-4 w-4" />}>AI가 작성한 초안이에요. 내 경험과 다른 표현은 자유롭게 고쳐 주세요.</Notice>
          )}
        </div>

        <div className="mt-5 space-y-4" role="radiogroup" aria-label="리뷰 초안">
          {styles.map((s) => {
            const r = draft.reviews[s]!;
            const chosen = draft.chosen === s;
            const isEditing = editing === s;
            const busy = regenerating === s;
            return (
              <article
                key={s}
                className={`relative rounded-2xl border bg-white p-4 transition-all ${chosen ? 'border-navy shadow-lift' : 'border-soft-100 shadow-card'}`}
              >
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${chosen ? 'bg-navy text-white' : 'bg-mist text-navy'}`}>{STYLE_META[s].name}</span>
                    {r.edited && <span className="text-[12px] font-medium text-accent">직접 수정함</span>}
                  </div>
                  <span className="text-[12px] text-ink-400">{r.text.length}자</span>
                </header>

                {isEditing ? (
                  <textarea
                    autoFocus
                    value={r.text}
                    onChange={(e) => onEdit(s, e.target.value.slice(0, 1000))}
                    rows={7}
                    aria-label={`${STYLE_META[s].name} 수정`}
                    className="mt-3 w-full resize-y rounded-xl border border-navy bg-white px-3.5 py-3 text-[16px] leading-relaxed focus:outline-none focus:ring-4 focus:ring-accent-50"
                  />
                ) : (
                  <button
                    onClick={() => onChoose(s)}
                    role="radio"
                    aria-checked={chosen}
                    className="mt-3 block w-full text-left"
                    disabled={busy}
                  >
                    <p className={`whitespace-pre-wrap text-[16px] leading-[1.75] text-ink ${busy ? 'opacity-30' : ''}`}>{r.text}</p>
                  </button>
                )}
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/50">
                    <LoaderCircle className="h-7 w-7 animate-spin text-navy" />
                  </div>
                )}

                <footer className="mt-4 flex items-center gap-1 border-t border-soft-50 pt-3">
                  {isEditing ? (
                    <>
                      <SmallBtn onClick={() => setEditing(null)} icon={<Check className="h-4 w-4" />} strong>수정 완료</SmallBtn>
                      {r.edited && <SmallBtn onClick={() => onRestore(s)} icon={<RotateCcw className="h-4 w-4" />}>원래대로</SmallBtn>}
                    </>
                  ) : (
                    <>
                      <SmallBtn onClick={() => setEditing(s)} icon={<Pencil className="h-4 w-4" />} disabled={busy}>직접 수정</SmallBtn>
                      <SmallBtn
                        onClick={() => (r.edited ? setConfirmRegen(s) : onRegenerate(s))}
                        icon={<RefreshCw className="h-4 w-4" />}
                        disabled={busy || regenerating !== null}
                      >
                        다시 생성
                      </SmallBtn>
                    </>
                  )}
                  <button
                    onClick={() => { setEditing(null); onChoose(s); }}
                    disabled={busy}
                    className={`press ml-auto flex min-h-[40px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 text-[14px] font-semibold ${chosen ? 'bg-navy text-white' : 'border border-soft-200 text-navy'}`}
                  >
                    <CircleCheck className="h-4 w-4" /> {chosen ? '선택됨' : '선택'}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      </section>

      <BottomBar>
        <Button disabled={!draft.chosen || !draft.reviews[draft.chosen]?.text.trim()} onClick={() => { setEditing(null); onConfirm(); }}>
          {draft.chosen ? '이 리뷰로 결정하기' : '리뷰를 선택해 주세요'}
        </Button>
      </BottomBar>

      <Modal
        open={confirmRegen !== null}
        title="다시 생성할까요?"
        actions={
          <>
            <Button onClick={() => { const s = confirmRegen!; setConfirmRegen(null); onRegenerate(s); }}>다시 생성하기</Button>
            <Button variant="ghost" onClick={() => setConfirmRegen(null)}>취소</Button>
          </>
        }
      >
        직접 수정하신 내용이 새 초안으로 바뀌어요.
      </Modal>
    </>
  );
}

function SmallBtn({ children, icon, strong, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode; strong?: boolean }) {
  return (
    <button {...rest} className={`press flex min-h-[40px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[14px] font-medium disabled:opacity-40 ${strong ? 'bg-accent-50 text-navy' : 'text-ink-600 hover:bg-mist'}`}>
      {icon}
      {children}
    </button>
  );
}
