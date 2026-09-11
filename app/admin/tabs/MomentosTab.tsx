'use client'

import { useEffect, useState } from 'react'
import {
  getMilestonesAction,
  getRecentPhotosForReassignAction,
  reassignByTimeRangeAction,
  reassignPhotoMilestoneAction,
  startMilestoneAction,
} from '../actions'
import { storage } from '@/lib/storage'
import type { Database } from '@/lib/database.types'

type Milestone = Database['public']['Tables']['milestones']['Row']

interface RecentPhoto {
  id: string
  storage_path: string
  taken_at: string
  milestone_id: string | null
  milestone_override_id: string | null
}

function formatTime(iso: string | null): string {
  if (!iso) return 'no arrancó'
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MomentosTab() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [photos, setPhotos] = useState<RecentPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [rangeMilestone, setRangeMilestone] = useState('')
  const [rangeMessage, setRangeMessage] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [milestonesData, photosData] = await Promise.all([
        getMilestonesAction(),
        getRecentPhotosForReassignAction(),
      ])
      setMilestones(milestonesData)
      setPhotos(photosData)
    } catch {
      setLoadError('No se pudo cargar. Puede ser la conexión — probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleStart(milestoneId: string) {
    try {
      await startMilestoneAction(milestoneId)
      await load()
    } catch {
      setRangeMessage('No se pudo arrancar el momento, probá de nuevo.')
    }
  }

  async function handleReassign(photoId: string, milestoneId: string) {
    try {
      await reassignPhotoMilestoneAction(photoId, milestoneId || null)
      await load()
    } catch {
      setRangeMessage('No se pudo reasignar la foto, probá de nuevo.')
    }
  }

  async function handleRangeReassign() {
    if (!rangeFrom || !rangeTo || !rangeMilestone) return
    setRangeMessage(null)
    try {
      const { count } = await reassignByTimeRangeAction(
        new Date(rangeFrom).toISOString(),
        new Date(rangeTo).toISOString(),
        rangeMilestone,
      )
      setRangeMessage(`Reasignadas ${count} fotos.`)
      await load()
    } catch {
      setRangeMessage('No se pudo reasignar el rango, probá de nuevo.')
    }
  }

  if (loading) return <p className="text-neutral-400">Cargando...</p>

  if (loadError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-red-400">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="h-10 rounded-lg bg-pink-600 px-4 text-sm font-bold"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Momentos</h2>
        <ul className="flex flex-col gap-2">
          {milestones.map((milestone) => (
            <li
              key={milestone.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-neutral-900 p-3"
            >
              <div>
                <p className="font-medium">
                  {milestone.emoji} {milestone.name}
                  {milestone.is_prologue && (
                    <span className="ml-2 text-xs text-neutral-500">(prólogo)</span>
                  )}
                </p>
                <p className="text-sm text-neutral-400">{formatTime(milestone.started_at)}</p>
              </div>
              {!milestone.is_prologue && (
                <button
                  type="button"
                  onClick={() => void handleStart(milestone.id)}
                  className="h-10 shrink-0 rounded-lg bg-pink-600 px-4 text-sm font-bold"
                >
                  Arrancar ahora
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Reasignar por rango horario</h2>
        <div className="flex flex-col gap-3 rounded-lg bg-neutral-900 p-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm text-neutral-400">
              Desde
              <input
                type="datetime-local"
                value={rangeFrom}
                onChange={(event) => setRangeFrom(event.target.value)}
                className="h-10 rounded-lg bg-neutral-800 px-3 text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-400">
              Hasta
              <input
                type="datetime-local"
                value={rangeTo}
                onChange={(event) => setRangeTo(event.target.value)}
                className="h-10 rounded-lg bg-neutral-800 px-3 text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-400">
              Momento
              <select
                value={rangeMilestone}
                onChange={(event) => setRangeMilestone(event.target.value)}
                className="h-10 rounded-lg bg-neutral-800 px-3 text-white"
              >
                <option value="">Elegir...</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => void handleRangeReassign()}
            disabled={!rangeFrom || !rangeTo || !rangeMilestone}
            className="h-10 w-fit rounded-lg bg-pink-600 px-4 text-sm font-bold disabled:opacity-40"
          >
            Reasignar rango
          </button>
          {rangeMessage && <p className="text-sm text-neutral-300">{rangeMessage}</p>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Últimas fotos — reasignar individual</h2>
        <ul className="flex flex-col gap-2">
          {photos.map((photo) => (
            <li key={photo.id} className="flex items-center gap-3 rounded-lg bg-neutral-900 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storage.getPublicUrl(photo.storage_path)}
                alt=""
                className="h-14 w-14 shrink-0 rounded object-cover"
              />
              <p className="min-w-0 flex-1 truncate text-sm text-neutral-400">
                {new Date(photo.taken_at).toLocaleString('es-AR')}
              </p>
              <select
                defaultValue={photo.milestone_override_id ?? ''}
                onChange={(event) => void handleReassign(photo.id, event.target.value)}
                className="h-10 shrink-0 rounded-lg bg-neutral-800 px-3 text-sm text-white"
              >
                <option value="">(automático)</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
