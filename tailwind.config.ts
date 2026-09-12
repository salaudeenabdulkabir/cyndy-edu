import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F9FC',
        surface: '#FFFFFF',
        navy: '#0B1628',
        'navy-2': '#162040',
        gold: '#D4A847',
        'gold-light': '#F0C96E',
        'gold-dim': 'rgba(212,168,71,0.10)',
        'gold-border': 'rgba(212,168,71,0.25)',
        'text-primary': '#0B1628',
        'text-secondary': '#667085',
        border: '#E5E7EB',
        success: '#2E9E6B',
        danger: '#C94040',
        info: '#378ADD',
        warning: '#D4A847',
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '16px',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(11, 22, 40, 0.08)',
      },
    },
  },
  plugins: [],
}

export default config
