'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logoutAdminAction } from './actions'
import { MomentosTab } from './tabs/MomentosTab'
import { ModeracionTab } from './tabs/ModeracionTab'
import { MisionesTab } from './tabs/MisionesTab'
import { MesasTab } from './tabs/MesasTab'
import { StatsTab } from './tabs/StatsTab'
import { Button, buttonClasses } from '@/components/Button'
import { Icon, type IconName } from '@/components/Icon'

type Tab = 'momentos' | 'moderacion' | 'misiones' | 'mesas' | 'stats'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'momentos', label: 'Momentos', icon: 'clock' },
  { id: 'moderacion', label: 'Moderación', icon: 'shield' },
  { id: 'misiones', label: 'Misiones', icon: 'target' },
  { id: 'mesas', label: 'Mesas', icon: 'users' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
]

// Navegación del admin: barra lateral en escritorio, tabs que scrollean en el
// celu. Mismo estado, dos presentaciones.
export function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('momentos')
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await logoutAdminAction()
    router.refresh()
  }

  const current = TABS.find((t) => t.id === tab) ?? TABS[0]

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 z-20 border-b border-rose bg-bg lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 lg:px-5 lg:pt-8">
          <p className="font-display text-2xl font-semibold text-ink">Admin</p>
          <div className="flex items-center gap-1 lg:hidden">
            <a href="/admin/export" aria-label="Exportar manifiesto" className={buttonClasses('ghost', 'sm', 'w-11 px-0')}>
              <Icon name="download" className="h-5 w-5" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Salir"
              loading={loggingOut}
              onClick={() => void handleLogout()}
              className="w-11 px-0"
            >
              {!loggingOut && <Icon name="logout" className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        <nav aria-label="Secciones del admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pt-4">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-11 shrink-0 items-center gap-2.5 rounded-full px-4 text-sm font-semibold lg:rounded-xl ${
                  active ? 'bg-accent text-white' : 'text-ink/80'
                }`}
              >
                <Icon name={t.icon} className="h-5 w-5" />
                {t.label}
              </button>
            )
          })}
        </nav>
        <div className="hidden flex-col gap-2 px-5 pt-6 lg:flex">
          <a href="/admin/export" className={buttonClasses('secondary', 'sm')}>
            <Icon name="download" className="h-4 w-4" />
            Exportar manifiesto
          </a>
          <Button variant="ghost" size="sm" icon="logout" loading={loggingOut} onClick={() => void handleLogout()}>
            Salir
          </Button>
        </div>
      </aside>

      <main id="contenido" className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-6 lg:px-10 lg:pt-10">
        <h1 className="font-display text-3xl font-semibold text-ink">{current?.label}</h1>
        {tab === 'momentos' && <MomentosTab />}
        {tab === 'moderacion' && <ModeracionTab />}
        {tab === 'misiones' && <MisionesTab />}
        {tab === 'mesas' && <MesasTab />}
        {tab === 'stats' && <StatsTab />}
      </main>
    </div>
  )
}
