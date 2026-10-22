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

  return (
    <div className="sticky top-0 z-20">
      {/* Alto total 4rem (h-12 + py-2): /subir lo descuenta para entrar sin scroll. */}
      <nav aria-label="Principal" className="bg-bg">
        <div className="mx-auto flex max-w-xl gap-2 px-4 py-2">
          {ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`press flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-accent text-sm font-semibold transition-colors ${
                  active ? 'bg-accent text-white' : 'bg-bg text-accent-text'
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
      <OfflineBanner />
    </div>
  )
}
