'use client'

import { useEffect, useState } from 'react'
import { getRecentPhotosForModerationAction, setPhotoFeaturedAction, setPhotoHiddenAction } from '../actions'
import { unwrap } from '../unwrap'
import { storage } from '@/lib/storage'
import { AdminSkeleton, AdminTable } from '../AdminTable'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/Toast'

interface ModerationPhoto {
  id: string
  storage_path: string
  thumb_path: string
  caption: string | null
  status: string
  is_featured: boolean
  taken_at: string
  guest_name: string | null
}

export function ModeracionTab() {
  const [photos, setPhotos] = useState<ModerationPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Acción en curso por foto: muestra el spinner solo en esa fila.
  const [pending, setPending] = useState<string | null>(null)
  const { toast, showToast } = useToast()

  async function load() {
    setError(null)
    try {
      setPhotos(await getRecentPhotosForModerationAction())
    } catch {
      setError('No se pudo cargar. Puede ser la conexión — probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function toggleHidden(photo: ModerationPhoto) {
    setPending(`${photo.id}:hidden`)
    try {
      unwrap(await setPhotoHiddenAction(photo.id, photo.status !== 'hidden'))
      await load()
      showToast(photo.status === 'hidden' ? 'La foto se ve de nuevo' : 'Foto oculta')
    } catch {
      showToast('No se pudo cambiar la visibilidad, probá de nuevo.', 'error')
    } finally {
      setPending(null)
    }
  }

  async function toggleFeatured(photo: ModerationPhoto) {
    setPending(`${photo.id}:featured`)
    try {
      unwrap(await setPhotoFeaturedAction(photo.id, !photo.is_featured))
      await load()
    } catch {
      showToast('No se pudo destacar la foto, probá de nuevo.', 'error')
    } finally {
      setPending(null)
    }
  }

  if (loading) return <AdminSkeleton />

  if (error) {
    return (
      <EmptyState icon="alert">
        <p className="text-base text-danger">{error}</p>
        <Button icon="retry" onClick={() => void load()}>
          Reintentar
        </Button>
      </EmptyState>
    )
  }

  if (photos.length === 0) {
    return (
      <EmptyState icon="images">
        <p className="text-base text-ink/70">Todavía no hay fotos para moderar.</p>
      </EmptyState>
    )
  }

  return (
    <>
      <AdminTable head={['Foto', 'Quién y cuándo', 'Visibilidad', 'Destacada']}>
        {photos.map((photo) => (
          <tr key={photo.id} className={photo.status === 'hidden' ? 'bg-rose/20' : ''}>
            <td className="px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storage.getPublicUrl(photo.thumb_path)}
                alt=""
                loading="lazy"
                className={`h-14 w-14 min-w-14 max-w-none rounded-xl object-cover ${photo.status === 'hidden' ? 'opacity-40' : ''}`}
              />
            </td>
            <td className="min-w-[10rem] px-3 py-2 max-sm:min-w-0 max-sm:flex-1 max-sm:basis-[calc(100%-5rem)]">
              <p className="font-semibold text-ink">{photo.guest_name ?? 'Invitado'}</p>
              <p className="tabular-nums text-ink/70">{new Date(photo.taken_at).toLocaleString('es-AR')}</p>
              {photo.caption && <p className="line-clamp-1 text-ink/70">{photo.caption}</p>}
            </td>
            <td className="px-3 py-2">
              <Button
                variant="secondary"
                size="sm"
                icon={photo.status === 'hidden' ? 'eye' : 'eye-off'}
                loading={pending === `${photo.id}:hidden`}
                onClick={() => void toggleHidden(photo)}
              >
                {photo.status === 'hidden' ? 'Mostrar' : 'Ocultar'}
              </Button>
            </td>
            <td className="px-3 py-2">
              <button
                type="button"
                onClick={() => void toggleFeatured(photo)}
                disabled={pending === `${photo.id}:featured`}
                aria-pressed={photo.is_featured}
                className={`press flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold disabled:opacity-40 ${
                  photo.is_featured ? 'bg-fuchsia text-white' : 'border border-ink/20 bg-surface text-ink'
                }`}
              >
                <Icon name="star" filled={photo.is_featured} className="h-4 w-4" />
                {photo.is_featured ? 'Destacada' : 'Destacar'}
              </button>
            </td>
          </tr>
        ))}
      </AdminTable>
      {toast}
    </>
  )
}
