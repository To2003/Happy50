'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createMissionAction, deleteMissionAction, getMissionsAction, setMissionActiveAction } from '../actions'
import { unwrap } from '../unwrap'
import { AdminSkeleton, AdminTable } from '../AdminTable'
import type { Database } from '@/lib/database.types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Dialog } from '@/components/Dialog'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Field'
import { useToast } from '@/components/Toast'

type Mission = Database['public']['Tables']['missions']['Row']

export function MisionesTab() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Mission | null>(null)
  const { toast, showToast } = useToast()

  async function load() {
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError('Escribí el título de la misión.')
      return
    }
    if (missions.some((m) => m.title.trim().toLowerCase() === trimmed.toLowerCase())) {
      setTitleError('Ya hay una misión con ese título.')
      return
    }
    setTitleError(null)
    setCreating(true)
    try {
      unwrap(
        await createMissionAction({
          title: trimmed,
          emoji: emoji.trim() || null,
          sortOrder: missions.length + 1,
        }),
      )
      setTitle('')
      setEmoji('')
      await load()
      showToast('Misión agregada')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo crear.', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(mission: Mission) {
    setPendingId(mission.id)
    try {
      unwrap(await setMissionActiveAction(mission.id, !mission.active))
      await load()
    } catch {
      showToast('No se pudo actualizar la misión, probá de nuevo.', 'error')
    } finally {
      setPendingId(null)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setPendingId(toDelete.id)
    try {
      unwrap(await deleteMissionAction(toDelete.id))
      await load()
      showToast('Misión borrada')
      setToDelete(null)
    } catch {
      showToast('No se pudo borrar la misión, probá de nuevo.', 'error')
    } finally {
      setPendingId(null)
    }
  }

  if (loading) return <AdminSkeleton />

  if (error && missions.length === 0) {
    return (
      <EmptyState icon="alert">
        <p className="text-base text-danger">{error}</p>
        <Button icon="retry" onClick={() => void load()}>
          Reintentar
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={handleCreate} noValidate className="flex flex-wrap items-start gap-3">
          <label className="flex w-20 flex-col gap-1.5 text-sm font-semibold text-ink/70">
            Emoji
            <Input value={emoji} onChange={(event) => setEmoji(event.target.value)} className="h-11 px-3" />
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-sm font-semibold text-ink/70">
            Título
            <Input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setTitleError(null)
              }}
              invalid={!!titleError}
              aria-describedby={titleError ? 'mision-titulo-error' : undefined}
              className="h-11 px-3"
            />
            {titleError && (
              <span id="mision-titulo-error" className="font-normal text-danger">
                {titleError}
              </span>
            )}
          </label>
          <Button type="submit" size="sm" icon="plus" loading={creating} className="mt-[1.625rem]">
            Agregar
          </Button>
        </form>
      </Card>

      {missions.length === 0 ? (
        <EmptyState icon="target">
          <p className="text-base text-ink/70">Todavía no hay misiones. Agregá la primera arriba.</p>
        </EmptyState>
      ) : (
        <AdminTable head={['Misión', 'Estado', '']}>
          {missions.map((mission) => (
            <tr key={mission.id}>
              <td className="px-3 py-2 text-base text-ink max-sm:w-full">
                {mission.emoji} {mission.title}
              </td>
              <td className="px-3 py-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={mission.active ? 'eye' : 'eye-off'}
                  loading={pendingId === mission.id && !toDelete}
                  onClick={() => void toggleActive(mission)}
                  aria-pressed={mission.active}
                  className={mission.active ? '' : 'bg-rose/40 text-ink/80'}
                >
                  {mission.active ? 'Activa' : 'Inactiva'}
                </Button>
              </td>
              <td className="px-3 py-2 text-right max-sm:ml-auto">
                <Button variant="ghost" size="sm" icon="trash" onClick={() => setToDelete(mission)} className="text-danger">
                  Borrar
                </Button>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      {toDelete && (
        <Dialog title={`¿Borrar la misión "${toDelete.title}"?`} onClose={() => !pendingId && setToDelete(null)}>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setToDelete(null)} disabled={!!pendingId} className="flex-1 px-4">
              No
            </Button>
            <Button
              variant="danger"
              icon="trash"
              loading={!!pendingId}
              onClick={() => void confirmDelete()}
              className="flex-1 px-4"
            >
              Sí, borrar
            </Button>
          </div>
        </Dialog>
      )}
      {toast}
    </div>
  )
}
