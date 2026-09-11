'use client'

import { useEffect, useState } from 'react'
import { getRecentPhotosForModerationAction, setPhotoFeaturedAction, setPhotoHiddenAction } from '../actions'
import { storage } from '@/lib/storage'

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

  async function load() {
    setLoading(true)
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
    try {
      await setPhotoHiddenAction(photo.id, photo.status !== 'hidden')
      await load()
    } catch {
      setError('No se pudo cambiar la visibilidad, probá de nuevo.')
    }
  }

  async function toggleFeatured(photo: ModerationPhoto) {
    try {
      await setPhotoFeaturedAction(photo.id, !photo.is_featured)
      await load()
    } catch {
      setError('No se pudo destacar la foto, probá de nuevo.')
    }
  }

  if (loading) return <p className="text-neutral-400">Cargando...</p>

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
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

  return (
    <ul className="flex flex-col gap-2">
      {photos.map((photo) => (
        <li key={photo.id} className="flex items-center gap-3 rounded-lg bg-neutral-900 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={storage.getPublicUrl(photo.thumb_path)}
            alt=""
            className="h-14 w-14 shrink-0 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-neutral-300">
              {photo.guest_name ?? 'Invitado'} — {new Date(photo.taken_at).toLocaleString('es-AR')}
            </p>
            {photo.caption && <p className="truncate text-sm text-neutral-500">{photo.caption}</p>}
          </div>
          <button
            type="button"
            onClick={() => void toggleHidden(photo)}
            className={`h-10 shrink-0 rounded-lg px-3 text-sm font-medium ${
              photo.status === 'hidden' ? 'bg-neutral-700' : 'bg-neutral-800'
            }`}
          >
            {photo.status === 'hidden' ? 'Mostrar' : 'Ocultar'}
          </button>
          <button
            type="button"
            onClick={() => void toggleFeatured(photo)}
            className={`h-10 shrink-0 rounded-lg px-3 text-sm font-medium ${
              photo.is_featured ? 'bg-pink-600' : 'bg-neutral-800'
            }`}
          >
            {photo.is_featured ? '★ Destacada' : '☆ Destacar'}
          </button>
        </li>
      ))}
    </ul>
  )
}
