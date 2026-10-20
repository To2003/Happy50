'use client'

import { useRef, type AnimationEvent, type CSSProperties } from 'react'

const MAX_STAGGERED = 12
const STEP_MS = 50

export interface StaggerProps {
  className?: string
  style?: CSSProperties
  onAnimationEnd?: (event: AnimationEvent<HTMLElement>) => void
}

// Entrada escalonada solo para la primera tanda que se muestra. Los ids se
// fijan la primera vez que `ready` es true; lo que llegue después (filtros,
// scroll infinito, refrescos) aparece sin animar. Al terminar su animación
// cada ítem sale del set, así un remount posterior tampoco la repite.
export function useInitialStagger(ids: readonly string[], ready: boolean) {
  const pending = useRef<Map<string, number> | null>(null)

  if (pending.current === null && ready) {
    pending.current = new Map(ids.slice(0, MAX_STAGGERED).map((id, i) => [id, i * STEP_MS]))
  }

  return (id: string): StaggerProps => {
    const delay = pending.current?.get(id)
    if (delay === undefined) return {}
    return {
      className: 'animate-enter',
      style: { animationDelay: `${delay}ms` },
      onAnimationEnd: (event) => {
        if (event.target === event.currentTarget) pending.current?.delete(id)
      },
    }
  }
}
