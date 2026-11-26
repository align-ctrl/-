// 데모 모드 생성기: AI가 아닌, 환자가 선택한 문장을 규칙적으로 조합한다.
// 선택되지 않은 경험·효과·결과는 절대 추가하지 않는다.
import { euro } from './josa.mjs';

const shuffle = (arr, rnd) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];
const strip = (s) => String(s).trim().replace(/[.!~\s]+$/, '');

// "설명이 자세했어요." → "설명이 자세했고" (과거형 ~ㅆ어요 일 때만 연결형으로)
function connective(label) {
  const s = strip(label);
  if (/어요$/.test(s)) {
    const stem = s.slice(0, -2);
    const last = stem.charCodeAt(stem.length - 1);
    if (last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 === 20) return stem + '고'; // 받침 ㅆ
  }
  return null;
}
// 최대 3개 문장을 자연스럽게 잇는다. 연결형 변환이 불가능하면 문장을 분리한다.
function joinItems(labels) {
  const out = [];
  let buf = [];
  const flush = () => { if (buf.length) out.push(buf.join(' ')); buf = []; };
  labels.forEach((l, i) => {
    const isLast = i === labels.length - 1 || buf.length === 1;
    const c = connective(l);
    if (!isLast && c) buf.push(c);
    else { buf.push(strip(l) + '.'); flush(); }
  });
  flush();
  return out.join(' ');
}
function lowerFirst(sentence, lead) {
  return lead ? `${lead} ${sentence}` : sentence;
}
function commentSentence(comment) {
  const c = String(comment || '').trim();
  if (!c) return '';
  return /[.!?~)\]"'…]$/.test(c) ? c : c + '.';
}

export function generateDemo({ hospitalName, treatment, selected, comment }, only, seed = Math.random()) {
  let s = Math.floor(seed * 2147483647) || 1;
  const rnd = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  const t = treatment.promptLabel || treatment.label;
  const tj = /진료$/.test(t) ? t : `${t} 진료`;
  const labels = selected.map((x) => x.label);
  const extra = commentSentence(comment);
  const result = {};

  if (!only || only === 'casual') {
    const open = pick([
      `오늘 ${euro(t)} ${hospitalName}에 다녀왔어요.`,
      `${t} 때문에 ${hospitalName}에 방문했어요.`,
      `오늘 ${tj} 받고 왔어요.`
    ], rnd);
    const items = shuffle(labels, rnd).slice(0, 4);
    const body = items.length > 2 ? [joinItems(items.slice(0, 2)), joinItems(items.slice(2))] : [joinItems(items)];
    result.casual = [open, ...body, extra].filter(Boolean).join(' ');
  }
  if (!only || only === 'concise') {
    const open = pick([`${euro(t)} 방문했어요.`, `${tj} 후기입니다.`, `오늘 ${euro(t)} 방문했어요.`], rnd);
    const items = shuffle(labels, rnd).slice(0, 3);
    result.concise = [open, joinItems(items), extra].filter(Boolean).join(' ');
  }
  if (!only || only === 'detailed') {
    const open = pick([
      `${hospitalName}에서 ${tj}를 받았어요.`,
      `오늘 ${euro(t)} ${hospitalName}에 내원했어요.`
    ], rnd);
    // 카테고리별로 묶어 문장 구성 (최대 3문장, 문장당 최대 2개 항목)
    const groups = [];
    for (const x of selected) {
      let g = groups.find((gg) => gg.id === x.categoryId);
      if (!g) groups.push((g = { id: x.categoryId, lead: x.lead, labels: [] }));
      g.labels.push(x.label);
    }
    const chosen = groups.length > 3 ? shuffle(groups, rnd).slice(0, 3).sort((a, b) => groups.indexOf(a) - groups.indexOf(b)) : groups;
    const sentences = chosen.map((g) => lowerFirst(joinItems(shuffle(g.labels, rnd).slice(0, 2)), g.lead));
    result.detailed = [open, ...sentences, extra].filter(Boolean).join(' ');
  }
  return result;
}
