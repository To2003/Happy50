'use client'

import { useEffect, useState } from 'react'
import { createMissionAction, deleteMissionAction, getMissionsAction, setMissionActiveAction } from '../actions'
import type { Database } from '@/lib/database.types'

type Mission = Database['public']['Tables']['missions']['Row']

export function MisionesTab() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setMissions(await getMissionsAction())
      setError(null)
    } catch {
      setError('No se pudo cargar. Puede ser la conexión — probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate() {
    if (!title.trim()) return
    setError(null)
    try {
      await createMissionAction({
        title: title.trim(),
        emoji: emoji.trim() || null,
        sortOrder: missions.length + 1,
      })
      setTitle('')
      setEmoji('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear.')
    }
  }

  async function toggleActive(mission: Mission) {
    try {
      await setMissionActiveAction(mission.id, !mission.active)
      await load()
    } catch {
      setError('No se pudo actualizar la misión, probá de nuevo.')
    }
  }

  async function handleDelete(missionId: string) {
    try {
      await deleteMissionAction(missionId)
      await load()
    } catch {
      setError('No se pudo borrar la misión, probá de nuevo.')
    }
  }

  if (loading) return <p className="text-ink/70">Cargando...</p>

  if (error && missions.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-danger">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="h-11 rounded-lg bg-fuchsia text-white px-4 text-sm font-bold"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-ink/70">
          Emoji
          <input
            value={emoji}
            onChange={(event) => setEmoji(event.target.value)}
            className="h-11 w-16 rounded-lg bg-rose/20 px-3 text-ink"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-ink/70">
          Título
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 rounded-lg bg-rose/20 px-3 text-ink"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!title.trim()}
          className="h-11 rounded-lg bg-fuchsia text-white px-4 text-sm font-bold disabled:opacity-40"
        >
          Agregar
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      <ul className="flex flex-col gap-2">
        {missions.map((mission) => (
          <li key={mission.id} className="flex items-center gap-3 rounded-lg bg-surface p-3">
            <p className="flex-1">
              {mission.emoji} {mission.title}
            </p>
            <button
              type="button"
              onClick={() => void toggleActive(mission)}
              className={`h-11 rounded-lg px-3 text-sm font-medium ${
                mission.active ? 'bg-rose/20' : 'bg-rose/40 text-ink/80'
              }`}
            >
              {mission.active ? 'Activa' : 'Inactiva'}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(mission.id)}
              className="h-11 rounded-lg bg-danger text-white px-3 text-sm font-medium"
            >
              Borrar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
