'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'

// Pila de capas abiertas: Escape cierra solo la de arriba (un Dialog sobre un visor).
const openLayers: object[] = []

// Escape cierra, el scroll de fondo se bloquea y el foco vuelve a donde estaba.
// Lo usan el Dialog y los visores de foto a pantalla completa.
export function useDialogBehavior(onClose: () => void) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const layer = {}
    openLayers.push(layer)

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && openLayers[openLayers.length - 1] === layer) closeRef.current()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      openLayers.splice(openLayers.indexOf(layer), 1)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])
}

// Diálogo de confirmación: panel centrado sobre un velo bordó.
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogBehavior(onClose)

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overscroll-contain bg-ink/70 p-4 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-sm animate-enter flex-col gap-6 rounded-3xl bg-surface p-6 text-ink shadow-lift"
      >
        <h2 id={titleId} className="text-balance font-display text-xl font-semibold leading-snug">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
