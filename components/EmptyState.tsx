import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/Icon'

// Estados vacíos y de error de invitado. El festón ya lo pone el PageHeader.
export function EmptyState({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="flex animate-enter flex-col items-center gap-4 rounded-2xl border border-rose bg-surface px-6 py-10 text-center">
      {icon && <Icon name={icon} className="h-8 w-8 text-ink/50" />}
      {children}
    </div>
  )
}
