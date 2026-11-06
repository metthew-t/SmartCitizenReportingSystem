/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ── Brand ─────────────────────────────────────────────
        navy:    { DEFAULT: '#0F2942', dark: '#081B30' },
        gov:     { DEFAULT: '#1D70B8', dark: '#0D5C99', light: '#3B82F6' },
        teal:    { DEFAULT: '#0E7490', light: '#06B6D4' },
        emerald: { DEFAULT: '#059669', light: '#10B981' },

        // ── Canvas ────────────────────────────────────────────
        canvas:  { DEFAULT: '#F8FAFC', dark: '#0F172A' },

        // ── Semantic status ───────────────────────────────────
        status: {
          new:      '#3B82F6',
          action:   '#F59E0B',
          progress: '#8B5CF6',
          solved:   '#10B981',
          closed:   '#64748B',
          rejected: '#EF4444',
          appealed: '#EC4899',
        },

        // ── SLA ───────────────────────────────────────────────
        sla: {
          ok:     '#10B981',
          warn:   '#F59E0B',
          breach: '#EF4444',
        },

        // ── Priority ──────────────────────────────────────────
        priority: {
          critical: '#DC2626',
          high:     '#F59E0B',
          medium:   '#3B82F6',
          low:      '#94A3B8',
        },
      },

      borderRadius: {
        card:   '14px',
        button: '10px',
        badge:  '20px',
      },

      boxShadow: {
        card:    '0 2px 12px -3px rgba(15,23,42,0.08), 0 1px 4px -1px rgba(15,23,42,0.04)',
        'card-hover': '0 12px 28px -8px rgba(15,23,42,0.12)',
        modal:   '0 20px 50px -10px rgba(15,23,42,0.18)',
        btn:     '0 4px 14px rgba(29,112,184,0.3)',
        'btn-hover': '0 6px 20px rgba(29,112,184,0.4)',
      },

      fontSize: {
        'display':  ['30px', { lineHeight: '1.2', fontWeight: '800', letterSpacing: '-0.02em' }],
        'h2':       ['21px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.01em' }],
        'h3':       ['16px', { lineHeight: '1.4', fontWeight: '700' }],
        'body':     ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'label':    ['13px', { lineHeight: '1.4', fontWeight: '600' }],
        'micro':    ['11px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '0.05em' }],
        'case-num': ['12px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.02em' }],
      },

      animation: {
        'float': 'float 8s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
    },
  },
  plugins: [],
}
