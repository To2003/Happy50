'use client'

import { Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findExistingGuest } from '@/lib/guest'
import { listActiveMissions, type Mission } from '@/lib/missions'
import { runPipeline } from '@/lib/pipeline/runPipeline'
import { addItem, hydrateQueue, updateItem, type QueueItem } from '@/lib/uploadQueue'
import { startUploadProcessor } from '@/lib/uploadProcessor'
import { useUploadQueue } from '@/lib/useUploadQueue'
import { usePhotoCount } from '@/lib/usePhotoCount'

interface StagedFile {
  id: string
  file: File
  previewUrl: string
}

const STATUS_LABEL: Record<QueueItem['status'], string> = {
  waiting: 'Esperando',
  uploading: 'Subiendo',
  done: 'Lista',
  failed: 'Falló',
}

function QueueThumb({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (!url) return <div className="h-14 w-14 shrink-0 rounded bg-neutral-800" />

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
}

function QueueRow({ item, onRetry }: { item: QueueItem; onRetry: (id: string) => void }) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-neutral-900 p-3">
      {item.thumbBlob ? (
        <QueueThumb blob={item.thumbBlob} />
      ) : (
        <div className="h-14 w-14 shrink-0 rounded bg-neutral-800" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neutral-300">{item.fileName}</p>
        <p className="text-sm font-medium">
          {STATUS_LABEL[item.status]}
          {item.status === 'uploading' &&
            typeof item.progressPercent === 'number' &&
            ` (${item.progressPercent}%)`}
        </p>
        {item.status === 'failed' && (
          <p className="text-sm text-red-400">{item.errorMessage ?? 'No se pudo subir.'}</p>
        )}
      </div>
      {item.status === 'failed' && (
        <button
          type="button"
          onClick={() => onRetry(item.id)}
          className="h-10 shrink-0 rounded-lg bg-pink-600 px-4 text-sm font-bold"
        >
          Reintentar
        </button>
      )}
    </li>
  )
}

function SubirScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetMissionId = searchParams.get('mission')

  const [checkingGuest, setCheckingGuest] = useState(true)
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [caption, setCaption] = useState('')
  const [missionId, setMissionId] = useState<string | null>(presetMissionId)
  const [missions, setMissions] = useState<Mission[]>([])
  const [preparing, setPreparing] = useState(false)
  const [stagingError, setStagingError] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const queue = useUploadQueue()
  const photoCount = usePhotoCount()

  useEffect(() => {
    let active = true

    findExistingGuest().then((guest) => {
      if (!active) return
      if (!guest) {
        router.replace('/')
        return
      }
      setCheckingGuest(false)
    })

    void hydrateQueue().then(() => startUploadProcessor())
    void listActiveMissions().then((result) => {
      if (active) setMissions(result)
    })

    return () => {
      active = false
    }
  }, [router])

  useEffect(() => {
    return () => {
      for (const item of staged) {
        URL.revokeObjectURL(item.previewUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    const next: StagedFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setStaged((current) => [...current, ...next])
    setStagingError(null)
    event.target.value = ''
  }

  function cancelStaged() {
    for (const item of staged) {
      URL.revokeObjectURL(item.previewUrl)
    }
    setStaged([])
    setCaption('')
    setStagingError(null)
  }

  async function confirmUpload() {
    setPreparing(true)
    setStagingError(null)

    const toProcess = staged
    setStaged([])

    let anyFailed = false

    await Promise.all(
      toProcess.map(async (staged_) => {
        try {
          const processed = await runPipeline(staged_.file)
          const photoId = crypto.randomUUID()

          await addItem({
            id: photoId,
            status: 'waiting',
            fileName: staged_.file.name,
            caption: caption.trim() || null,
            missionId,
            attempts: 0,
            displayBlob: processed.display,
            thumbBlob: processed.thumb,
            displayPath: `display/${photoId}.jpg`,
            thumbPath: `thumb/${photoId}.jpg`,
            takenAt: processed.takenAt.toISOString(),
            width: processed.width,
            height: processed.height,
          })
        } catch {
          anyFailed = true
        } finally {
          URL.revokeObjectURL(staged_.previewUrl)
        }
      }),
    )

    if (anyFailed) {
      setStagingError('Una de las fotos no se pudo procesar. Las demás ya están en la cola.')
    }

    setCaption('')
    setMissionId(null)
    setPreparing(false)
  }

  function retryItem(id: string) {
    void updateItem(id, { status: 'waiting', attempts: 0, errorMessage: undefined })
  }

  if (checkingGuest) {
    return null
  }

  const hasStaged = staged.length > 0

  return (
    <main className="flex min-h-screen flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subí tus fotos</h1>
        <p className="text-sm text-neutral-400">
          {photoCount === null ? '' : `Ya van ${photoCount} fotos`}
        </p>
      </div>

      {!hasStaged && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex h-20 items-center justify-center rounded-lg bg-pink-600 text-xl font-bold active:bg-pink-700"
          >
            📷 Sacar foto
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex h-14 items-center justify-center rounded-lg bg-neutral-900 text-lg font-medium active:bg-neutral-800"
          >
            Elegir de la galería
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFilesSelected}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
        </div>
      )}

      {hasStaged && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {staged.map((item) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.id}
                src={item.previewUrl}
                alt=""
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>

          <input
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Epígrafe (opcional)"
            className="h-14 rounded-lg bg-neutral-900 px-4 text-lg outline-none ring-pink-600 focus:ring-2"
          />

          {missions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-neutral-400">Misión (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {missions.map((mission) => (
                  <button
                    key={mission.id}
                    type="button"
                    onClick={() =>
                      setMissionId((current) => (current === mission.id ? null : mission.id))
                    }
                    className={`h-10 rounded-lg px-3 text-sm font-medium ${
                      missionId === mission.id ? 'bg-pink-600' : 'bg-neutral-900'
                    }`}
                  >
                    {mission.emoji} {mission.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {stagingError && <p className="text-sm text-red-400">{stagingError}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={cancelStaged}
              disabled={preparing}
              className="h-14 flex-1 rounded-lg bg-neutral-900 text-lg font-medium disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmUpload()}
              disabled={preparing}
              className="h-14 flex-[2] rounded-lg bg-pink-600 text-lg font-bold disabled:opacity-40"
            >
              {preparing ? 'Preparando...' : `Subir ${staged.length > 1 ? staged.length + ' fotos' : 'foto'}`}
            </button>
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <ul className="flex flex-col gap-2">
          {queue.map((item) => (
            <QueueRow key={item.id} item={item} onRetry={retryItem} />
          ))}
        </ul>
      )}
    </main>
  )
}

export default function SubirPage() {
  return (
    <Suspense fallback={null}>
      <SubirScreen />
    </Suspense>
  )
}
