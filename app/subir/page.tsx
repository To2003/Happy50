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
import { TopNav } from '@/components/TopNav'
import { Confetti } from '@/components/Confetti'

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

function nightCounterLabel(count: number | null): string {
  if (count === null) return ''
  if (count === 0) return 'Sé la primera persona en subir una foto'
  if (count === 1) return 'Va 1 foto'
  return `Van ${count} fotos`
}

function QueueThumb({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (!url) return <div className="h-16 w-16 shrink-0 rounded-2xl bg-rose/30" />

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
}

function QueueRow({ item, onRetry }: { item: QueueItem; onRetry: (id: string) => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm">
      {item.thumbBlob ? (
        <QueueThumb blob={item.thumbBlob} />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-rose/30" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base text-ink/70">{item.fileName}</p>
        <p className="text-base font-bold text-ink">
          {STATUS_LABEL[item.status]}
          {item.status === 'uploading' &&
            typeof item.progressPercent === 'number' &&
            ` (${item.progressPercent}%)`}
        </p>
        {item.status === 'failed' && (
          <p className="text-base text-danger">{item.errorMessage ?? 'No se pudo subir.'}</p>
        )}
      </div>
      {item.status === 'failed' && (
        <button
          type="button"
          onClick={() => onRetry(item.id)}
          className="h-12 shrink-0 rounded-full bg-fuchsia px-4 text-base font-bold text-white"
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
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const celebratedIds = useRef<Set<string>>(new Set())

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

  // Confetti: un estallido por cada foto que termina de subirse de verdad,
  // no una animación ambiente — ver components/Confetti.tsx.
  useEffect(() => {
    const newlyDone = queue.filter(
      (item) => item.status === 'done' && !celebratedIds.current.has(item.id),
    )
    if (newlyDone.length === 0) return
    for (const item of newlyDone) celebratedIds.current.add(item.id)
    setConfettiTrigger((n) => n + 1)
  }, [queue])

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
    <>
      <TopNav />
      <Confetti trigger={confettiTrigger} />

      <main className="flex min-h-screen flex-col gap-6 pb-10">
        <section
          className="relative flex min-h-[280px] flex-col justify-end gap-2 bg-cover bg-center px-6 py-8"
          style={{ backgroundImage: "url('/ines.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
          <div className="relative flex flex-col gap-1">
            <h1 className="font-display text-4xl leading-tight text-white">¡Sumate a la fiesta!</h1>
            <p className="text-base text-white/90">
              Sacá fotos de la noche y subilas acá — se van sumando al álbum de todos.
            </p>
            <p className="mt-1 text-base font-bold text-white">{nightCounterLabel(photoCount)}</p>
          </div>
        </section>
        <div className="scallop-edge" />

        <div className="flex flex-col gap-6 px-6">
          {!hasStaged && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex h-16 items-center justify-center gap-2 rounded-full bg-fuchsia text-xl font-bold text-white active:opacity-90"
              >
                📷 Sacar foto
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex h-12 items-center justify-center rounded-full border-2 border-rose bg-surface text-base font-bold text-ink active:bg-rose/20"
              >
                🖼️ Elegir fotos
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
                    className="aspect-square w-full rounded-2xl object-cover"
                  />
                ))}
              </div>

              <input
                type="text"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Epígrafe (opcional)"
                className="h-14 rounded-2xl border border-rose bg-surface px-4 text-base text-ink outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-fuchsia"
              />

              {missions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-base text-ink/70">Misión (opcional)</p>
                  <div className="flex flex-wrap gap-2">
                    {missions.map((mission) => (
                      <button
                        key={mission.id}
                        type="button"
                        onClick={() =>
                          setMissionId((current) => (current === mission.id ? null : mission.id))
                        }
                        className={`h-12 rounded-full px-4 text-base font-bold ${
                          missionId === mission.id
                            ? 'bg-fuchsia text-white'
                            : 'border-2 border-rose bg-surface text-ink'
                        }`}
                      >
                        {mission.emoji} {mission.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stagingError && <p className="text-base text-danger">{stagingError}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelStaged}
                  disabled={preparing}
                  className="h-14 flex-1 rounded-full border-2 border-rose bg-surface text-base font-bold text-ink disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmUpload()}
                  disabled={preparing}
                  className="h-14 flex-[2] rounded-full bg-fuchsia text-base font-bold text-white disabled:opacity-40"
                >
                  {preparing
                    ? 'Preparando...'
                    : `Subir ${staged.length > 1 ? staged.length + ' fotos' : 'foto'}`}
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
        </div>
      </main>
    </>
  )
}

export default function SubirPage() {
  return (
    <Suspense fallback={null}>
      <SubirScreen />
    </Suspense>
  )
}
