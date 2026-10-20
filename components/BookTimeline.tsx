'use client'

import { useEffect, useRef, useState, type HTMLAttributes } from 'react'
import Link from 'next/link'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { Button, buttonClasses } from '@/components/Button'
import { useDialogBehavior } from '@/components/Dialog'
import { Skeleton } from '@/components/Skeleton'
import { getSupabaseClient } from '@/lib/supabase/client'
import { storage } from '@/lib/storage'
import { morphClose, morphOpen } from '@/lib/viewTransition'
import { useSharePhoto } from '@/lib/useSharePhoto'
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

// Cada capítulo aparece al entrar en pantalla (una sola vez). Sin
// IntersectionObserver se muestra directo; el estado oculto lo pone el JS,
// así que si el script no corre nada queda escondido.
function Reveal({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null)
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setState('shown')
          observer.disconnect()
        } else {
          setState((current) => (current === 'idle' ? 'hidden' : current))
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className={`reveal ${state === 'hidden' ? 'reveal-hidden' : ''} ${className ?? ''}`} {...rest}>
      {children}
    </section>
  )
}

function Viewer({ photo, onClose }: { photo: BookPhoto; onClose: () => void }) {
  const url = storage.getPublicUrl(photo.storage_path)
  const share = useSharePhoto(url, `foto-${photo.id}.jpg`)
  useDialogBehavior(onClose)

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
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={photo.caption ?? ''} className="vt-foto max-h-full max-w-full object-contain" />
      </div>
      <div className="flex flex-col gap-1 p-4">
        {photo.caption && <p>{photo.caption}</p>}
        <p className="flex items-center gap-1.5 text-base text-white/70">
          {photo.guest_name ? `Por ${photo.guest_name}` : null}
          {photo.hearts > 0 && (
            <>
              {' · '}
              <Icon name="heart" filled className="h-4 w-4 text-rose" />
              <span className="tabular-nums">{photo.hearts}</span>
            </>
          )}
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
  const openedFrom = useRef<HTMLElement | null>(null)

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

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6" aria-busy="true">
        <span className="sr-only">Cargando…</span>
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <div className="grid grid-cols-3 gap-1.5">
          <Skeleton className="col-span-2 row-span-2 aspect-square rounded-xl" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <EmptyState icon="alert">
          <p className="text-base text-danger">{error}</p>
          <Button icon="retry" onClick={() => void load()}>
            Reintentar
          </Button>
        </EmptyState>
      </div>
    )
  }

  const chaptersWithPhotos = milestones.filter((m) => (photosByMilestone.get(m.id)?.length ?? 0) > 0)

  return (
    <div className="flex flex-col gap-12 pb-16">
      {chaptersWithPhotos.length > 0 && (
        <nav
          aria-label="Capítulos"
          className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-rose bg-bg px-4 py-2.5"
        >
          {chaptersWithPhotos.map((m) => (
            <a
              key={m.id}
              href={`#capitulo-${m.id}`}
              className="press flex h-11 shrink-0 items-center rounded-full border border-ink/20 bg-surface px-4 text-sm font-semibold text-ink"
            >
              {m.name}
            </a>
          ))}
        </nav>
      )}

      {chaptersWithPhotos.length === 0 && (
        <div className="px-4">
          <EmptyState icon="book">
            <p className="text-base text-ink/70">Todavía no hay fotos acá.</p>
          </EmptyState>
        </div>
      )}

      {chaptersWithPhotos.map((milestone) => {
        const photos = photosByMilestone.get(milestone.id) ?? []
        return (
          <Reveal key={milestone.id} id={`capitulo-${milestone.id}`} className="flex scroll-mt-20 flex-col gap-4 px-4">
            <h2 className="text-balance font-display text-3xl font-semibold leading-tight text-ink">
              {chapterTitle(milestone)}
            </h2>
            {/* La primera foto de cada capítulo va grande, como apertura de página. */}
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={(event) => {
                    const el = event.currentTarget
                    openedFrom.current = el
                    void morphOpen(el, storage.getPublicUrl(photo.storage_path), () => setViewerPhoto(photo))
                  }}
                  className={`relative aspect-square overflow-hidden rounded-xl ${
                    index === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  <span aria-hidden className="absolute inset-0 animate-pulse bg-rose/30" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storage.getPublicUrl(photo.thumb_path)}
                    alt={photo.caption ?? ''}
                    loading="lazy"
                    decoding="async"
                    className="relative h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </Reveal>
        )
      })}

      {!tableFilter && tables.length > 0 && (
        <section className="flex flex-col gap-3 px-4">
          <h2 className="text-balance font-display text-3xl font-semibold leading-tight text-ink">El book de tu mesa</h2>
          <div className="flex flex-wrap gap-2">
            {tables.map((table) => (
              <Link
                key={table.id}
                href={`/book/mesa/${table.code}`}
                className={buttonClasses('secondary', 'sm', 'h-12 text-base')}
              >
                {table.label ?? `Mesa ${table.code}`}
              </Link>
            ))}
          </div>
        </section>
      )}

      {viewerPhoto && (
        <Viewer
          photo={viewerPhoto}
          onClose={() => morphClose(openedFrom.current, () => setViewerPhoto(null))}
        />
      )}
    </div>
  )
}
