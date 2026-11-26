import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { emptyDraft, type Draft, type PublicConfig, type ReviewStyle } from './types';
import { ApiError, fetchConfig, generateReviews, reportError, track } from './lib/api';
import { clearDraft, loadDraft, onceThisSession, saveDraft } from './lib/draft';
import { Button, Modal, StepHeader, Toast } from './components/ui';
import { Home } from './screens/Home';
import { TreatmentStep } from './screens/TreatmentStep';
import { ExperienceStep, visibleCategories } from './screens/ExperienceStep';
import { CommentStep } from './screens/CommentStep';
import { GeneratingStep } from './screens/GeneratingStep';
import { ReviewStep } from './screens/ReviewStep';
import { DoneStep } from './screens/DoneStep';

const inputsKeyOf = (d: Draft) => JSON.stringify([d.treatmentId, [...d.itemIds].sort(), d.comment.trim()]);
const prevStep = (s: number) => (s === 5 ? 3 : s === 6 ? 5 : Math.max(0, s - 1));
function normalize(step: number, d: Draft) {
  if (step === 4) step = 3; // 생성 중 화면으로는 되돌아가지 않음
  if (step >= 2 && !d.treatmentId) return 1;
  if (step >= 5 && !Object.keys(d.reviews).length) return 3;
  if (step === 6 && !d.chosen) return 5;
  return step;
}
function errorMessage(e: unknown) {
  if (e instanceof ApiError) {
    if (e.code === 'NETWORK') return e.message;
    if (e.code === 'RATE_LIMITED') return e.message;
    if (e.code === 'BAD_INPUT') return e.message;
    return 'AI 서버가 일시적으로 응답하지 않아요. 잠시 후 다시 시도해 주세요.';
  }
  return '알 수 없는 오류가 발생했어요.';
}

