import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       { DEFAULT: '#07101E', 2: '#0D1A2E', 3: '#122038' },
        border:   { DEFAULT: '#1A2F4A', 2: '#243D5C' },
        gold:     { DEFAULT: '#F0B429', dim: 'rgba(240,180,41,.12)', glow: 'rgba(240,180,41,.06)' },
        ink:      { DEFAULT: '#D8E6F3', muted: '#4A6280' },
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        sans:    ['Figtree', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'stripes': "repeating-linear-gradient(-55deg, transparent, transparent 40px, rgba(255,255,255,.018) 40px, rgba(255,255,255,.019) 41px)",
        'gold-gradient': 'linear-gradient(135deg, #F0B429 0%, #FFD97D 50%, #F0B429 100%)',
      },
    },
  },
  plugins: [],
}

export default config
