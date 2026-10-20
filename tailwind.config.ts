import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Editorial cálida: crema rosado, texto bordó, un solo acento fucsia
        // profundo y dorado solo en detalles finos (no en texto: 3.2:1).
        bg: '#FAF0EA',
        surface: '#FFFAF6',
        rose: '#E3C4C3',
        fuchsia: '#A3124A',
        gold: '#A88232',
        ink: '#4A1626',
        danger: '#9B2C2C',
        // Pasteles de las tarjetas de misión — separados en matiz a
        // propósito (rosa / dorado-amarillo / malva / durazno) para que
        // se lean como variados, no como dos tonos casi iguales alternando.
        'card-rose': '#F5D5DA',
        'card-gold': '#F3E2A8',
        'card-mauve': '#E6CCE0',
        'card-peach': '#F6D7B8',
      },
      // Sombras tintadas con ink (no gris neutro) para que la profundidad
      // se lea cálida sobre el crema.
      boxShadow: {
        soft: '0 2px 8px -2px rgb(74 37 48 / 0.12), 0 1px 2px rgb(74 37 48 / 0.06)',
        lift: '0 12px 32px -8px rgb(74 37 48 / 0.25), 0 2px 6px rgb(74 37 48 / 0.08)',
      },
      // Movimiento: UI en 150-400ms, ease-out exponencial por defecto.
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
        250: '250ms',
        400: '400ms',
      },
      keyframes: {
        enter: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        grow: {
          from: { opacity: '0', transform: 'scaleX(0.3)' },
          to: { opacity: '1', transform: 'scaleX(1)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      // fill-mode backwards (no both): un transform retenido en <main> volvería
      // containing block a los hijos position:fixed (visor, confetti).
      animation: {
        enter: 'enter 250ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
        page: 'enter 200ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
        grow: 'grow 250ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
        pop: 'pop 300ms cubic-bezier(0.23, 1, 0.32, 1)',
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
