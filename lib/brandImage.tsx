import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Colores de la invitación (mismos valores que tailwind.config.ts) para los
// íconos generados con next/og, que no leen Tailwind.
export const BRAND = {
  invite: '#E64741',
  blush: '#FEA3E0',
} as const

// Subset de Anton con los dígitos (ver app/_fonts/OFL.txt). Se lee en build:
// los íconos son estáticos.
export async function brandFonts() {
  const anton = await readFile(join(process.cwd(), 'app/_fonts/Anton-Regular.ttf'))
  return [{ name: 'Anton', data: anton, weight: 400 as const, style: 'normal' as const }]
}

// Ícono: el "50" de la invitación, en Anton rosa sobre el rojo. Lo usan el
// favicon, el apple-icon y el manifest.
export function IconArt({ size }: { size: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND.invite,
        color: BRAND.blush,
        fontFamily: 'Anton',
        fontSize: size * 0.72,
        lineHeight: 1,
        paddingTop: size * 0.04,
      }}
    >
      50
    </div>
  )
}
