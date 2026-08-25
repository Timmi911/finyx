/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 通过 CSS 变量映射主题色，支持动态切换
        primary: {
          DEFAULT: 'var(--c-primary)',
          soft: 'var(--c-primary-soft)',
        },
        secondary: { DEFAULT: 'var(--c-secondary)' },
        accent: { DEFAULT: 'var(--c-accent)' },
        success: { DEFAULT: 'var(--c-success)' },
        warn: { 400: 'var(--c-warn)', 500: 'var(--c-warn)' },
        danger: { 400: 'var(--c-danger)', 500: 'var(--c-danger)' },
        // 保留旧色板兼容（深色主题用）
        cyber: {
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
          400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
          800: '#155e75', 900: '#164e63',
        },
        neon: {
          400: '#34d399', 500: '#10b981',
        },
        violet: {
          400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed',
        },
        ink: {
          950: '#070710', 900: '#0a0a14', 850: '#0d0d1a', 800: '#111122',
          750: '#161628', 700: '#1c1c30', 600: '#252540', 500: '#333350',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        'glow-sm': '0 0 12px rgba(236, 72, 153, 0.15)',
        card: 'var(--shadow-card)',
        soft: 'var(--shadow-soft)',
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
