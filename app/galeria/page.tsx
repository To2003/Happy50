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

function GridThumb({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const url = storage.getPublicUrl(photo.thumb_path)
  return (
    <button type="button" onClick={onOpen} className="relative aspect-square overflow-hidden rounded-2xl">
      {/* Placeholder de carga: la foto lo tapa apenas llega. */}
      <span aria-hidden className="absolute inset-0 animate-pulse bg-rose/30" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={photo.caption ?? ''} className="relative h-full w-full object-cover" />
    </button>
  )
}

function Viewer({
  photo,
  guest,
  onClose,
  onDeleted,
}: {
  photo: Photo
  guest: Guest | null
  onClose: () => void
  onDeleted: (id: string) => void
}) {
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
      // El corazón no cambió: el estado optimista no se tocó, no hace falta revertir nada visible.
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
    }
  }

  const isOwn = guest !== null && guest.id === photo.guest_id
  const url = storage.getPublicUrl(photo.storage_path)

  return (
    <div className="fixed inset-0 z-50 flex animate-page flex-col bg-ink text-white">
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl active:bg-white/10"
        >
          ✕
        </button>
        {isOwn && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="h-12 rounded-full px-4 text-base font-bold text-card-rose active:bg-white/10"
          >
            Borrar
          </button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={photo.caption ?? ''} className="max-h-full max-w-full object-contain" />
      </div>

      <div className="flex items-center gap-4 p-4">
        <button
          type="button"
          onClick={() => void toggleHeart()}
          disabled={!guest || busy}
          className="flex h-14 items-center gap-2 rounded-full bg-white/10 px-5 text-lg font-bold disabled:opacity-40"
        >
          <span key={popKey} className={popKey > 0 ? 'inline-block animate-pop' : 'inline-block'}>
            {hearted ? '❤️' : '🤍'}
          </span>{' '}
          {heartCount}
        </button>
        {photo.caption && <p className="flex-1 truncate text-white/85">{photo.caption}</p>}
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-surface p-6 text-ink shadow-lift animate-enter">
            <p className="text-lg">¿Borrar esta foto? No la vas a poder recuperar vos mismo después.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="h-14 flex-1 rounded-full border-2 border-rose bg-surface text-base font-bold text-ink disabled:opacity-40"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={busy}
                className="h-14 flex-1 rounded-full bg-danger text-base font-bold text-white disabled:opacity-40"
              >
                {busy ? 'Borrando...' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        </div>
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
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
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
  }

  return (
    <>
    <TopNav />
    <main className="flex min-h-screen animate-page flex-col gap-4 px-4 py-8">
      <h1 className="font-display text-3xl text-ink">Galería</h1>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, onlyMine: !f.onlyMine }))}
          className={`h-12 rounded-full px-4 text-base font-bold ${
            filters.onlyMine ? 'bg-fuchsia text-white' : 'border-2 border-rose bg-surface text-ink'
          }`}
        >
          Mis fotos
        </button>

        <select
          value={filters.missionId ?? ''}
          onChange={(event) =>
            setFilters((f) => ({ ...f, missionId: event.target.value || null }))
          }
          className="h-12 min-w-0 max-w-full rounded-full border-2 border-rose bg-surface px-4 text-base text-ink"
        >
          <option value="">Todas las misiones</option>
          {missions.map((mission) => (
            <option key={mission.id} value={mission.id}>
              {mission.title}
            </option>
          ))}
        </select>

        <select
          value={filters.tableId ?? ''}
          onChange={(event) => setFilters((f) => ({ ...f, tableId: event.target.value || null }))}
          className="h-12 min-w-0 max-w-full rounded-full border-2 border-rose bg-surface px-4 text-base text-ink"
        >
          <option value="">Todas las mesas</option>
          {tables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.label ?? `Mesa ${table.code}`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <GridThumb key={photo.id} photo={photo} onOpen={() => setViewerPhoto(photo)} />
        ))}
      </div>

      {photos.length === 0 && !loading && (
        <p className="py-10 text-center text-base text-ink/70">Todavía no hay fotos con estos filtros.</p>
      )}

      <div ref={sentinelRef} className="h-4" />

      {viewerPhoto && (
        <Viewer
          photo={viewerPhoto}
          guest={guest}
          onClose={() => setViewerPhoto(null)}
          onDeleted={handleDeleted}
        />
      )}
    </main>
    </>
  )
}
