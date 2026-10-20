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
  const activeIndex = ITEMS.findIndex((item) => item.href === pathname)

  return (
    <nav className="sticky top-0 z-20 flex border-b border-rose/60 bg-surface/95 backdrop-blur">
      {activeIndex >= 0 && (
        // Cada pantalla monta su propio TopNav, así que no hay posición previa
        // desde la cual deslizar: el indicador crece desde el centro al entrar.
        <span
          aria-hidden
          className="absolute bottom-0 left-0 flex h-1 w-1/3 justify-center"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <span className="h-full w-12 animate-grow rounded-full bg-fuchsia" />
        </span>
      )}
      {ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`press flex flex-1 flex-col items-center gap-1 py-3 text-base font-bold ${
              active ? 'text-fuchsia' : 'text-ink/70'
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
