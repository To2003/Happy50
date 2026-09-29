'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/subir', label: 'Subir', emoji: '📷' },
  { href: '/galeria', label: 'Galería', emoji: '🖼️' },
  { href: '/misiones', label: 'Misiones', emoji: '🎯' },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-20 flex border-b border-rose/60 bg-surface/95 backdrop-blur">
      {ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-base font-bold transition-colors ${
              active ? 'text-fuchsia' : 'text-ink/60'
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {item.emoji}
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
