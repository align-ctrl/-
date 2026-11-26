// 관리자 설정 저장 시 구조 검증 및 정리
import { ICON_KEYS } from './icons.mjs';

const str = (v, max, def = '') => (typeof v === 'string' ? v.trim().slice(0, max) : def);
const id = (v) => str(v, 40).replace(/[^a-zA-Z0-9_-]/g, '');

export class ValidationError extends Error {}

export function validNaverUrl(u) {
  if (!u) return true;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && /(^|\.)naver\.(com|me)$/.test(url.hostname);
  } catch { return false; }
}
function imageUrl(v, fallback) {
  const s = str(v, 700_000);
  if (!s) return fallback;
  if (/^\/[\w./-]+$/.test(s)) return s;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) return s;
  if (/^https:\/\/[^\s"'<>]+$/.test(s)) return s;
  throw new ValidationError('로고는 PNG/JPG/WEBP 파일 또는 https 주소만 사용할 수 있습니다.');
}

export function sanitizeConfig(input, defaults) {
  if (!input || typeof input !== 'object') throw new ValidationError('설정 형식이 올바르지 않습니다.');
  const naver = str(input.naverPlaceUrl, 500);
  if (!validNaverUrl(naver)) throw new ValidationError('네이버 플레이스 주소는 https://로 시작하는 naver.com / naver.me 주소여야 합니다.');

  const texts = {};
  for (const k of Object.keys(defaults.texts)) {
    if (k === 'commentExamples') {
      const arr = Array.isArray(input.texts?.commentExamples) ? input.texts.commentExamples : defaults.texts.commentExamples;
      texts.commentExamples = arr.map((x) => str(x, 100)).filter(Boolean).slice(0, 6);
    } else texts[k] = str(input.texts?.[k], 300, defaults.texts[k]) || defaults.texts[k];
  }

  const treatments = (Array.isArray(input.treatments) ? input.treatments : []).slice(0, 20).map((t) => ({
    id: id(t.id),
    label: str(t.label, 30),
    description: str(t.description, 50),
    icon: ICON_KEYS.includes(t.icon) ? t.icon : 'more',
    promptLabel: str(t.promptLabel, 40) || str(t.label, 30),
    enabled: t.enabled !== false
  })).filter((t) => t.id && t.label);
  if (!treatments.some((t) => t.enabled)) throw new ValidationError('사용 중인 진료 유형이 최소 1개 필요합니다.');
  if (new Set(treatments.map((t) => t.id)).size !== treatments.length) throw new ValidationError('진료 유형 ID가 중복되었습니다.');
  const tIds = new Set(treatments.map((t) => t.id));

  const itemIds = new Set();
  const categories = (Array.isArray(input.categories) ? input.categories : []).slice(0, 12).map((c) => ({
    id: id(c.id),
    name: str(c.name, 20),
    icon: ICON_KEYS.includes(c.icon) ? c.icon : 'clipboard',
    lead: str(c.lead, 20),
    items: (Array.isArray(c.items) ? c.items : []).slice(0, 10).map((i) => ({
      id: id(i.id),
      label: str(i.label, 60),
      treatments: (Array.isArray(i.treatments) ? i.treatments : []).filter((x) => tIds.has(x))
    })).filter((i) => i.id && i.label && !itemIds.has(i.id) && itemIds.add(i.id))
  })).filter((c) => c.id && c.name);

  const temp = Number(input.ai?.temperature);
  const ai = {
    model: str(input.ai?.model, 60).replace(/[^\w.:-]/g, ''),
    temperature: Number.isFinite(temp) ? Math.min(1.5, Math.max(0, temp)) : 0.8,
    systemPrompt: str(input.ai?.systemPrompt, 4000) || defaults.ai.systemPrompt
  };

  return {
    version: 1,
    hospital: {
      name: str(input.hospital?.name, 40) || defaults.hospital.name,
      nameEn: str(input.hospital?.nameEn, 60),
      logoUrl: imageUrl(input.hospital?.logoUrl, defaults.hospital.logoUrl),
      markUrl: imageUrl(input.hospital?.markUrl, defaults.hospital.markUrl)
    },
    naverPlaceUrl: naver,
    texts,
    treatments,
    categories,
    ai
  };
}
