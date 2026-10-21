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
        <h1 className="min-w-0 text-balance break-words font-display text-4xl uppercase leading-none text-accent">{title}</h1>
        {aside}
      </div>
      {children}
      <div className="scallop-edge mt-3" />
    </header>
  )
}
