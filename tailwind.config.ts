import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FBEDE7',
        surface: '#FFFBF8',
        rose: '#D9A7AC',
        fuchsia: '#C2255C',
        gold: '#C89B3C',
        ink: '#4A2530',
        danger: '#9B2C2C',
        // Pasteles de las tarjetas de misión — separados en matiz a
        // propósito (rosa / dorado-amarillo / malva / durazno) para que
        // se lean como variados, no como dos tonos casi iguales alternando.
        'card-rose': '#F5D5DA',
        'card-gold': '#F3E2A8',
        'card-mauve': '#E6CCE0',
        'card-peach': '#F6D7B8',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
    },
  },
  plugins: [],
}

export default config
