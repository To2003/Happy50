'use client'

import { Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react'
import Image from 'next/image'
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
import { Icon } from '@/components/Icon'

// Foto del hero. Con null el hero es tipográfico (el "50" grande); al poner
// la ruta (ej. '/ines.jpg') pasa a foto a sangre con degradado inferior, sin
// tocar nada más. next/image la sirve en WebP/AVIF; el original, < 150 KB.
const HERO_PHOTO: string | null = null

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

  if (!url) return <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-rose/30" />

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
}

function QueueRow({ item, onRetry }: { item: QueueItem; onRetry: (id: string) => void }) {
  return (
    <li className="flex animate-enter items-center gap-3 rounded-2xl border border-rose bg-surface p-3">
      {item.thumbBlob ? (
        <QueueThumb blob={item.thumbBlob} />
      ) : (
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-rose/30" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base text-ink/70">{item.fileName}</p>
        {/* key por estado: cada cambio de estado entra con un fade corto. */}
        <p key={item.status} className="animate-enter text-base font-semibold text-ink">
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
          className="h-12 shrink-0 rounded-full bg-fuchsia px-4 text-base font-semibold text-white"
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

      {/* Sin animate-page: el hero entra escalonado y eso ya es la entrada de la pantalla. */}
      <main className="flex min-h-screen flex-col gap-6 pb-12">
        {/* Con foto: alto fijo (42svh), sin salto de layout al cargar y con
            "Sacar foto" visible sin scrollear a 360x640. Sin foto: campo bordó
            del alto de su contenido. */}
        <section
          className={`relative flex flex-col justify-end overflow-hidden bg-ink px-6 pb-6 text-white ${
            HERO_PHOTO ? 'h-[42svh] min-h-[240px]' : 'pt-12'
          }`}
        >
          {HERO_PHOTO && (
            <>
              <Image
                src={HERO_PHOTO}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-[50%_30%]"
              />
              <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-ink/85 to-transparent" />
            </>
          )}
          <div className="relative flex flex-col gap-2">
            <h1 className="animate-enter text-balance font-display text-4xl font-semibold leading-none">
              ¡Sumate a la fiesta!
            </h1>
            <p className="max-w-[34ch] animate-enter text-base leading-snug text-white/90 [animation-delay:60ms]">
              Sacá fotos de la noche y subilas acá — se van sumando al álbum de todos.
            </p>
            <p className="animate-enter text-sm font-semibold tabular-nums [animation-delay:120ms]">
              {nightCounterLabel(photoCount)}
            </p>
          </div>
        </section>
        <div className="scallop-edge" />

        <div className="flex animate-enter flex-col gap-6 px-6 [animation-delay:180ms]">
          {!hasStaged && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex h-16 items-center justify-center gap-3 rounded-full bg-fuchsia text-lg font-semibold text-white shadow-soft"
              >
                <Icon name="camera" />
                Sacar foto
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex h-14 items-center justify-center gap-3 rounded-full border border-ink/20 bg-surface text-base font-semibold text-ink"
              >
                <Icon name="images" className="h-5 w-5" />
                Elegir fotos
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
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>

              <input
                type="text"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Epígrafe (opcional)"
                aria-label="Epígrafe (opcional)"
                className="h-14 rounded-2xl border border-ink/20 bg-surface px-4 text-base text-ink placeholder:text-ink/70"
              />

              {missions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-ink/70">Misión (opcional)</p>
                  <div className="flex flex-wrap gap-2">
                    {missions.map((mission) => (
                      <button
                        key={mission.id}
                        type="button"
                        onClick={() =>
                          setMissionId((current) => (current === mission.id ? null : mission.id))
                        }
                        aria-pressed={missionId === mission.id}
                        className={`flex h-12 items-center gap-2 rounded-full px-4 text-base font-semibold ${
                          missionId === mission.id
                            ? 'bg-fuchsia text-white'
                            : 'border border-ink/20 bg-surface text-ink'
                        }`}
                      >
                        {missionId === mission.id && <Icon name="check" className="h-4 w-4" />}
                        {mission.title}
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
                  className="h-14 flex-1 rounded-full border border-ink/20 bg-surface text-base font-semibold text-ink disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmUpload()}
                  disabled={preparing}
                  className="h-14 flex-[2] rounded-full bg-fuchsia text-base font-semibold text-white shadow-soft disabled:opacity-40"
                >
                  {preparing
                    ? 'Preparando...'
                    : `Subir ${staged.length > 1 ? staged.length + ' fotos' : 'foto'}`}
                </button>
              </div>
            </div>
          )}

          {queue.length > 0 && (
            <ul aria-live="polite" className="flex flex-col gap-2">
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
