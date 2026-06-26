/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        accent:        '#4F46E5',
        'accent-light':'#EEF2FF',
        'accent-hover':'#4338CA',

        // Status
        success:        '#10B981',
        'success-light':'#D1FAE5',
        warning:        '#F59E0B',
        'warning-light':'#FEF3C7',
        danger:         '#EF4444',
        'danger-light': '#FEE2E2',
        info:           '#3B82F6',
        'info-light':   '#DBEAFE',

        // Surfaces
        page:    '#F4F6F9',
        surface: '#FFFFFF',
        muted:   '#F8F9FB',

        // Text
        'text-primary':   '#0F172A',
        'text-secondary': '#475569',
        'text-muted':     '#94A3B8',

        // Border
        border: '#E5E8EF',

        // Legacy (keep for any non-dashboard files)
        navy: '#104378',
        gold: '#c0a062',
        c1:   '#88aaee',
        c2:   '#ff6b6b',
        c3:   '#c8f135',
        c4:   '#ffa500',
        c5:   '#b4d4ff',
      },
      boxShadow: {
        sm:  '0 1px 3px 0 rgba(15,23,42,0.06), 0 1px 2px 0 rgba(15,23,42,0.04)',
        DEFAULT: '0 4px 16px 0 rgba(15,23,42,0.08), 0 1px 4px 0 rgba(15,23,42,0.05)',
        lg:  '0 10px 32px 0 rgba(15,23,42,0.10), 0 2px 8px 0 rgba(15,23,42,0.06)',
        // Legacy
        nb:     '4px 4px 0px #000000',
        'nb-sm':'2px 2px 0px #000000',
        'nb-lg':'6px 6px 0px #000000',
      },
      borderRadius: {
        sm:  '6px',
        DEFAULT: '10px',
        lg:  '14px',
        xl:  '18px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['12px', { lineHeight: '16px' }],
        sm:    ['13px', { lineHeight: '20px' }],
        base:  ['14px', { lineHeight: '22px' }],
        md:    ['15px', { lineHeight: '24px' }],
        lg:    ['16px', { lineHeight: '24px' }],
        xl:    ['18px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '32px' }],
        '3xl': ['28px', { lineHeight: '38px' }],
      },
    },
  },
  plugins: [],
};
