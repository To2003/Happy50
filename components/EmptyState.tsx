import type { ReactNode } from 'react'

// Estados vacíos y de error de invitado: tarjeta con el festón de marca arriba.
// En estas pantallas no hay hero, así que el festón sigue apareciendo una sola vez.
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex animate-enter flex-col overflow-hidden rounded-3xl border border-rose bg-surface text-center">
      <div className="scallop-edge" />
      <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-6">{children}</div>
    </div>
  )
}
