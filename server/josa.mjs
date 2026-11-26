// 한국어 조사 선택 유틸 (받침 유무에 따라 을/를, 으로/로 등)
function lastHangul(word) {
  const s = String(word).trim();
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s.charCodeAt(i);
    if (c >= 0xac00 && c <= 0xd7a3) return c;
    if (/[0-9A-Za-z]/.test(s[i])) return null;
  }
  return null;
}
function jong(word) {
  const c = lastHangul(word);
  if (c == null) return 0;
  return (c - 0xac00) % 28; // 0 = 받침 없음, 8 = ㄹ
}
export function euro(word) {
  const j = jong(word);
  return word + (j === 0 || j === 8 ? '로' : '으로');
}
export function eulReul(word) { return word + (jong(word) === 0 ? '를' : '을'); }
export function iGa(word) { return word + (jong(word) === 0 ? '가' : '이'); }
