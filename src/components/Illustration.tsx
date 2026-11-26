// 심플한 라인 일러스트: 정돈된 치아와 부드러운 아치 (브랜드 네이비/소프트 블루)
export function ToothIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} role="img" aria-label="치아 일러스트">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EEF3F9" />
          <stop offset="1" stopColor="#F7F9FC" />
        </linearGradient>
        <linearGradient id="tooth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EEF2F7" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="92" r="78" fill="url(#bg)" />
      <path d="M44 120 C 70 150, 170 150, 196 120" fill="none" stroke="#CBD6E2" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 7" />
      <g transform="translate(120 88)">
        <path
          d="M-34 -40 C -50 -40 -54 -22 -52 -8 C -50 8 -42 18 -40 34 C -38 48 -34 58 -26 58 C -16 58 -16 40 -12 28 C -9 20 -4 18 0 18 C 4 18 9 20 12 28 C 16 40 16 58 26 58 C 34 58 38 48 40 34 C 42 18 50 8 52 -8 C 54 -22 50 -40 34 -40 C 22 -40 14 -34 0 -34 C -14 -34 -22 -40 -34 -40 Z"
          fill="url(#tooth)" stroke="#243B58" strokeWidth="3" strokeLinejoin="round"
        />
        <path d="M-30 -24 C -36 -18 -38 -8 -36 2" fill="none" stroke="#8299B3" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g fill="#8299B3">
        <path d="M186 44 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" opacity=".9" />
        <path d="M58 54 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" opacity=".6" />
        <circle cx="196" cy="98" r="3" opacity=".5" />
        <circle cx="46" cy="96" r="2.5" opacity=".4" />
      </g>
    </svg>
  );
}
