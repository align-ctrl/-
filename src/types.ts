export type ReviewStyle = 'casual' | 'concise' | 'detailed';
export const REVIEW_STYLES: ReviewStyle[] = ['casual', 'concise', 'detailed'];
export const STYLE_META: Record<ReviewStyle, { name: string; desc: string }> = {
  casual: { name: '자연스러운 일상형', desc: '편하게 이야기하듯' },
  concise: { name: '간결한 후기형', desc: '핵심만 짧게' },
  detailed: { name: '자세한 경험 공유형', desc: '경험을 차근차근' }
};

export interface Treatment {
  id: string;
  label: string;
  description: string;
  icon: string;
  promptLabel: string;
  enabled: boolean;
}
export interface SatisfactionItem {
  id: string;
  label: string;
  treatments: string[]; // 비어 있으면 모든 진료 유형에서 노출
}
export interface Category {
  id: string;
  name: string;
  icon: string;
  lead: string;
  items: SatisfactionItem[];
}
export interface Texts {
  homeTitle: string;
  homeSubtitle: string;
  homeGuide: string;
  homeNotice: string;
  estimatedTime: string;
  treatmentQuestion: string;
  treatmentHelp: string;
  experienceQuestion: string;
  experienceHelp: string;
  commentQuestion: string;
  commentHelp: string;
  commentPrivacy: string;
  commentExamples: string[];
  doneTitle: string;
  doneSubtitle: string;
}
export interface Hospital {
  name: string;
  nameEn: string;
  logoUrl: string;
  markUrl: string;
}
export interface PublicConfig {
  hospital: Hospital;
  naverPlaceUrl: string;
  texts: Texts;
  treatments: Treatment[];
  categories: Category[];
  mode: 'ai' | 'demo';
}
export interface FullConfig extends Omit<PublicConfig, 'mode'> {
  version: number;
  ai: { model: string; temperature: number; systemPrompt: string };
}

export interface ReviewDraft {
  text: string;
  original: string;
  edited: boolean;
}
export interface Draft {
  step: number; // 0 메인, 1 진료유형, 2 만족항목, 3 추가의견, 4 생성중, 5 확인·수정, 6 완료
  treatmentId: string | null;
  itemIds: string[];
  comment: string;
  reviews: Partial<Record<ReviewStyle, ReviewDraft>>;
  mode: 'ai' | 'demo' | null;
  chosen: ReviewStyle | null;
  inputsKey: string | null;
}
export const emptyDraft = (): Draft => ({
  step: 0,
  treatmentId: null,
  itemIds: [],
  comment: '',
  reviews: {},
  mode: null,
  chosen: null,
  inputsKey: null
});
