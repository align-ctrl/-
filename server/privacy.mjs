// 자유 입력에서 흔한 개인정보 패턴을 가린다. (AI 전송 전, 데모 생성 전 공통 적용)
const PATTERNS = [
  /\d{6}\s*[-–]\s*[1-4]\d{6}/g, // 주민등록번호
  /01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/g, // 휴대전화
  /0\d{1,2}[\s.-]\d{3,4}[\s.-]\d{4}/g, // 일반전화
  /[\w.+-]+@[\w-]+\.[\w.]+/g, // 이메일
  /(차트|등록)\s*번호\s*[:：]?\s*\d+/g // 차트번호
];
export function maskPersonalInfo(text) {
  let out = String(text || '');
  for (const p of PATTERNS) out = out.replace(p, '[개인정보 삭제]');
  return out;
}
