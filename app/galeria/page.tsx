'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { storage } from '@/lib/storage'
import { findExistingGuest, type Guest } from '@/lib/guest'
import { listActiveMissions, type Mission } from '@/lib/missions'
import { deleteOwnPhoto } from '@/lib/photos'
import { addHeart, hasHearted, removeHeart } from '@/lib/hearts'
import type { Database } from '@/lib/database.types'
import { TopNav } from '@/components/TopNav'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { Select } from '@/components/Field'
import { Dialog, useDialogBehavior } from '@/components/Dialog'
import { PageHeader } from '@/components/PageHeader'
import { CreditFooter } from '@/components/CreditFooter'
import { Skeleton } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'
import { useInitialStagger, type StaggerProps } from '@/lib/useInitialStagger'
import { morphClose, morphOpen } from '@/lib/viewTransition'
import { useSharePhoto } from '@/lib/useSharePhoto'

type Photo = Database['public']['Views']['photos_with_effective_milestone']['Row']
type PartyTable = Database['public']['Tables']['party_tables']['Row']

const PAGE_SIZE = 30

interface Filters {
  missionId: string | null
  milestoneId: string | null
  tableId: string | null
  onlyMine: boolean
}

const EMPTY_FILTERS: Filters = {
  missionId: null,
  milestoneId: null,
  tableId: null,
  onlyMine: false,
}

function GridThumb({
  photo,
  onOpen,
  stagger,
}: {
  photo: Photo
  onOpen: (el: HTMLElement) => void
  stagger: StaggerProps
}) {
  const url = storage.getPublicUrl(photo.thumb_path)
  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      style={stagger.style}
      onAnimationEnd={stagger.onAnimationEnd}
      className={`relative aspect-square overflow-hidden rounded-xl ${stagger.className ?? ''}`}
    >
      {/* Placeholder de carga: la foto lo tapa apenas llega. */}
      <span aria-hidden className="absolute inset-0 animate-pulse bg-rose/30" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={photo.caption ?? ''}
        loading="lazy"
        decoding="async"
        className="relative h-full w-full object-cover"
      />
    </button>
  )
}

