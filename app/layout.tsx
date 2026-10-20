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

export const metadata: Metadata = {
  title: '50 años',
  description: 'Álbum colaborativo en vivo del cumpleaños',
}

export const viewport: Viewport = {
  themeColor: '#FAF0EA',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-bg font-body text-ink antialiased">{children}</body>
    </html>
  )
}
