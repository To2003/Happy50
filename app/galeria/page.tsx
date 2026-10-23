'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { storage } from '@/lib/storage'
import { findExistingGuest, type Guest } from '@/lib/guest'
import { listActiveMissions, type Mission } from '@/lib/missions'
import { DeletePhotoError, deleteOwnPhoto } from '@/lib/photos'
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
  authorName,
  onOpen,
  stagger,
}: {
  photo: Photo
  authorName: string | null
  onOpen: (el: HTMLElement) => void
  stagger: StaggerProps
}) {
  const url = storage.getPublicUrl(photo.thumb_path)
  return (
    <button
      type="button"
      data-photo-id={photo.id}
      onClick={(event) => onOpen(event.currentTarget)}
      style={stagger.style}
      onAnimationEnd={stagger.onAnimationEnd}
      className={`relative aspect-square overflow-hidden rounded-xl ${stagger.className ?? ''}`}
    >
      {/* Placeholder de carga: la foto lo tapa apenas llega. */}
      <span aria-hidden className="absolute inset-0 animate-pulse bg-blush/30" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={photo.caption ?? ''}
        loading="lazy"
        decoding="async"
        className="relative h-full w-full object-cover"
      />
      {authorName && (
        // Degradé para que el nombre se lea sobre cualquier foto (clara u oscura).
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-sm font-semibold text-white">
          {authorName}
        </span>
      )}
    </button>
  )
}

