/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#243B58', 600: '#2E4A6E', 700: '#1C2F47', 900: '#152337' },
        soft: { DEFAULT: '#8299B3', 100: '#E6ECF3', 200: '#CBD6E2', 50: '#F1F5F9' },
        mist: '#F5F7FA',
        accent: { DEFAULT: '#3D6A99', 50: '#EEF3F9' },
        ink: { DEFAULT: '#1E2733', 600: '#4A5568', 500: '#6B7686', 400: '#97A1AF' }
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Apple SD Gothic Neo', 'Noto Sans KR', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,35,55,0.04), 0 4px 16px rgba(20,35,55,0.06)',
        lift: '0 8px 28px rgba(36,59,88,0.14)'
      },
      keyframes: {
        inR: { from: { opacity: 0, transform: 'translateX(24px)' }, to: { opacity: 1, transform: 'none' } },
        inL: { from: { opacity: 0, transform: 'translateX(-24px)' }, to: { opacity: 1, transform: 'none' } },
        fadeUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: 0 }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } }
      },
      animation: {
        inR: 'inR .35s cubic-bezier(.2,.8,.2,1) both',
        inL: 'inL .35s cubic-bezier(.2,.8,.2,1) both',
        fadeUp: 'fadeUp .45s cubic-bezier(.2,.8,.2,1) both',
        pop: 'pop .45s cubic-bezier(.2,.8,.2,1) both',
        shimmer: 'shimmer 1.4s linear infinite'
      }
    }
  },
  plugins: []
};
