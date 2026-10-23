import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // /icon/[id] se genera al pedirlo y lee la fuente del disco: sin esto, Vercel
  // no la incluye en la función y el ícono da 500.
  outputFileTracingIncludes: {
    '/icon/**': ['./app/_fonts/Anton-Regular.ttf'],
  },
}

export default nextConfig
