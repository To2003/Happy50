import { ImageResponse } from 'next/og'
import { BRAND, brandFonts } from '@/lib/brandImage'

export const alt = '50 años'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// La tarjeta que se ve al compartir el link: el "50" de la home, el festón
// dorado y la bajada de la home.
export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BRAND.bg,
          padding: '64px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
          <div
            style={{
              fontFamily: 'Fraunces',
              fontSize: 300,
              lineHeight: 0.8,
              letterSpacing: '-0.05em',
              color: BRAND.fuchsia,
            }}
          >
            50
          </div>
          <div style={{ fontFamily: 'Fraunces', fontSize: 96, lineHeight: 1, color: BRAND.ink }}>años</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'flex' }}>
            {Array.from({ length: 65 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 16,
                  height: 8,
                  border: `2px solid ${BRAND.gold}`,
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                }}
              />
            ))}
          </div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 38, color: BRAND.ink }}>
            Sumate a la fiesta y compartí tus fotos de la noche.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await brandFonts() },
  )
}
