'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logoutAdminAction } from './actions'
import { MomentosTab } from './tabs/MomentosTab'
import { ModeracionTab } from './tabs/ModeracionTab'
import { MisionesTab } from './tabs/MisionesTab'
import { MesasTab } from './tabs/MesasTab'
import { StatsTab } from './tabs/StatsTab'

type Tab = 'momentos' | 'moderacion' | 'misiones' | 'mesas' | 'stats'

const TABS: { id: Tab; label: string }[] = [
  { id: 'momentos', label: 'Momentos' },
  { id: 'moderacion', label: 'Moderación' },
  { id: 'misiones', label: 'Misiones' },
  { id: 'mesas', label: 'Mesas' },
  { id: 'stats', label: 'Stats' },
]

export function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('momentos')

  async function handleLogout() {
    await logoutAdminAction()
    router.refresh()
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex items-center gap-3">
          <a
            href="/admin/export"
            className="flex h-10 items-center rounded-lg bg-neutral-900 px-4 text-sm font-medium"
          >
            Exportar manifiesto
          </a>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`h-10 rounded-lg px-4 text-sm font-medium ${
              tab === t.id ? 'bg-pink-600' : 'bg-neutral-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'momentos' && <MomentosTab />}
      {tab === 'moderacion' && <ModeracionTab />}
      {tab === 'misiones' && <MisionesTab />}
      {tab === 'mesas' && <MesasTab />}
      {tab === 'stats' && <StatsTab />}
    </main>
  )
}
