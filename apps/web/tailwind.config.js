module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand (Olive Green)
        accent:        '#546B41',
        'accent-light':'#EDF0E4',
        'accent-hover':'#4A5F37',

        // Status
        success:        '#546B41',
        'success-light':'#E0E7CE',
        warning:        '#A9842E',
        'warning-light':'#FFF8EC',
        danger:         '#B4623F',
        'danger-light': '#F1E2D8',
        info:           '#3C4E2D',
        'info-light':   '#EDF0E4',

        // Surfaces
        page:    '#FFF8EC',
        surface: '#FFFFFF',
        muted:   '#EDF0E4',

        // Text
        'text-primary':   '#2F3A22',
        'text-secondary': '#546B41',
        'text-muted':     '#8A9270',

        // Border
        border: '#EADFC8',
      },
      boxShadow: {
        sm:  '0 2px 8px 0 rgba(47,58,34,0.04)',
        DEFAULT: '0 6px 20px 0 rgba(47,58,34,0.07)',
        lg:  '0 12px 36px 0 rgba(47,58,34,0.12)',
      },
      borderRadius: {
        sm:  '8px',
        DEFAULT: '12px',
        lg:  '16px',
        xl:  '20px',
      },
      fontFamily: {
        sans: ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        mono: ["'IBM Plex Mono'", 'monospace'],
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
