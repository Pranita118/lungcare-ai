/**
 * LungCare AI design tokens.
 *
 * Strategy: neutrals (surfaces, borders, text) and the pale *tint* shades are CSS
 * custom properties so they can change between light and dark. The saturated
 * brand and status hues stay literal hex, because they must render identically in
 * both themes — a green risk band must never look like a different green at night
 * — and because that keeps every existing slash-opacity modifier working.
 */
import type { Config } from 'tailwindcss'
import translucentSurface from './tailwind.plugin'

/** Literal hex: identical in both themes. */
const BRAND = {
  medical: {
    200: '#acd3f5',
    300: '#79b6ec',
    400: '#4795de',
    500: '#0b5cad',
    600: '#0a4f96',
    700: '#093f78',
    800: '#0b3259',
    900: '#12304a',
  },
  teal: {
    200: '#93d8d9',
    300: '#57bdbf',
    400: '#2aa0a2',
    500: '#0f8b8d',
    600: '#0c7173',
    700: '#0a5a5c',
    800: '#084345',
    900: '#063234',
  },
  success: '#2e8b70',
  warning: '#d99a2b',
  danger: '#d95c5c',
} as const

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Themed tints
        medical: { 50: 'var(--medical-50)', 100: 'var(--medical-100)', ...BRAND.medical },
        teal: { 50: 'var(--teal-50)', 100: 'var(--teal-100)', ...BRAND.teal },

        success: BRAND.success,
        warning: BRAND.warning,
        danger: BRAND.danger,

        /** Readable ink for each status colour, theme-aware for contrast. */
        'success-ink': 'var(--success-ink)',
        'warning-ink': 'var(--warning-ink)',
        'danger-ink': 'var(--danger-ink)',

        /** Pre-mixed status tints, replacing tinted-colour plus opacity classes. */
        'tint-medical': 'var(--tint-medical)',
        'tint-teal': 'var(--tint-teal)',
        'tint-warning': 'var(--tint-warning)',
        'tint-danger': 'var(--tint-danger)',
        'tint-success': 'var(--tint-success)',

        // Themed neutrals
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        'surface-subtle': 'var(--surface-subtle)',
        'surface-muted': 'var(--surface-muted)',
        hairline: 'var(--hairline)',
        'hairline-strong': 'var(--hairline-strong)',
        track: 'var(--track)',
        viewer: 'var(--viewer)',
        /** Card gradient stops (pale blue -> pale teal in light, deep in dark). */
        'sheen-from': 'var(--sheen-from)',
        'sheen-to': 'var(--sheen-to)',
        /** Loading placeholder fill. */
        shimmer: 'var(--shimmer)',
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          muted: 'var(--ink-muted)',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Manrope Variable', 'Manrope', 'Inter Variable', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        input: '11px',
        button: '11px',
        card: '16px',
        panel: '20px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        panel: 'var(--shadow-panel)',
        inset: 'inset 0 1px 2px rgba(18, 48, 74, 0.05)',
        focus: '0 0 0 4px rgba(11, 92, 173, 0.14)',
        header: '0 1px 2px rgba(18, 48, 74, 0.05)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
        'glow-medical': 'var(--glow)',
        'header-sheen': 'linear-gradient(180deg, var(--surface) 0%, var(--surface-subtle) 100%)',
        'hero-sheen': 'linear-gradient(135deg, var(--hero-a) 0%, var(--hero-b) 100%)',
      },
      backgroundSize: {
        grid: '28px 28px',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(14px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.86)' },
        },
        breathe: { '0%, 100%': { opacity: '0.5' }, '50%': { opacity: '0.9' } },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
        breathe: 'breathe 3.6s ease-in-out infinite',
      },
    },
  },
  plugins: [translucentSurface],
}

export default config
