'use client'

import { useEffect, useState } from 'react'
import {
  getMilestonesAction,
  getRecentPhotosForReassignAction,
  reassignByTimeRangeAction,
  reassignPhotoMilestoneAction,
  startMilestoneAction,
} from '../actions'
import { unwrap } from '../unwrap'
import { storage } from '@/lib/storage'
import { AdminSkeleton, AdminTable } from '../AdminTable'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Dialog } from '@/components/Dialog'
import { EmptyState } from '@/components/EmptyState'
import { Input, Select } from '@/components/Field'
import { useToast } from '@/components/Toast'
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
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [confirmRange, setConfirmRange] = useState(false)
  const [toStart, setToStart] = useState<Milestone | null>(null)
  // Acción en curso: 'start', 'range' o el id de la foto que se reasigna.
  const [pending, setPending] = useState<string | null>(null)
  const { toast, showToast } = useToast()

  async function load() {
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

  async function handleStart() {
    if (!toStart) return
    setPending('start')
    try {
      unwrap(await startMilestoneAction(toStart.id))
      await load()
      showToast(`Arrancó ${toStart.name}`)
      setToStart(null)
    } catch {
      showToast('No se pudo arrancar el momento, probá de nuevo.', 'error')
    } finally {
      setPending(null)
    }
  }

  async function handleReassign(photoId: string, milestoneId: string) {
    setPending(photoId)
    try {
      unwrap(await reassignPhotoMilestoneAction(photoId, milestoneId || null))
      await load()
      showToast('Foto reasignada')
    } catch {
      showToast('No se pudo reasignar la foto, probá de nuevo.', 'error')
    } finally {
      setPending(null)
    }
  }

  function askRangeReassign() {
    if (!rangeFrom || !rangeTo || !rangeMilestone) {
      setRangeError('Completá desde, hasta y el momento.')
      return
    }
    if (new Date(rangeFrom) >= new Date(rangeTo)) {
      setRangeError('"Desde" tiene que ser antes que "Hasta".')
      return
    }
    setRangeError(null)
    setConfirmRange(true)
  }

  async function handleRangeReassign() {
    setPending('range')
    try {
      const { count } = unwrap(
        await reassignByTimeRangeAction(
          new Date(rangeFrom).toISOString(),
          new Date(rangeTo).toISOString(),
          rangeMilestone,
        ),
      )
      showToast(`Reasignadas ${count} fotos.`)
      setConfirmRange(false)
      await load()
    } catch {
      showToast('No se pudo reasignar el rango, probá de nuevo.', 'error')
    } finally {
      setPending(null)
    }
  }

  if (loading) return <AdminSkeleton />

  if (loadError) {
    return (
      <EmptyState icon="alert">
        <p className="text-base text-danger">{loadError}</p>
        <Button icon="retry" onClick={() => void load()}>
          Reintentar
        </Button>
      </EmptyState>
    )
  }

  const rangeMilestoneName = milestones.find((m) => m.id === rangeMilestone)?.name

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Momentos</h2>
        {milestones.length === 0 ? (
          <EmptyState icon="clock">
            <p className="text-base text-ink/70">Todavía no hay momentos cargados.</p>
          </EmptyState>
        ) : (
          <AdminTable head={['Momento', 'Arrancó', '']}>
            {milestones.map((milestone) => (
              <tr key={milestone.id}>
                <td className="px-3 py-2 text-base font-semibold text-ink">
                  {milestone.emoji} {milestone.name}
                  {milestone.is_prologue && <span className="ml-2 text-sm font-normal text-ink/70">(prólogo)</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink/70">{formatTime(milestone.started_at)}</td>
                <td className="px-3 py-2 text-right">
                  {!milestone.is_prologue && (
                    <Button size="sm" icon="play" onClick={() => setToStart(milestone)}>
                      Arrancar ahora
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Reasignar por rango horario</h2>
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink/70">
              Desde
              <Input
                type="datetime-local"
                value={rangeFrom}
                onChange={(event) => {
                  setRangeFrom(event.target.value)
                  setRangeError(null)
                }}
                invalid={!!rangeError}
                className="h-11 px-3"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink/70">
              Hasta
              <Input
                type="datetime-local"
                value={rangeTo}
                onChange={(event) => {
                  setRangeTo(event.target.value)
                  setRangeError(null)
                }}
                invalid={!!rangeError}
                className="h-11 px-3"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink/70">
              Momento
              <Select
                value={rangeMilestone}
                onChange={(event) => {
                  setRangeMilestone(event.target.value)
                  setRangeError(null)
                }}
                className="h-11 rounded-2xl"
              >
                <option value="">Elegir…</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          {rangeError && (
            <p role="alert" className="text-sm text-danger">
              {rangeError}
            </p>
          )}
          <Button size="sm" onClick={askRangeReassign} className="w-fit">
            Reasignar rango
          </Button>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Últimas fotos — reasignar individual</h2>
        {photos.length === 0 ? (
          <EmptyState icon="images">
            <p className="text-base text-ink/70">Todavía no hay fotos.</p>
          </EmptyState>
        ) : (
          <AdminTable head={['Foto', 'Sacada', 'Momento']}>
            {photos.map((photo) => (
              <tr key={photo.id}>
                <td className="px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storage.getPublicUrl(photo.storage_path)}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink/70">
                  {new Date(photo.taken_at).toLocaleString('es-AR')}
                </td>
                <td className="px-3 py-2">
                  <Select
                    defaultValue={photo.milestone_override_id ?? ''}
                    disabled={pending === photo.id}
                    aria-label="Momento de la foto"
                    onChange={(event) => void handleReassign(photo.id, event.target.value)}
                    className="h-11 w-full min-w-[9rem] rounded-2xl text-sm"
                  >
                    <option value="">(automático)</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>

      {toStart && (
        <Dialog
          title={`¿Arrancar ${toStart.name} ahora? Las fotos nuevas van a caer en este momento.`}
          onClose={() => pending !== 'start' && setToStart(null)}
        >
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setToStart(null)} disabled={pending === 'start'} className="flex-1 px-4">
              No
            </Button>
            <Button icon="play" loading={pending === 'start'} onClick={() => void handleStart()} className="flex-1 px-4">
              Arrancar ahora
            </Button>
          </div>
        </Dialog>
      )}

      {confirmRange && (
        <Dialog
          title={`¿Pasar a ${rangeMilestoneName ?? 'ese momento'} todas las fotos de ese rango?`}
          onClose={() => pending !== 'range' && setConfirmRange(false)}
        >
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmRange(false)} disabled={pending === 'range'} className="flex-1 px-4">
              No
            </Button>
            <Button loading={pending === 'range'} onClick={() => void handleRangeReassign()} className="flex-1 px-4">
              Reasignar rango
            </Button>
          </div>
        </Dialog>
      )}
      {toast}
    </div>
  )
}