// Cuánto hay que arrastrar (fracción del ancho) para pasar de foto.
const SWIPE_THRESHOLD = 0.18
// Un gesto corto pero rápido también pasa de foto (px/ms).
const SWIPE_VELOCITY = 0.5
const SLIDE_MS = 180

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Viewer({
  photo,
  prevPhoto,
  nextPhoto,
  authorName,
  guest,
  onPrev,
  onNext,
  onHeartChange,
  onClose,
  onDeleted,
  onError,
}: {
  photo: Photo
  prevPhoto: Photo | null
  nextPhoto: Photo | null
  authorName: string | null
  guest: Guest | null
  onPrev: () => void
  onNext: () => void
  onHeartChange: (photoId: string, delta: number) => void
  onClose: () => void
  onDeleted: (id: string) => void
  onError: (message: string) => void
}) {
  useDialogBehavior(onClose)
  const [hearted, setHearted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  // Solo cambia al dar corazón: así el pop no se dispara al abrir el visor.
  const [popKey, setPopKey] = useState(0)

  // Desplazamiento horizontal de la foto mientras se arrastra o se anima.
  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x: number; y: number; t: number; axis: 'x' | 'y' | null } | null>(null)
  const sliding = useRef(false)

  // Cada foto arranca con su propio estado de corazón y sin confirmación abierta.
  useEffect(() => {
    setHearted(false)
    setConfirmingDelete(false)
    setPopKey(0)
    if (!guest) return
    let active = true
    hasHearted(photo.id, guest.id).then((value) => {
      if (active) setHearted(value)
    })
    return () => {
      active = false
    }
  }, [photo.id, guest])

  // Precarga las vecinas: con el wifi del salón, la siguiente ya está cuando se desliza.
  useEffect(() => {
    for (const neighbor of [prevPhoto, nextPhoto]) {
      if (neighbor) new Image().src = storage.getPublicUrl(neighbor.storage_path)
    }
  }, [prevPhoto, nextPhoto])

  // La foto sale hacia un lado y la nueva entra desde el otro.
  const slideTo = useCallback(
    (direction: 'prev' | 'next') => {
      const target = direction === 'next' ? nextPhoto : prevPhoto
      if (!target || sliding.current) return
      const change = direction === 'next' ? onNext : onPrev
      if (prefersReducedMotion()) {
        setOffset(0)
        change()
        return
      }
      sliding.current = true
      const width = stageRef.current?.clientWidth ?? window.innerWidth
      const sign = direction === 'next' ? -1 : 1
      setAnimating(true)
      setOffset(sign * width)
      window.setTimeout(() => {
        change()
        setAnimating(false)
        setOffset(-sign * width)
        // Doble frame: que el navegador pinte la foto nueva afuera antes de animarla hacia el centro.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setAnimating(true)
            setOffset(0)
            window.setTimeout(() => {
              setAnimating(false)
              sliding.current = false
            }, SLIDE_MS)
          }),
        )
      }, SLIDE_MS)
    },
    [nextPhoto, prevPhoto, onNext, onPrev],
  )

  // Flechas del teclado en la compu.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (confirmingDelete) return
      if (event.key === 'ArrowRight') slideTo('next')
      if (event.key === 'ArrowLeft') slideTo('prev')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slideTo, confirmingDelete])

  function onPointerDown(event: React.PointerEvent) {
    if (!event.isPrimary || sliding.current || confirmingDelete) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now(), axis: null }
  }

  function onPointerMove(event: React.PointerEvent) {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    const dx = event.clientX - d.x
    const dy = event.clientY - d.y
    // Recién después de unos px se decide si el gesto es horizontal (pasar foto) o no.
    if (d.axis === null && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (d.axis === 'x') event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (d.axis !== 'x') return
    // En la primera o la última foto, el arrastre se resiste: se nota que no hay más.
    const blocked = (dx < 0 && !nextPhoto) || (dx > 0 && !prevPhoto)
    setOffset(blocked ? dx / 4 : dx)
  }

  function onPointerEnd(event: React.PointerEvent) {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    drag.current = null
    if (d.axis !== 'x') return
    const dx = event.clientX - d.x
    const width = stageRef.current?.clientWidth ?? window.innerWidth
    const velocity = Math.abs(dx) / Math.max(1, performance.now() - d.t)
    const passed = Math.abs(dx) > width * SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY
    if (passed && dx < 0 && nextPhoto) return slideTo('next')
    if (passed && dx > 0 && prevPhoto) return slideTo('prev')
    snapBack()
  }

  // El sistema cortó el gesto (scroll, notificación, otro dedo): la posición
  // del evento no es confiable, así que no se calcula swipe.
  function onPointerCancel(event: React.PointerEvent) {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    drag.current = null
    if (d.axis === 'x') snapBack()
  }

  // No llegó (o se canceló): la foto vuelve a su lugar.
  function snapBack() {
    setAnimating(true)
    setOffset(0)
    window.setTimeout(() => setAnimating(false), SLIDE_MS)
  }

  async function toggleHeart() {
    if (!guest || busy) return
    setBusy(true)
    try {
      if (hearted) {
        await removeHeart(photo.id, guest.id)
        setHearted(false)
        onHeartChange(photo.id, -1)
      } else {
        await addHeart(photo.id, guest.id)
        setHearted(true)
        onHeartChange(photo.id, 1)
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
      // La página pasa a la foto vecina o cierra el visor si era la única.
      setBusy(false)
      onDeleted(photo.id)
    } catch (err) {
      setBusy(false)
      setConfirmingDelete(false)
      // DeletePhotoError ya trae el mensaje para el invitado según el código.
      onError(err instanceof DeletePhotoError ? err.message : 'No se pudo borrar la foto. Probá de nuevo.')
    }
  }

  const isOwn = guest !== null && guest.id === photo.guest_id
  const url = storage.getPublicUrl(photo.storage_path)
  const heartCount = Math.max(0, photo.hearts)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-roledescription="carrusel"
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
        {isOwn && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex h-12 items-center gap-2 rounded-full px-4 text-base font-semibold text-white active:bg-white/10"
          >
            <Icon name="trash" className="h-5 w-5" />
            Borrar
          </button>
        )}
      </div>

      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerCancel}
        // pan-y y pinch-zoom quedan para el navegador; el arrastre horizontal lo maneja el visor.
        className="relative flex flex-1 touch-pan-y touch-pinch-zoom select-none items-center justify-center overflow-hidden"
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            transform: `translateX(${offset}px)`,
            transition: animating ? `transform ${SLIDE_MS}ms ease-out` : 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.id}
            src={url}
            alt={photo.caption ?? ''}
            draggable={false}
            className="vt-foto max-h-full max-w-full object-contain"
          />
        </div>

        {/* Flechas para la compu; en el celular se desliza. */}
        {prevPhoto && (
          <button
            type="button"
            onClick={() => slideTo('prev')}
            aria-label="Foto anterior"
            className="absolute left-3 top-1/2 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 sm:flex"
          >
            <Icon name="chevron-left" className="h-8 w-8" />
          </button>
        )}
        {nextPhoto && (
          <button
            type="button"
            onClick={() => slideTo('next')}
            aria-label="Foto siguiente"
            className="absolute right-3 top-1/2 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 sm:flex"
          >
            <Icon name="chevron-right" className="h-8 w-8" />
          </button>
        )}
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
            <Icon name="heart" filled={hearted} className={`h-6 w-6 ${hearted ? 'text-blush' : ''}`} />
          </span>
          <span className="tabular-nums">{heartCount}</span>
        </button>
        <div className="min-w-0 flex-1">
          {authorName && <p className="truncate text-lg font-semibold">{authorName}</p>}
          {photo.caption && <p className="truncate text-white/85">{photo.caption}</p>}
        </div>
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
  const [loadError, setLoadError] = useState(false)
  const [viewerId, setViewerId] = useState<string | null>(null)
  // guest_id → nombre de quien subió la foto. Se va llenando con cada tanda.
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({})
  const knownAuthorIds = useRef(new Set<string>())
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
    // Sin invitado (o sin red) la galería se ve igual; solo no deja dar corazón.
    findExistingGuest().then(setGuest).catch(() => setGuest(null))
    listActiveMissions().then(setMissions).catch(() => setMissions([]))

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
        setLoadError(false)

        // Nombres de los autores que todavía no tenemos, DESPUÉS de mostrar las
        // fotos y sin esperar. guests es de lectura pública (guests_select_public).
        // Si falla, la galería se ve igual sin nombres, y la próxima tanda reintenta.
        const missingIds = [...new Set(data.map((photo) => photo.guest_id))].filter(
          (id): id is string => id !== null && !knownAuthorIds.current.has(id),
        )
        if (missingIds.length > 0) {
          for (const id of missingIds) knownAuthorIds.current.add(id)
          const forget = () => missingIds.forEach((id) => knownAuthorIds.current.delete(id))
          void supabase
            .from('guests')
            .select('id, name')
            .in('id', missingIds)
            .then(({ data: authors }) => {
              if (!authors) return forget()
              setAuthorNames((current) => ({
                ...current,
                ...Object.fromEntries(authors.map((author) => [author.id, author.name])),
              }))
            }, forget)
        }
      } else {
        // Antes se tragaba el error y se veía "Todavía no hay fotos", que no era cierto.
        setLoadError(true)
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

  const viewerIndex = viewerId ? photos.findIndex((photo) => photo.id === viewerId) : -1
  const viewerPhoto = viewerIndex >= 0 ? photos[viewerIndex] : null

  // Pasando fotos en el visor se puede llegar al final de lo cargado: pedimos la tanda siguiente antes.
  // Con loadError no se reintenta solo: el reintento es el botón de la grilla.
  useEffect(() => {
    if (viewerIndex >= 0 && viewerIndex >= photos.length - 3 && hasMore && !loadError && !loadingRef.current) {
      void loadPage(photos.length)
    }
  }, [viewerIndex, photos.length, hasMore, loadError, loadPage])

  function closeViewer() {
    // Vuelve a la miniatura de la foto que se está viendo ahora, no a la que se abrió.
    const current = viewerId
      ? document.querySelector<HTMLElement>(`[data-photo-id="${viewerId}"]`)
      : null
    if (current && current !== openedFrom.current) current.scrollIntoView({ block: 'center' })
    morphClose(current ?? openedFrom.current, () => setViewerId(null))
  }

  function handleHeartChange(photoId: string, delta: number) {
    setPhotos((current) =>
      current.map((photo) => (photo.id === photoId ? { ...photo, hearts: photo.hearts + delta } : photo)),
    )
  }

  function handleDeleted(id: string) {
    if (viewerId === id) {
      // Siguiente, o anterior si era la última. Sin transición: es un cambio de
      // estado, no queda ningún view-transition-name puesto.
      const index = photos.findIndex((photo) => photo.id === id)
      const neighbor = photos[index + 1] ?? photos[index - 1] ?? null
      // Era la única: se cierra directo (su miniatura está por desaparecer, no hay a dónde volver).
      setViewerId(neighbor?.id ?? null)
    }
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

        {/* Con una sola mesa (un QR para toda la fiesta) filtrar por mesa no tiene sentido. */}
        {tables.length > 1 && (
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
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
        {photos.map((photo) => (
          <GridThumb
            key={photo.id}
            photo={photo}
            authorName={photo.guest_id ? authorNames[photo.guest_id] ?? null : null}
            onOpen={(el) => {
              openedFrom.current = el
              void morphOpen(el, storage.getPublicUrl(photo.storage_path), () => setViewerId(photo.id))
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

      {loadError && !loading && (
        <EmptyState icon="alert">
          <p className="text-base text-danger">No se pudieron cargar las fotos. Puede ser la conexión — probá de nuevo.</p>
          <Button icon="retry" onClick={() => void loadPage(photos.length)}>
            Reintentar
          </Button>
        </EmptyState>
      )}

      {photos.length === 0 && !loading && !loadError && (
        <EmptyState icon="images">
          <p className="text-base text-ink/70">Todavía no hay fotos con estos filtros.</p>
        </EmptyState>
      )}

      <div ref={sentinelRef} className="h-4" />

      {viewerPhoto && (
        <Viewer
          photo={viewerPhoto}
          prevPhoto={photos[viewerIndex - 1] ?? null}
          nextPhoto={photos[viewerIndex + 1] ?? null}
          authorName={viewerPhoto.guest_id ? authorNames[viewerPhoto.guest_id] ?? null : null}
          guest={guest}
          onPrev={() => setViewerId(photos[viewerIndex - 1]?.id ?? viewerId)}
          onNext={() => setViewerId(photos[viewerIndex + 1]?.id ?? viewerId)}
          onHeartChange={handleHeartChange}
          onClose={closeViewer}
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
