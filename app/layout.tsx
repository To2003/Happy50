import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Lilita_One, Nunito } from 'next/font/google'
import './globals.css'

const lilitaOne = Lilita_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '50 años',
  description: 'Álbum colaborativo en vivo del cumpleaños',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${lilitaOne.variable} ${nunito.variable}`}>
      <body className="min-h-screen bg-bg font-body text-ink antialiased">{children}</body>
    </html>
  )
}
