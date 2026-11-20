import type { Config } from 'tailwindcss'

/*
 * CDM 2026 — « feuille de match » / tableau d'affichage.
 * Noir de stade, blanc craie, jaune tableau d'affichage pour les chiffres
 * (points, cotes), rouge des pays hôtes pour l'action et le direct,
 * vert pelouse pour « ouvert » / gagné.
 */
const neutral = {
  50:  '#F6F4EE',
  100: '#F2EFE6',
  200: '#DEDBD1',
  300: '#C6C3B9',
  400: '#A9ADA3',
  500: '#8C9187',
  600: '#4A5049',
  700: '#2E332E',
  800: '#1A1D1A',
  900: '#111311',
  950: '#0B0C0B',
}

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       { DEFAULT: '#111311', 2: '#191C19', 3: '#212521' },
        border:   { DEFAULT: '#2E332E', 2: '#434A43' },
        gold:     { DEFAULT: '#F4C430', dim: 'rgba(244,196,48,.12)', glow: 'rgba(244,196,48,.06)' },
        ink:      { DEFAULT: '#F2EFE6', muted: '#A9ADA3' },
        host:     { red: '#D52B3A', redText: '#FF6B72', green: '#1F9D55', greenText: '#4CC77F', blue: '#2F5BD3' },
        // Les anciennes classes slate/gray suivent la palette neutre du site
        slate:    neutral,
        gray:     neutral,
        amber:    { 300: '#FFD54F', 400: '#F4C430', 500: '#E0B020', 600: '#B88A0C' },
        // « rouge » remplace les anciens accents violets
        rouge: {
          200: '#FFC9CC', 300: '#FF9EA3', 400: '#FF6B72', 500: '#E5404B',
          600: '#D52B3A', 700: '#B01F2D', 800: '#7A1520', 900: '#4A0D14',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Arial Narrow', 'sans-serif'],
        sans:    ['Barlow', 'system-ui', 'sans-serif'],
        mono:    ['"Barlow Semi Condensed"', 'Barlow', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
