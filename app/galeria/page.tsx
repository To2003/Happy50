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
    <button type="button" onClick={onOpen} className="aspect-square overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={photo.caption ?? ''} className="h-full w-full object-cover" />
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4">
        <button type="button" onClick={onClose} className="text-2xl">
          ✕
        </button>
        {isOwn && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-sm text-red-400"
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
          className="flex h-12 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-lg disabled:opacity-40"
        >
          {hearted ? '❤️' : '🤍'} {heartCount}
        </button>
        {photo.caption && <p className="flex-1 truncate text-neutral-300">{photo.caption}</p>}
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-neutral-900 p-6">
            <p className="text-lg">¿Borrar esta foto? No la vas a poder recuperar vos mismo después.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="h-12 flex-1 rounded-lg bg-neutral-800 font-medium disabled:opacity-40"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={busy}
                className="h-12 flex-1 rounded-lg bg-red-600 font-bold disabled:opacity-40"
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
    <main className="flex min-h-screen flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Galería</h1>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, onlyMine: !f.onlyMine }))}
          className={`h-10 rounded-lg px-3 text-sm font-medium ${
            filters.onlyMine ? 'bg-pink-600' : 'bg-neutral-900'
          }`}
        >
          Mis fotos
        </button>

        <select
          value={filters.missionId ?? ''}
          onChange={(event) =>
            setFilters((f) => ({ ...f, missionId: event.target.value || null }))
          }
          className="h-10 rounded-lg bg-neutral-900 px-3 text-sm"
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
          className="h-10 rounded-lg bg-neutral-900 px-3 text-sm"
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
        <p className="text-center text-neutral-400">Todavía no hay fotos con estos filtros.</p>
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
