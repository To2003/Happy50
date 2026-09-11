'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { storage } from '@/lib/storage'
import type { Database } from '@/lib/database.types'

type Milestone = Database['public']['Tables']['milestones']['Row']
type PartyTable = Database['public']['Tables']['party_tables']['Row']
type BookPhoto = Database['public']['Views']['photos_with_effective_milestone']['Row'] & {
  guest_name: string | null
}

interface TableFilter {
  id: string
  label: string
}

function chapterTitle(milestone: Milestone): string {
  if (milestone.is_prologue) return milestone.name
  if (!milestone.started_at) return milestone.name
  const time = new Date(milestone.started_at).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${milestone.name} — ${time}`
}

function Viewer({ photo, onClose }: { photo: BookPhoto; onClose: () => void }) {
  const url = storage.getPublicUrl(photo.storage_path)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex justify-end p-4">
        <button type="button" onClick={onClose} className="text-2xl text-white">
          ✕
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={photo.caption ?? ''} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="flex flex-col gap-1 p-4 text-white">
        {photo.caption && <p>{photo.caption}</p>}
        <p className="text-sm text-neutral-400">
          {photo.guest_name ? `Por ${photo.guest_name}` : null} {photo.hearts > 0 && `· ❤️ ${photo.hearts}`}
        </p>
      </div>
    </div>
  )
}

export function BookTimeline({ tableFilter }: { tableFilter?: TableFilter }) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [photosByMilestone, setPhotosByMilestone] = useState<Map<string, BookPhoto[]>>(new Map())
  const [tables, setTables] = useState<PartyTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewerPhoto, setViewerPhoto] = useState<BookPhoto | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabaseClient()

      const [{ data: milestonesData }, { data: tablesData }] = await Promise.all([
        supabase.from('milestones').select('*').order('sort_order'),
        supabase.from('party_tables').select('*').order('sort_order'),
      ])
      setMilestones(milestonesData ?? [])
      setTables(tablesData ?? [])

      let guestIds: string[] | null = null
      if (tableFilter) {
        const { data: guests } = await supabase.from('guests').select('id').eq('table_id', tableFilter.id)
        guestIds = (guests ?? []).map((g) => g.id)
      }

      let query = supabase
        .from('photos_with_effective_milestone')
        .select('*')
        .order('taken_at', { ascending: true })

      if (guestIds) query = query.in('guest_id', guestIds)

      const { data: photos, error: photosError } = await query
      if (photosError) throw photosError

      const photoGuestIds = Array.from(
        new Set((photos ?? []).map((p) => p.guest_id).filter((id): id is string => !!id)),
      )
      const { data: guestRows } = await supabase.from('guests').select('id, name').in('id', photoGuestIds)
      const nameById = new Map((guestRows ?? []).map((g) => [g.id, g.name]))

      const grouped = new Map<string, BookPhoto[]>()
      for (const photo of photos ?? []) {
        const key = photo.effective_milestone_id
        if (!key) continue
        const withName: BookPhoto = {
          ...photo,
          guest_name: photo.guest_id ? (nameById.get(photo.guest_id) ?? null) : null,
        }
        const list = grouped.get(key) ?? []
        list.push(withName)
        grouped.set(key, list)
      }
      setPhotosByMilestone(grouped)
    } catch {
      setError('No se pudo cargar el book. Puede ser la conexión — probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilter?.id])

  if (loading) return <p className="p-6 text-neutral-400">Cargando...</p>

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="text-red-400">{error}</p>
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

  const chaptersWithPhotos = milestones.filter((m) => (photosByMilestone.get(m.id)?.length ?? 0) > 0)

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto bg-neutral-950 px-4 py-3">
        {chaptersWithPhotos.map((m) => (
          <a
            key={m.id}
            href={`#capitulo-${m.id}`}
            className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-sm"
          >
            {m.emoji} {m.name}
          </a>
        ))}
      </div>

      {chaptersWithPhotos.length === 0 && (
        <p className="px-6 text-neutral-400">Todavía no hay fotos acá.</p>
      )}

      {chaptersWithPhotos.map((milestone) => {
        const photos = photosByMilestone.get(milestone.id) ?? []
        return (
          <section key={milestone.id} id={`capitulo-${milestone.id}`} className="flex flex-col gap-3 px-4">
            <h2 className="text-xl font-bold">
              {milestone.emoji} {chapterTitle(milestone)}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setViewerPhoto(photo)}
                  className="aspect-square overflow-hidden rounded-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storage.getPublicUrl(photo.thumb_path)}
                    alt={photo.caption ?? ''}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </section>
        )
      })}

      {!tableFilter && tables.length > 0 && (
        <section className="flex flex-col gap-3 px-4">
          <h2 className="text-xl font-bold">El book de tu mesa</h2>
          <div className="flex flex-wrap gap-2">
            {tables.map((table) => (
              <Link
                key={table.id}
                href={`/book/mesa/${table.code}`}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm"
              >
                {table.label ?? `Mesa ${table.code}`}
              </Link>
            ))}
          </div>
        </section>
      )}

      {viewerPhoto && <Viewer photo={viewerPhoto} onClose={() => setViewerPhoto(null)} />}
    </div>
  )
}
