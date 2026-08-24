/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#635BFF',
          hover: '#5148E5',
          light: '#EEEDFF',
          50: '#F5F4FF',
          100: '#EEEDFF',
          600: '#635BFF',
          700: '#5148E5',
        },
        surface: '#FFFFFF',
        canvas: '#F8FAFC',
        border: '#E2E8F0',
        ink: '#0F172A',
        muted: '#64748B',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#EF4444',
        dark: {
          canvas: '#0B1020',
          surface: '#12172A',
          border: '#232A42',
          ink: '#EEF1F8',
          muted: '#8B93AC',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)',
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)',
        popover: '0 8px 24px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        rise: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(24px, -18px) scale(1.08)' },
          '66%': { transform: 'translate(-16px, 14px) scale(0.94)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        popIn: {
          from: { opacity: 0, transform: 'scale(0.9)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        rise: 'rise 0.28s cubic-bezier(0.16,1,0.3,1)',
        pulseSoft: 'pulseSoft 1.6s ease-in-out infinite',
        blob: 'blob 9s ease-in-out infinite',
        float: 'float 4.5s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        popIn: 'popIn 0.2s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};
