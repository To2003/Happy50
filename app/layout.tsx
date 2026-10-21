import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Anton, DM_Sans, Nothing_You_Could_Do } from 'next/font/google'
import './globals.css'

// Anton: el "HELLO" y el "50" de la invitación, y los títulos de display.
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

// La manuscrita más parecida al "Ine" de la invitación (comparada lado a lado
// con Mansalva, Reenie Beanie y Caveat Brush: trazo fino e inclinado).
const script = Nothing_You_Could_Do({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-script',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

// Evento privado solo para invitados: título neutro, sin descripción ni
// Open Graph/Twitter, así pegar el link en WhatsApp no arma ninguna tarjeta.
// Y fuera de los buscadores (también lo dice app/robots.ts).
export const metadata: Metadata = {
  title: { default: 'Álbum', template: '%s · Álbum' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#FFF0F7',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${anton.variable} ${script.variable} ${dmSans.variable}`}>
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
