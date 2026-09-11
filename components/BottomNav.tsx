'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/subir', label: 'Subir', emoji: '📷' },
  { href: '/galeria', label: 'Galería', emoji: '🖼️' },
  { href: '/misiones', label: 'Misiones', emoji: '🎯' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 flex border-t border-neutral-800 bg-neutral-950">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-sm ${
            pathname === item.href ? 'text-pink-500' : 'text-neutral-400'
          }`}
        >
          <span className="text-xl">{item.emoji}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
