'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/Icon'
import { OfflineBanner } from '@/components/OfflineBanner'

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/subir', label: 'Subir', icon: 'camera' },
  { href: '/galeria', label: 'Galería', icon: 'images' },
  { href: '/misiones', label: 'Misiones', icon: 'target' },
]

export function TopNav() {
  const pathname = usePathname()
  const activeIndex = ITEMS.findIndex((item) => item.href === pathname)

  return (
    <div className="sticky top-0 z-20">
      <nav aria-label="Principal" className="relative flex border-b border-rose bg-bg">
        {activeIndex >= 0 && (
          // Cada pantalla monta su propio TopNav, así que no hay posición previa
          // desde la cual deslizar: el indicador crece desde el centro al entrar.
          <span
            aria-hidden
            className="absolute bottom-0 left-0 flex h-1 w-1/3 justify-center"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <span className="h-full w-12 animate-grow rounded-full bg-gold" />
          </span>
        )}
        {ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`press flex flex-1 flex-col items-center gap-1 py-2.5 text-sm font-semibold ${
                active ? 'text-fuchsia' : 'text-ink/70'
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <OfflineBanner />
    </div>
  )
}
