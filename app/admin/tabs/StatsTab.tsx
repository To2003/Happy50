'use client'

import { useEffect, useState } from 'react'
import { getStatsAction, type AdminStats } from '../actions'
import { storage } from '@/lib/storage'

export function StatsTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setError(null)
    getStatsAction()
      .then(setStats)
      .catch(() => setError('No se pudieron cargar las stats. Puede ser la conexión — probá de nuevo.'))
  }

  useEffect(() => {
    load()
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-red-400">{error}</p>
        <button type="button" onClick={load} className="h-10 rounded-lg bg-pink-600 px-4 text-sm font-bold">
          Reintentar
        </button>
      </div>
    )
  }

  if (!stats) return <p className="text-neutral-400">Cargando...</p>

  const maxHourCount = Math.max(1, ...stats.photosByHour.map((h) => h.count))

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-4xl font-bold">{stats.totalPhotos}</p>
        <p className="text-neutral-400">fotos en total</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Fotos por hora</h2>
        <div className="flex flex-col gap-1">
          {stats.photosByHour.map((h) => (
            <div key={h.hour} className="flex items-center gap-2 text-sm">
              <span className="w-32 shrink-0 text-neutral-400">
                {new Date(h.hour).toLocaleString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                })}
              </span>
              <div className="h-4 rounded bg-pink-600" style={{ width: `${(h.count / maxHourCount) * 200}px` }} />
              <span>{h.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Top uploaders</h2>
        <ol className="flex flex-col gap-1">
          {stats.topUploaders.map((u, i) => (
            <li key={i} className="text-sm text-neutral-300">
              {i + 1}. {u.name} — {u.count} fotos
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Top votadas</h2>
        <div className="grid grid-cols-3 gap-2">
          {stats.topVoted.map((photo) => (
            <div key={photo.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storage.getPublicUrl(photo.thumb_path)}
                alt=""
                className="aspect-square w-full rounded-lg object-cover"
              />
              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-2 py-0.5 text-xs">
                ❤️ {photo.hearts}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
