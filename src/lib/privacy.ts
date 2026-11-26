// 자유 입력에 개인정보로 보이는 패턴이 있는지 감지 (안내용). 서버에서도 한 번 더 가립니다.
const PATTERNS: [RegExp, string][] = [
  [/\d{6}\s*[-–]\s*[1-4]\d{6}/, '주민등록번호'],
  [/01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/, '전화번호'],
  [/0\d{1,2}[\s.-]\d{3,4}[\s.-]\d{4}/, '전화번호'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, '이메일'],
  [/(차트|등록)\s*번호/, '차트번호']
];
export function detectPersonalInfo(text: string): string | null {
  for (const [re, name] of PATTERNS) if (re.test(text)) return name;
  return null;
}
