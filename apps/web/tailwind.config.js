/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: '#104378',
        gold: '#c0a062',
        c1: '#88aaee',
        c2: '#ff6b6b',
        c3: '#c8f135',
        c4: '#ffa500',
        c5: '#b4d4ff',
      },
      boxShadow: {
        nb: '4px 4px 0px #000000',
        'nb-sm': '2px 2px 0px #000000',
        'nb-lg': '6px 6px 0px #000000',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['Space Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