export default function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [restore, setRestore] = useState<Draft | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<ReviewStyle | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dir, setDir] = useState<'f' | 'b'>('f');
  const abortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // 초기화: 설정 로드, 임시 저장본 확인, 방문 통계
  useEffect(() => {
    fetchConfig().then(setConfig);
    const saved = loadDraft();
    if (saved) setRestore(saved);
    history.replaceState({ step: 0, idx: 0 }, '');
    if (onceThisSession('align-review:visited')) track('visit');
  }, []);

  useEffect(() => { saveDraft(draft); }, [draft]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [draft.step]);

  // 기기/브라우저 뒤로가기 지원 (선택 내용 유지)
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      abortRef.current?.abort();
      setDir('b');
      setDraft((d) => ({ ...d, step: normalize(e.state?.step ?? 0, d) }));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((step: number, replace = false) => {
    const cur = draftRef.current.step;
    setDir(step >= cur ? 'f' : 'b');
    setDraft((d) => ({ ...d, step }));
    const idx = (history.state?.idx ?? 0) + (replace ? 0 : 1);
    if (replace) history.replaceState({ step, idx }, '');
    else history.pushState({ step, idx }, '');
  }, []);

  const back = useCallback(() => {
    abortRef.current?.abort();
    if ((history.state?.idx ?? 0) > 0) history.back();
    else go(prevStep(draftRef.current.step), true);
  }, [go]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const runGenerate = useCallback(async (opts: { demo?: boolean; replace?: boolean } = {}) => {
    const d = draftRef.current;
    if (!d.treatmentId) return go(1);
    setGenError(null);
    go(4, opts.replace);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await generateReviews({ treatmentId: d.treatmentId, itemIds: d.itemIds, comment: d.comment, demo: opts.demo }, ctrl.signal);
      const entries = Object.entries(r.reviews).filter(([, v]) => v && v.trim());
      if (!entries.length) throw new ApiError('EMPTY', '생성된 리뷰가 없어요.');
      const reviews: Draft['reviews'] = {};
      for (const [k, v] of entries) reviews[k as ReviewStyle] = { text: v!, original: v!, edited: false };
      setDraft((cur) => ({ ...cur, reviews, mode: r.mode, chosen: null, inputsKey: inputsKeyOf(cur) }));
      go(5, true);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      reportError(e instanceof ApiError ? e.code : 'GENERATE_FAILED', 'generate');
      setGenError(errorMessage(e));
    }
  }, [go]);

  const regenerate = async (s: ReviewStyle) => {
    const d = draftRef.current;
    if (!d.treatmentId) return;
    setRegenerating(s);
    try {
      const r = await generateReviews({ treatmentId: d.treatmentId, itemIds: d.itemIds, comment: d.comment, only: s, previous: d.reviews[s]?.text, demo: d.mode === 'demo' });
      const text = r.reviews[s];
      if (!text) throw new ApiError('EMPTY', '');
      setDraft((cur) => ({ ...cur, reviews: { ...cur.reviews, [s]: { text, original: text, edited: false } } }));
    } catch (e) {
      reportError(e instanceof ApiError ? e.code : 'REGENERATE_FAILED', 'regenerate');
      setToast('다시 생성하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setRegenerating(null);
    }
  };

  const restart = () => {
    abortRef.current?.abort();
    clearDraft();
    setDraft(emptyDraft());
    setGenError(null);
    setDir('b');
    history.replaceState({ step: 0, idx: 0 }, '');
  };

  const categories = useMemo(() => (config ? visibleCategories(config.categories, draft.treatmentId) : []), [config, draft.treatmentId]);

  if (!config) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <img src="/brand/logo-mark-navy.png" alt="에이라인치과병원" className="h-14 w-auto animate-pulse" />
      </div>
    );
  }

  const step = draft.step;
  const anim = dir === 'f' ? 'animate-inR' : 'animate-inL';

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-white">
      {step === 0 ? (
        <div key="home" className={step === 0 && dir === 'b' ? 'animate-inL' : ''}>
          <Home config={config} onStart={() => { track('start'); go(1); }} />
        </div>
      ) : (
        <>
          <StepHeader
            step={Math.min(step, 6)}
            onBack={step === 4 && !genError ? undefined : back}
            markUrl={config.hospital.markUrl}
            hospitalName={config.hospital.name}
          />
          <main key={step} className={`flex flex-1 flex-col pb-2 ${anim}`}>
            {step === 1 && (
              <TreatmentStep
                config={config}
                value={draft.treatmentId}
                onChange={(id) => {
                  // 진료 유형 변경 시, 새 유형에서 보이지 않는 항목은 선택 해제
                  const visible = new Set(visibleCategories(config.categories, id).flatMap((c) => c.items.map((i) => i.id)));
                  update({ treatmentId: id, itemIds: draft.itemIds.filter((x) => visible.has(x)) });
                }}
                onNext={() => go(2)}
              />
            )}
            {step === 2 && (
              <ExperienceStep
                question={config.texts.experienceQuestion}
                help={config.texts.experienceHelp}
                categories={categories}
                selected={draft.itemIds}
                onToggle={(id) => update({ itemIds: draft.itemIds.includes(id) ? draft.itemIds.filter((x) => x !== id) : [...draft.itemIds, id] })}
                onClear={() => update({ itemIds: [] })}
                onNext={() => go(3)}
              />
            )}
            {step === 3 && (
              <CommentStep
                texts={config.texts}
                value={draft.comment}
                mode={config.mode}
                onChange={(v) => update({ comment: v })}
                onNext={() => {
                  // 입력이 바뀌지 않았다면 기존 초안(직접 수정한 내용 포함)을 그대로 보여줌
                  if (Object.keys(draft.reviews).length && draft.inputsKey === inputsKeyOf(draft)) go(5);
                  else runGenerate();
                }}
              />
            )}
            {step === 4 && (
              <GeneratingStep
                mode={config.mode}
                error={genError}
                onRetry={() => runGenerate({ replace: true })}
                onDemo={config.mode === 'ai' ? () => runGenerate({ demo: true, replace: true }) : undefined}
                onBack={back}
              />
            )}
            {step === 5 && (
              <ReviewStep
                draft={draft}
                regenerating={regenerating}
                onEdit={(s, text) => setDraft((d) => ({ ...d, reviews: { ...d.reviews, [s]: { ...d.reviews[s]!, text, edited: text !== d.reviews[s]!.original } } }))}
                onRestore={(s) => setDraft((d) => ({ ...d, reviews: { ...d.reviews, [s]: { ...d.reviews[s]!, text: d.reviews[s]!.original, edited: false } } }))}
                onRegenerate={regenerate}
                onChoose={(s) => update({ chosen: s })}
                onConfirm={() => { track('select'); go(6); }}
              />
            )}
            {step === 6 && draft.chosen && (
              <DoneStep
                config={config}
                text={draft.reviews[draft.chosen]!.text}
                onChange={(text) => setDraft((d) => ({ ...d, reviews: { ...d.reviews, [d.chosen!]: { ...d.reviews[d.chosen!]!, text, edited: text !== d.reviews[d.chosen!]!.original } } }))}
                onRestart={restart}
                toast={setToast}
                onCopied={() => track('copy')}
                onNaver={() => track('naver')}
              />
            )}
          </main>
        </>
      )}

      <Toast message={toast} onDone={() => setToast(null)} />

      <Modal
        open={!!restore}
        title="작성 중이던 내용이 있어요"
        actions={
          <>
            <Button onClick={() => {
              const r = restore!;
              setRestore(null);
              const step = normalize(r.step, r);
              setDraft({ ...r, step });
              history.replaceState({ step: 0, idx: 0 }, '');
              history.pushState({ step, idx: 1 }, '');
            }}>이어서 작성하기</Button>
            <Button variant="ghost" onClick={() => { setRestore(null); clearDraft(); }}>새로 시작하기</Button>
          </>
        }
      >
        이 기기에 임시로 남아 있는 내용을 이어서 작성할 수 있어요. 새로 시작하면 이전 내용은 삭제됩니다.
      </Modal>
    </div>
  );
}