function Viewer({
  photo,
  guest,
  onClose,
  onDeleted,
  onError,
}: {
  photo: Photo
  guest: Guest | null
  onClose: () => void
  onDeleted: (id: string) => void
  onError: (message: string) => void
}) {
  useDialogBehavior(onClose)
  const [hearted, setHearted] = useState(false)
  const [heartCount, setHeartCount] = useState(photo.hearts)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  // Solo cambia al dar corazón: así el pop no se dispara al abrir el visor.
  const [popKey, setPopKey] = useState(0)

  useEffect(() => {
    if (!guest) return
    let active = true
    hasHearted(photo.id, guest.id).then((value) => {
      if (active) setHearted(value)
    })
    return () => {
      active = false
    }
  }, [photo.id, guest])

  async function toggleHeart() {
    if (!guest || busy) return
    setBusy(true)
    try {
      if (hearted) {
        await removeHeart(photo.id, guest.id)
        setHearted(false)
        setHeartCount((count) => Math.max(0, count - 1))
      } else {
        await addHeart(photo.id, guest.id)
        setHearted(true)
        setHeartCount((count) => count + 1)
        setPopKey((key) => key + 1)
      }
    } catch {
      // El estado no se tocó antes del await: no hay nada que revertir, solo avisar.
      onError('No se pudo guardar el corazón. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteOwnPhoto(photo.id)
      onDeleted(photo.id)
      onClose()
    } catch {
      setBusy(false)
      setConfirmingDelete(false)
      onError('No se pudo borrar la foto. Probá de nuevo.')
    }
  }

  const isOwn = guest !== null && guest.id === photo.guest_id
  const url = storage.getPublicUrl(photo.storage_path)
  const share = useSharePhoto(url, `foto-${photo.id}.jpg`)

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex animate-page flex-col overscroll-contain bg-ink text-white"
    >
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-14 w-14 items-center justify-center rounded-full active:bg-white/10"
        >
          <Icon name="x" className="h-7 w-7" />
        </button>
        <div className="flex items-center gap-1">
          {share && (
            <button
              type="button"
              onClick={() => void share()}
              className="flex h-12 items-center gap-2 rounded-full px-4 text-base font-semibold active:bg-white/10"
            >
              <Icon name="share" className="h-5 w-5" />
              Compartir
            </button>
          )}
        {isOwn && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex h-12 items-center gap-2 rounded-full px-4 text-base font-semibold text-rose active:bg-white/10"
          >
            <Icon name="trash" className="h-5 w-5" />
            Borrar
          </button>
        )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={photo.caption ?? ''} className="vt-foto max-h-full max-w-full object-contain" />
      </div>

      <div className="flex items-center gap-4 p-4">
        <button
          type="button"
          onClick={() => void toggleHeart()}
          aria-pressed={hearted}
          disabled={!guest || busy}
          aria-label={`Corazones: ${heartCount}`}
          className="flex h-14 items-center gap-2 rounded-full bg-white/10 px-5 text-lg font-semibold disabled:opacity-40"
        >
          <span key={popKey} className={popKey > 0 ? 'inline-flex animate-pop' : 'inline-flex'}>
            <Icon name="heart" filled={hearted} className={`h-6 w-6 ${hearted ? 'text-rose' : ''}`} />
          </span>
          <span className="tabular-nums">{heartCount}</span>
        </button>
        {photo.caption && <p className="flex-1 truncate text-white/85">{photo.caption}</p>}
      </div>

      {confirmingDelete && (
        <Dialog
          title="¿Borrar esta foto? No la vas a poder recuperar vos mismo después."
          onClose={() => !busy && setConfirmingDelete(false)}
        >
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy}
              className="flex-1 px-4"
            >
              No
            </Button>
            <Button
              variant="danger"
              icon="trash"
              loading={busy}
              onClick={() => void confirmDelete()}
              className="flex-1 px-4"
            >
              {busy ? 'Borrando…' : 'Sí, borrar'}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

export default function GaleriaPage() {
  const [guest, setGuest] = useState<Guest | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [tables, setTables] = useState<PartyTable[]>([])
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [photos, setPhotos] = useState<Photo[]>([])
  // Arranca en true: la primera tanda es la única que entra escalonada.
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null)
  // Miniatura de la que salió el visor: ahí vuelve la transición al cerrar.
  const openedFrom = useRef<HTMLElement | null>(null)
  const { toast, showToast } = useToast()

  const sentinelRef = useRef<HTMLDivElement>(null)
  const staggerFor = useInitialStagger(
    photos.map((photo) => photo.id),
    !loading,
  )
  const loadingRef = useRef(false)

  useEffect(() => {
    void findExistingGuest().then(setGuest)
    void listActiveMissions().then(setMissions)

    const supabase = getSupabaseClient()
    supabase
      .from('party_tables')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => setTables(data ?? []))
  }, [])

  const loadPage = useCallback(
    async (offset: number) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)

      const supabase = getSupabaseClient()

      let guestIdsForTable: string[] | null = null
      if (filters.tableId) {
        const { data: guestsInTable } = await supabase
          .from('guests')
          .select('id')
          .eq('table_id', filters.tableId)
        guestIdsForTable = (guestsInTable ?? []).map((row) => row.id)
      }

      // La vista ya filtra status = 'visible' y expone effective_milestone_id
      // = coalesce(milestone_override_id, milestone_id) — ver SPEC.md sección 6
      // y la migración 0006.
      let query = supabase
        .from('photos_with_effective_milestone')
        .select('*')
        .order('taken_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (filters.missionId) query = query.eq('mission_id', filters.missionId)
      if (filters.milestoneId) query = query.eq('effective_milestone_id', filters.milestoneId)
      if (filters.onlyMine && guest) query = query.eq('guest_id', guest.id)
      if (guestIdsForTable) query = query.in('guest_id', guestIdsForTable)

      const { data, error } = await query

      if (!error && data) {
        setPhotos((current) => (offset === 0 ? data : [...current, ...data]))
        setHasMore(data.length === PAGE_SIZE)
      }

      loadingRef.current = false
      setLoading(false)
    },
    [filters, guest],
  )

  useEffect(() => {
    setPhotos([])
    setHasMore(true)
    void loadPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
        void loadPage(photos.length)
      }
    })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, photos.length, loadPage])

  function handleDeleted(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id))
    showToast('Listo, la foto se borró')
  }

  return (
    <>
    <TopNav />
    <main id="contenido" className="mx-auto flex min-h-screen w-full max-w-5xl animate-page flex-col gap-6 px-4 pb-12 pt-10">
      <PageHeader title="Galería" />

      <div className="flex flex-wrap gap-2">
        <Chip
          selected={filters.onlyMine}
          onClick={() => setFilters((f) => ({ ...f, onlyMine: !f.onlyMine }))}
        >
          Mis fotos
        </Chip>

        <Select
          aria-label="Filtrar por misión"
          value={filters.missionId ?? ''}
          onChange={(event) =>
            setFilters((f) => ({ ...f, missionId: event.target.value || null }))
          }
          className="flex-1 basis-40"
        >
          <option value="">Todas las misiones</option>
          {missions.map((mission) => (
            <option key={mission.id} value={mission.id}>
              {mission.title}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filtrar por mesa"
          value={filters.tableId ?? ''}
          onChange={(event) => setFilters((f) => ({ ...f, tableId: event.target.value || null }))}
          className="flex-1 basis-40"
        >
          <option value="">Todas las mesas</option>
          {tables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.label ?? `Mesa ${table.code}`}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
        {photos.map((photo) => (
          <GridThumb
            key={photo.id}
            photo={photo}
            onOpen={(el) => {
              openedFrom.current = el
              void morphOpen(el, storage.getPublicUrl(photo.storage_path), () => setViewerPhoto(photo))
            }}
            stagger={staggerFor(photo.id)}
          />
        ))}
        {/* Mientras carga una tanda: celdas de skeleton (9 la primera vez, 3 al paginar). */}
        {loading &&
          Array.from({ length: photos.length === 0 ? 9 : 3 }, (_, i) => (
            <Skeleton key={`sk-${i}`} className="aspect-square rounded-xl" />
          ))}
      </div>

      {photos.length === 0 && !loading && (
        <EmptyState icon="images">
          <p className="text-base text-ink/70">Todavía no hay fotos con estos filtros.</p>
        </EmptyState>
      )}

      <div ref={sentinelRef} className="h-4" />

      {viewerPhoto && (
        <Viewer
          photo={viewerPhoto}
          guest={guest}
          onClose={() => morphClose(openedFrom.current, () => setViewerPhoto(null))}
          onDeleted={handleDeleted}
          onError={(message) => showToast(message, 'error')}
        />
      )}
      {toast}
    </main>
    {!hasMore && photos.length > 0 && <CreditFooter />}
    </>
  )
}
