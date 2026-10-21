'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/Icon'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

// Aviso fijo bajo el nav cuando el celu pierde la conexión. La cola de subida
// reintenta sola, así que el mensaje tranquiliza en vez de pedir algo.
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
  if (online) return null

  return (
    <div role="status" className="flex animate-enter items-center justify-center gap-2 bg-accent px-4 py-2.5 text-sm font-semibold text-white">
      <Icon name="wifi-off" className="h-4 w-4 shrink-0" />
      Se te cayó la conexión, lo reintentamos solos
    </div>
  )
}
