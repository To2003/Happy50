import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta de la invitación (medida sobre la imagen). Contrastes en
        // docs/NOCHE.md: `invite` y `blush` nunca van en texto chico.
        // Fondo rosa claro (siempre más claro que blush) y superficies un tono arriba.
        bg: '#FFE0F1',
        surface: '#FFF0F7',
        // Rojo de relleno: botones con texto blanco, bordes, activo, festón.
        accent: '#C8302B',
        // Rojo de TODO texto rojo: accent sobre bg no llega a 4.5:1 (4,39).
        'accent-text': '#B92A27',
        // Rojo de la invitación: superficies grandes y texto blanco de 24px o más.
        invite: '#E64741',
        // Rosa de la invitación: solo decorativo (letras gigantes, chips, progreso).
        blush: '#FEA3E0',
        rose: '#F5C6DA',
        ink: '#4A1626',
        muted: '#7A4D5A',
        danger: '#9B2C2C',
        // Tonos de las tarjetas de misión: tintes suaves, todos más claros que bg.
        'card-rose': '#FFF0F7',
        'card-gold': '#FFEEEA',
        'card-mauve': '#FFF6FB',
        'card-peach': '#FFF4EE',
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
        pop: 'pop 300ms cubic-bezier(0.23, 1, 0.32, 1)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        script: ['var(--font-script)'],
        body: ['var(--font-body)'],
      },
    },
  },
  plugins: [],
}

export default config
