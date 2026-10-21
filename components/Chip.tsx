import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'

// Botón de opción (filtro, misión, mesa): seleccionado = fucsia con check.
export function Chip({
  selected,
  onClick,
  className = '',
  children,
}: {
  selected: boolean
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-full px-4 text-base font-semibold ${
        selected ? 'bg-accent text-white' : 'border border-blush bg-surface text-ink'
      } ${className}`}
    >
      {selected && <Icon name="check" className="h-4 w-4 shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  )
}
