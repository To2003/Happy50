import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Colores de la paleta (mismos valores que tailwind.config.ts) para las
// imágenes generadas con next/og, que no leen Tailwind.
export const BRAND = {
  bg: '#FAF0EA',
  ink: '#4A1626',
  fuchsia: '#A3124A',
  gold: '#A88232',
} as const

// Subsets de Fraunces y DM Sans (ver app/_fonts/OFL.txt). Se leen en build:
// las imágenes son estáticas.
export async function brandFonts() {
  const dir = join(process.cwd(), 'app/_fonts')
  const [fraunces, dmSans] = await Promise.all([
    readFile(join(dir, 'Fraunces-SemiBold.ttf')),
    readFile(join(dir, 'DMSans-Medium.ttf')),
  ])
  return [
    { name: 'Fraunces', data: fraunces, weight: 600 as const, style: 'normal' as const },
    { name: 'DM Sans', data: dmSans, weight: 500 as const, style: 'normal' as const },
  ]
}

// Ícono: "50" en Fraunces crema sobre fucsia. Lo usan favicon, apple-icon y manifest.
export function IconArt({ size }: { size: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND.fuchsia,
        color: BRAND.bg,
        fontFamily: 'Fraunces',
        fontSize: size * 0.56,
        letterSpacing: '-0.04em',
        paddingBottom: size * 0.04,
      }}
    >
      50
    </div>
  )
}
