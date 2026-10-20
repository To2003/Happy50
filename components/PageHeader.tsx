import type { ReactNode } from 'react'

// Título de pantalla de invitado: H1 en Fraunces, dato opcional a la derecha,
// bajada opcional y el festón de marca debajo (una vez por pantalla).
export function PageHeader({
  title,
  aside,
  children,
}: {
  title: ReactNode
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-balance font-display text-4xl font-semibold leading-none text-ink">{title}</h1>
        {aside}
      </div>
      {children}
      <div className="scallop-edge mt-3" />
    </header>
  )
}
