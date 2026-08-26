import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#f5f4f0',
          dark: '#0d0e14',
        },
        panel: {
          DEFAULT: '#eeede8',
          dark: '#141520',
        },
        panel2: {
          DEFAULT: '#e5e4de',
          dark: '#1a1b28',
        },
        border: {
          DEFAULT: '#d4d2cb',
          dark: '#22243a',
        },
        accent: {
          DEFAULT: '#c9883a',
          hover: '#b5762d',
          muted: '#c9883a26',
        },
        danger: {
          DEFAULT: '#c0392b',
          muted: '#c0392b20',
        },
        warning: {
          DEFAULT: '#b7810a',
          muted: '#b7810a20',
        },
        success: {
          DEFAULT: '#1a7a45',
          muted: '#1a7a4520',
        },
        info: {
          DEFAULT: '#2255a4',
          muted: '#2255a420',
        },
        ink: {
          DEFAULT: '#1c1b18',
          muted: '#6b6960',
          faint: '#9c9a93',
        },
        'ink-dark': {
          DEFAULT: '#e8e6df',
          muted: '#9c9a93',
          faint: '#4a4c5e',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-once': 'pulseOnce 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        pulseOnce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
