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
