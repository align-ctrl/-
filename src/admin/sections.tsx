import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { Category, FullConfig, Texts, Treatment } from '../types';
import { ICONS, Icon } from '../lib/icons';
import { Card, Field, IconBtn, inputCls } from './kit';
import { adminFetch } from './adminApi';

type P = { cfg: FullConfig; onChange: (c: FullConfig) => void };
const move = <T,>(arr: T[], i: number, d: number) => {
  const a = [...arr];
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};
const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

function readImage(file: File, maxKB: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error('PNG, JPG, WEBP 파일만 업로드할 수 있습니다.'));
    if (file.size > maxKB * 1024) return reject(new Error(`${maxKB}KB 이하의 파일만 업로드할 수 있습니다.`));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    r.readAsDataURL(file);
  });
}

export function BasicSection({ cfg, onChange }: P) {
  const [err, setErr] = useState('');
  const h = cfg.hospital;
  const setH = (patch: Partial<FullConfig['hospital']>) => onChange({ ...cfg, hospital: { ...h, ...patch } });
  const naverOk = !cfg.naverPlaceUrl || /^https:\/\/([\w-]+\.)*naver\.(com|me)(\/|$)/.test(cfg.naverPlaceUrl);
  const upload = (key: 'logoUrl' | 'markUrl') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setErr(''); setH({ [key]: await readImage(f, 400) }); } catch (x) { setErr((x as Error).message); }
  };
  return (
    <>
      <Card title="네이버 플레이스 연결" desc="완료 화면의 ‘네이버 플레이스에서 리뷰 쓰기’ 버튼이 이 주소로 이동합니다. 환자가 직접 로그인·방문 인증·별점 선택·등록을 진행합니다.">
        <Field label="네이버 플레이스 리뷰 URL" hint="예) https://m.place.naver.com/hospital/1234567890/review/visitor  ·  naver.me 단축 주소도 가능">
          <input className={`${inputCls} ${naverOk ? '' : 'border-[#9B2C2C]'}`} value={cfg.naverPlaceUrl} placeholder="https://m.place.naver.com/..."
            onChange={(e) => onChange({ ...cfg, naverPlaceUrl: e.target.value.trim() })} inputMode="url" />
        </Field>
        {!naverOk && <p className="-mt-2 text-[13px] text-[#9B2C2C]">https:// 로 시작하는 naver.com 또는 naver.me 주소를 입력해 주세요.</p>}
        {cfg.naverPlaceUrl && naverOk && (
          <a href={cfg.naverPlaceUrl} target="_blank" rel="noreferrer" className="text-[14px] font-medium text-accent underline">새 창에서 주소 확인하기</a>
        )}
      </Card>
      <Card title="병원 정보 및 로고">
        <Field label="병원명 (AI 리뷰 및 화면 상단에 사용)"><input className={inputCls} value={h.name} onChange={(e) => setH({ name: e.target.value })} /></Field>
        <Field label="영문명"><input className={inputCls} value={h.nameEn} onChange={(e) => setH({ nameEn: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {([['logoUrl', '메인 로고 (가로형)', 'h-14'], ['markUrl', '심볼 로고 (상단 바)', 'h-14']] as const).map(([k, label, cls]) => (
            <div key={k} className="rounded-xl border border-soft-100 p-4">
              <p className="mb-3 text-[14px] font-semibold">{label}</p>
              <div className="flex h-20 items-center justify-center rounded-lg bg-mist"><img src={h[k]} alt="" className={`${cls} max-w-full object-contain`} /></div>
              <div className="mt-3 flex gap-2">
                <label className="flex-1 cursor-pointer rounded-lg border border-soft-200 py-2 text-center text-[14px] font-medium text-navy hover:bg-mist">
                  파일 선택<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload(k)} />
                </label>
                <button type="button" onClick={() => setH({ [k]: k === 'logoUrl' ? '/brand/logo-horizontal.png' : '/brand/logo-mark.png' })} className="rounded-lg border border-soft-200 px-3 text-[14px] text-ink-500 hover:bg-mist">기본값</button>
              </div>
            </div>
          ))}
        </div>
        {err && <p className="mt-3 text-[13px] text-[#9B2C2C]">{err}</p>}
        <p className="mt-3 text-[12px] text-ink-400">투명 배경 PNG 권장, 400KB 이하. 앱 아이콘(홈 화면)은 public/icons 파일 교체 후 재배포가 필요합니다.</p>
      </Card>
    </>
  );
}

const TEXT_FIELDS: { key: Exclude<keyof Texts, 'commentExamples'>; label: string; long?: boolean; group: string }[] = [
  { key: 'homeTitle', label: '메인 제목', group: '메인 화면' },
  { key: 'homeSubtitle', label: '메인 부제', group: '메인 화면' },
  { key: 'homeGuide', label: '안내 문구', long: true, group: '메인 화면' },
  { key: 'homeNotice', label: '하단 안내', long: true, group: '메인 화면' },
  { key: 'estimatedTime', label: '예상 소요 시간', group: '메인 화면' },
  { key: 'treatmentQuestion', label: '질문', group: '진료 유형 선택' },
  { key: 'treatmentHelp', label: '도움말', group: '진료 유형 선택' },
  { key: 'experienceQuestion', label: '질문', group: '만족 항목 선택' },
  { key: 'experienceHelp', label: '도움말', long: true, group: '만족 항목 선택' },
  { key: 'commentQuestion', label: '질문', group: '추가 의견' },
  { key: 'commentHelp', label: '도움말', long: true, group: '추가 의견' },
  { key: 'commentPrivacy', label: '개인정보 안내', long: true, group: '추가 의견' },
  { key: 'doneTitle', label: '완료 제목', group: '완료 화면' },
  { key: 'doneSubtitle', label: '완료 안내', long: true, group: '완료 화면' }
];
export function TextsSection({ cfg, defaults, onChange }: P & { defaults: FullConfig }) {
  const set = (k: keyof Texts, v: string | string[]) => onChange({ ...cfg, texts: { ...cfg.texts, [k]: v } });
  const groups = [...new Set(TEXT_FIELDS.map((f) => f.group))];
  return (
    <>
      {groups.map((g) => (
        <Card key={g} title={g}>
          {TEXT_FIELDS.filter((f) => f.group === g).map((f) => (
            <Field key={f.key} label={f.label}>
              <div className="flex gap-2">
                {f.long ? (
                  <textarea rows={2} className={inputCls} value={cfg.texts[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input className={inputCls} value={cfg.texts[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                )}
                <IconBtn label="기본 문구로" onClick={() => set(f.key, defaults.texts[f.key])} disabled={cfg.texts[f.key] === defaults.texts[f.key]}><RotateCcw className="h-4 w-4" /></IconBtn>
              </div>
            </Field>
          ))}
          {g === '추가 의견' && (
            <Field label="예시 질문 (한 줄에 하나, 최대 6개)">
              <textarea rows={4} className={inputCls} value={cfg.texts.commentExamples.join('\n')}
                onChange={(e) => set('commentExamples', e.target.value.split('\n'))} />
            </Field>
          )}
        </Card>
      ))}
    </>
  );
}

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-navy"><Icon name={value} className="h-5 w-5" /></span>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(ICONS).map(([k, v]) => <option key={k} value={k}>{v.label} ({k})</option>)}
      </select>
    </div>
  );
}

export function TreatmentsSection({ cfg, onChange }: P) {
  const list = cfg.treatments;
  const set = (i: number, patch: Partial<Treatment>) => onChange({ ...cfg, treatments: list.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const remove = (i: number) => {
    const id = list[i].id;
    if (!confirm(`‘${list[i].label}’ 항목을 삭제할까요?`)) return;
    onChange({
      ...cfg,
      treatments: list.filter((_, j) => j !== i),
      categories: cfg.categories.map((c) => ({ ...c, items: c.items.map((it) => ({ ...it, treatments: it.treatments.filter((x) => x !== id) })) }))
    });
  };
  return (
    <Card title="진료 유형" desc="환자가 2단계에서 선택하는 카드입니다. ‘AI 전달용 명칭’은 리뷰 문장에 들어가는 표현입니다. 사용 중지하면 환자 화면에서 숨겨집니다."
      action={<button type="button" onClick={() => onChange({ ...cfg, treatments: [...list, { id: newId('t'), label: '새 진료 유형', description: '', icon: 'stethoscope', promptLabel: '', enabled: true }] })}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-navy px-3 py-2 text-[14px] font-medium text-white"><Plus className="h-4 w-4" /> 추가</button>}>
      <div className="space-y-3">
        {list.map((t, i) => (
          <div key={t.id} className={`rounded-xl border p-4 ${t.enabled ? 'border-soft-100' : 'border-dashed border-soft-200 opacity-60'}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[14px] font-medium">
                <input type="checkbox" checked={t.enabled} onChange={(e) => set(i, { enabled: e.target.checked })} className="h-4 w-4 accent-navy" /> 사용
              </label>
              <div className="flex gap-1.5">
                <IconBtn label="위로" onClick={() => onChange({ ...cfg, treatments: move(list, i, -1) })} disabled={i === 0}><ArrowUp className="h-4 w-4" /></IconBtn>
                <IconBtn label="아래로" onClick={() => onChange({ ...cfg, treatments: move(list, i, 1) })} disabled={i === list.length - 1}><ArrowDown className="h-4 w-4" /></IconBtn>
                <IconBtn label="삭제" danger onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></IconBtn>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="이름"><input className={inputCls} value={t.label} onChange={(e) => set(i, { label: e.target.value })} /></Field>
              <Field label="짧은 설명"><input className={inputCls} value={t.description} onChange={(e) => set(i, { description: e.target.value })} /></Field>
              <Field label="AI 전달용 명칭" hint="비우면 이름을 사용"><input className={inputCls} value={t.promptLabel} onChange={(e) => set(i, { promptLabel: e.target.value })} /></Field>
              <Field label="아이콘"><IconSelect value={t.icon} onChange={(v) => set(i, { icon: v })} /></Field>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CategoriesSection({ cfg, onChange }: P) {
  const cats = cfg.categories;
  const setCat = (i: number, patch: Partial<Category>) => onChange({ ...cfg, categories: cats.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  return (
    <>
      <Card title="만족 항목" desc="환자가 3단계에서 복수 선택하는 문장입니다. AI는 환자가 선택한 문장만 사용합니다. ‘노출 진료 유형’을 지정하면 해당 진료에서만 보입니다(미지정 시 전체)."
        action={<button type="button" onClick={() => onChange({ ...cfg, categories: [...cats, { id: newId('c'), name: '새 카테고리', icon: 'clipboard', lead: '', items: [] }] })}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-navy px-3 py-2 text-[14px] font-medium text-white"><Plus className="h-4 w-4" /> 카테고리</button>}>
        <p className="text-[13px] text-ink-500">총 {cats.reduce((n, c) => n + c.items.length, 0)}개 항목 · {cats.length}개 카테고리</p>
      </Card>
      {cats.map((c, i) => (
        <Card key={c.id} title={c.name || '(이름 없음)'}
          action={
            <div className="flex gap-1.5">
              <IconBtn label="위로" onClick={() => onChange({ ...cfg, categories: move(cats, i, -1) })} disabled={i === 0}><ArrowUp className="h-4 w-4" /></IconBtn>
              <IconBtn label="아래로" onClick={() => onChange({ ...cfg, categories: move(cats, i, 1) })} disabled={i === cats.length - 1}><ArrowDown className="h-4 w-4" /></IconBtn>
              <IconBtn label="카테고리 삭제" danger onClick={() => confirm(`‘${c.name}’ 카테고리와 항목을 삭제할까요?`) && onChange({ ...cfg, categories: cats.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></IconBtn>
            </div>
          }>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="카테고리명"><input className={inputCls} value={c.name} onChange={(e) => setCat(i, { name: e.target.value })} /></Field>
            <Field label="아이콘"><IconSelect value={c.icon} onChange={(v) => setCat(i, { icon: v })} /></Field>
            <Field label="데모 모드 연결어" hint="예) 상담에서는"><input className={inputCls} value={c.lead} onChange={(e) => setCat(i, { lead: e.target.value })} /></Field>
          </div>
          <div className="mt-2 space-y-2">
            {c.items.map((it, k) => (
              <div key={it.id} className="rounded-xl bg-mist p-3">
                <div className="flex gap-2">
                  <input className={inputCls} value={it.label} onChange={(e) => setCat(i, { items: c.items.map((x, m) => (m === k ? { ...x, label: e.target.value } : x)) })} />
                  <IconBtn label="위로" onClick={() => setCat(i, { items: move(c.items, k, -1) })} disabled={k === 0}><ArrowUp className="h-4 w-4" /></IconBtn>
                  <IconBtn label="삭제" danger onClick={() => setCat(i, { items: c.items.filter((_, m) => m !== k) })}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="py-1 text-[12px] text-ink-500">노출 진료 유형:</span>
                  {cfg.treatments.map((t) => {
                    const on = it.treatments.includes(t.id);
                    return (
                      <button type="button" key={t.id}
                        onClick={() => setCat(i, { items: c.items.map((x, m) => (m === k ? { ...x, treatments: on ? x.treatments.filter((y) => y !== t.id) : [...x.treatments, t.id] } : x)) })}
                        className={`rounded-full px-2.5 py-1 text-[12px] ${on ? 'bg-navy text-white' : 'bg-white text-ink-600'}`}>{t.label}</button>
                    );
                  })}
                  {!it.treatments.length && <span className="py-1 text-[12px] font-medium text-accent">(전체 노출)</span>}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setCat(i, { items: [...c.items, { id: newId('i'), label: '', treatments: [] }] })}
              className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-soft-200 py-2.5 text-[14px] text-navy hover:bg-mist"><Plus className="h-4 w-4" /> 항목 추가</button>
          </div>
          <p className="mt-2 text-[12px] text-ink-400">데모 모드 자연스러운 연결을 위해 ‘~했어요.’ 처럼 과거형 해요체로 작성하는 것을 권장합니다.</p>
        </Card>
      ))}
    </>
  );
}

export function AiSection({ cfg, defaults, aiEnabled, envModel, onChange, dirty, onError }: P & { defaults: FullConfig; aiEnabled: boolean; envModel: string; dirty: boolean; onError: (e: unknown) => void }) {
  const ai = cfg.ai;
  const set = (patch: Partial<FullConfig['ai']>) => onChange({ ...cfg, ai: { ...ai, ...patch } });
  const [preview, setPreview] = useState<{ mode: string; reviews: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const runPreview = async () => {
    setBusy(true); setPreview(null);
    try {
      const first = cfg.treatments.find((t) => t.enabled);
      const items = cfg.categories.flatMap((c) => c.items).slice(0, 3).map((i) => i.id);
      setPreview(await adminFetch('/api/admin/preview', { method: 'POST', json: { treatmentId: first?.id, itemIds: items, comment: '' } }));
    } catch (e) { onError(e); } finally { setBusy(false); }
  };
  return (
    <>
      <Card title="AI 연결 상태">
        {aiEnabled ? (
          <p className="rounded-xl bg-accent-50 px-4 py-3 text-[14px] text-navy">✅ OpenAI API 키가 서버에 설정되어 있습니다. 실제 AI 생성 모드로 동작합니다.</p>
        ) : (
          <p className="rounded-xl bg-[#FFF8E8] px-4 py-3 text-[14px] text-[#7A5A12]">⚠️ 서버에 OPENAI_API_KEY가 없어 <b>데모 모드</b>(예시 문장 조합)로 동작 중입니다. 환자 화면에도 데모 모드임이 표시됩니다. 키는 보안을 위해 서버 환경변수로만 설정합니다.</p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="모델" hint={`비우면 서버 기본값 사용: ${envModel}`}><input className={inputCls} value={ai.model} placeholder={envModel} onChange={(e) => set({ model: e.target.value.trim() })} /></Field>
          <Field label={`창의성 (temperature): ${ai.temperature.toFixed(1)}`} hint="낮을수록 일관적, 높을수록 다양한 표현">
            <input type="range" min={0} max={1.2} step={0.1} value={ai.temperature} onChange={(e) => set({ temperature: Number(e.target.value) })} className="w-full accent-navy" />
          </Field>
        </div>
      </Card>
      <Card title="시스템 프롬프트" desc="AI의 기본 작성 지침입니다. 출력 형식(JSON)과 ‘선택하지 않은 경험 추가 금지·과장 금지·아쉬운 점 유지’ 규칙은 서버에서 항상 자동으로 덧붙여지므로 수정해도 사라지지 않습니다."
        action={<button type="button" onClick={() => set({ systemPrompt: defaults.ai.systemPrompt })} className="flex shrink-0 items-center gap-1 rounded-lg border border-soft-200 px-3 py-2 text-[13px] text-ink-600"><RotateCcw className="h-3.5 w-3.5" /> 기본값</button>}>
        <textarea rows={14} className={`${inputCls} text-[14px] leading-relaxed`} value={ai.systemPrompt} onChange={(e) => set({ systemPrompt: e.target.value })} />
      </Card>
      <Card title="미리보기" desc="저장된 설정으로 샘플(첫 번째 진료 유형 + 만족 항목 3개)을 생성해 봅니다.">
        <button type="button" onClick={runPreview} disabled={busy} className="rounded-xl bg-navy px-4 py-2.5 text-[14px] font-semibold text-white disabled:bg-soft-200">{busy ? '생성 중…' : '샘플 생성'}</button>
        {dirty && <span className="ml-3 text-[13px] text-ink-400">※ 저장 후 미리보기에 반영됩니다.</span>}
        {preview && (
          <div className="mt-4 space-y-2">
            <p className="text-[13px] font-semibold text-ink-500">모드: {preview.mode === 'ai' ? 'AI' : '데모'}</p>
            {Object.entries(preview.reviews).map(([k, v]) => <p key={k} className="rounded-xl bg-mist p-3 text-[14px] leading-relaxed"><b className="text-navy">[{k}]</b> {v}</p>)}
          </div>
        )}
      </Card>
    </>
  );
}
