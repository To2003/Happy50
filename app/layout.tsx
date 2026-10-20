import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { DM_Sans, Fraunces } from 'next/font/google'
import './globals.css'

// Variables: wght va siempre; de los ejes extra solo SOFT (sin opsz ni WONK).
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

export const metadata: Metadata = {
  // Para que la imagen Open Graph salga con URL absoluta al compartir el link.
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: '50 años', template: '%s · 50 años' },
  description: 'Álbum colaborativo en vivo del cumpleaños',
  // Evento privado: fuera de los buscadores (también lo dice app/robots.ts).
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#FAF0EA',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-bg font-body text-ink antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-base focus:font-semibold focus:text-white"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  )
}
