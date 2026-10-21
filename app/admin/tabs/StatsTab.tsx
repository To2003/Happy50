'use client'

import { useEffect, useState } from 'react'
import { getStatsAction, type AdminStats } from '../actions'
import { AdminSkeleton } from '../AdminTable'
import { storage } from '@/lib/storage'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'

function hourLabel(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', hourCycle: 'h23' })
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-ink/70">{label}</p>
      <p className="font-display text-4xl tabular-nums text-accent">{value}</p>
      {detail && <p className="text-sm text-ink/70">{detail}</p>}
    </Card>
  )
}

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
      <EmptyState icon="alert">
        <p className="text-base text-danger">{error}</p>
        <Button icon="retry" onClick={load}>
          Reintentar
        </Button>
      </EmptyState>
    )
  }

  if (!stats) return <AdminSkeleton />

  // Todo sale de lo que ya trae getStatsAction: no hay consultas nuevas.
  const peak = stats.photosByHour.reduce<AdminStats['photosByHour'][number] | null>(
    (best, h) => (!best || h.count > best.count ? h : best),
    null,
  )
  const maxHourCount = Math.max(1, ...stats.photosByHour.map((h) => h.count))
  const mostHearts = stats.topVoted[0]?.hearts ?? 0

  return (
    <div className="flex flex-col gap-10">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Fotos en total" value={String(stats.totalPhotos)} />
        <StatTile
          label="Hora pico"
          value={peak ? String(peak.count) : '—'}
          detail={peak ? `fotos el ${hourLabel(peak.hour)} h` : undefined}
        />
        <StatTile label="La más votada" value={String(mostHearts)} detail="corazones" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-accent">Fotos por hora</h2>
        {stats.photosByHour.length === 0 ? (
          <EmptyState icon="chart">
            <p className="text-base text-ink/70">Todavía no hay fotos.</p>
          </EmptyState>
        ) : (
          <Card>
            <ul className="flex flex-col gap-2">
              {stats.photosByHour.map((h) => (
                <li
                  key={h.hour}
                  title={`${hourLabel(h.hour)} h: ${h.count} fotos`}
                  className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm"
                >
                  <span className="tabular-nums text-ink/70">{hourLabel(h.hour)} h</span>
                  {/* Ancho estático (no animado): así la punta redondeada no se deforma. */}
                  <span className="h-3">
                    <span
                      className="block h-full min-w-1 rounded-r bg-accent"
                      style={{ width: `${(h.count / maxHourCount) * 100}%` }}
                    />
                  </span>
                  <span className="text-right font-semibold tabular-nums text-ink">{h.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <div className="grid gap-10 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl text-accent">Top uploaders</h2>
          {stats.topUploaders.length === 0 ? (
            <p className="text-base text-ink/70">Todavía no hay fotos.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-rose rounded-2xl border border-rose bg-surface">
              {stats.topUploaders.map((u, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-base">
                  <span className="text-ink">
                    <span className="mr-2 tabular-nums text-ink/70">{i + 1}.</span>
                    {u.name}
                  </span>
                  <span className="tabular-nums text-ink/80">{u.count} fotos</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl text-accent">Top votadas</h2>
          {stats.topVoted.length === 0 ? (
            <p className="text-base text-ink/70">Todavía no hay fotos.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {stats.topVoted.map((photo) => (
                <div key={photo.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storage.getPublicUrl(photo.thumb_path)}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                    <Icon name="heart" filled className="h-3 w-3 text-blush" />
                    {photo.hearts}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
