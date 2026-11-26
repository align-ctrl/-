import {
  MessagesSquare, ScanSearch, Sparkles, CalendarCheck, Wrench, Stethoscope, ShieldCheck, Ellipsis,
  UserRound, HeartHandshake, MessageCircle, Building2, ClipboardCheck, Clock, Smile, Star, Syringe, Camera, User,
  type LucideIcon
} from 'lucide-react';

// 서버 server/icons.mjs 의 ICON_KEYS 와 동일한 키를 유지하세요.
export const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  messages: { icon: MessagesSquare, label: '상담' },
  scan: { icon: ScanSearch, label: '검사' },
  sparkles: { icon: Sparkles, label: '반짝임' },
  calendar: { icon: CalendarCheck, label: '일정' },
  wrench: { icon: Wrench, label: '조정·수리' },
  stethoscope: { icon: Stethoscope, label: '진료' },
  shield: { icon: ShieldCheck, label: '점검' },
  more: { icon: Ellipsis, label: '기타' },
  doctor: { icon: UserRound, label: '의료진' },
  heart: { icon: HeartHandshake, label: '친절' },
  chat: { icon: MessageCircle, label: '대화' },
  building: { icon: Building2, label: '병원' },
  clipboard: { icon: ClipboardCheck, label: '관리' },
  clock: { icon: Clock, label: '시간' },
  smile: { icon: Smile, label: '미소' },
  star: { icon: Star, label: '별' },
  syringe: { icon: Syringe, label: '처치' },
  camera: { icon: Camera, label: '촬영' },
  user: { icon: User, label: '사람' }
};
export function Icon({ name, className }: { name: string; className?: string }) {
  const I = (ICONS[name] || ICONS.more).icon;
  return <I className={className} strokeWidth={1.75} aria-hidden />;
}
