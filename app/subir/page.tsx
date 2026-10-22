'use client'

import { Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findExistingGuest } from '@/lib/guest'
import { listActiveMissions, type Mission } from '@/lib/missions'
import { runPipeline } from '@/lib/pipeline/runPipeline'
import { addItem, hydrateQueue, removeItem, updateItem, type QueueItem } from '@/lib/uploadQueue'
import { startUploadProcessor } from '@/lib/uploadProcessor'
import { useUploadQueue } from '@/lib/useUploadQueue'
import { TopNav } from '@/components/TopNav'
import { Confetti } from '@/components/Confetti'
import { Icon, type IconName } from '@/components/Icon'
import { InviteCard } from '@/components/InviteCard'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { Input } from '@/components/Field'
import { Skeleton } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'


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

  if (!url) return <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
}

const STATUS_ICON: Record<QueueItem['status'], { name: IconName; className: string }> = {
  waiting: { name: 'clock', className: 'text-ink/70' },
  uploading: { name: 'loader', className: 'animate-spin text-accent-text' },
  done: { name: 'check', className: 'text-accent-text' },
  failed: { name: 'alert', className: 'text-danger' },
}

function QueueRow({
  item,
  onRetry,
  onDiscard,
}: {
  item: QueueItem
  onRetry: (id: string) => void
  onDiscard: (id: string) => void
}) {
  const icon = STATUS_ICON[item.status]
  const progress =
    item.status === 'done' ? 100 : item.status === 'uploading' ? (item.progressPercent ?? 0) : 0

  return (
    <li className="animate-enter">
      <Card className="flex items-center gap-3 p-3">
        {item.thumbBlob ? (
          <QueueThumb blob={item.thumbBlob} />
        ) : (
          <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="truncate text-sm text-ink/70">{item.fileName}</p>
          {/* key por estado: cada cambio de estado entra con un fade corto. */}
          <p key={item.status} className="flex animate-enter items-center gap-1.5 text-base font-semibold text-ink">
            <Icon name={icon.name} className={`h-4 w-4 shrink-0 ${icon.className}`} />
            {STATUS_LABEL[item.status]}
            {item.status === 'uploading' &&
              typeof item.progressPercent === 'number' &&
              <span className="tabular-nums">{` (${item.progressPercent}%)`}</span>}
          </p>
          {item.status === 'failed' ? (
            <p className="text-sm text-danger">{item.errorMessage ?? 'No se pudo subir.'}</p>
          ) : (
            <div className="h-1 overflow-hidden rounded-full bg-rose/60" aria-hidden>
              <div
                className={`h-full origin-left rounded-full transition-transform duration-400 ease-out ${
                  item.status === 'done' ? 'bg-accent' : 'bg-accent'
                }`}
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>
          )}
        </div>
        {item.status === 'failed' && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Button size="sm" icon="retry" onClick={() => onRetry(item.id)}>
              Reintentar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDiscard(item.id)} className="text-ink/70">
              Descartar
            </Button>
          </div>
        )}
      </Card>
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
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  // Último estado visto de cada foto. La primera vez solo se registra: así las
  // fotos que ya estaban listas al volver a /subir no festejan de nuevo.
  const seenStatus = useRef<Map<string, QueueItem['status']> | null>(null)

  const queue = useUploadQueue()
  const { toast, showToast } = useToast()

  useEffect(() => {
    let active = true

    findExistingGuest()
      .then((guest) => {
        if (!active) return
        if (!guest) {
          router.replace('/')
          return
        }
        setCheckingGuest(false)
      })
      .catch(() => {
        // Falló la consulta (wifi malo), no "no hay invitado": se muestra la
        // pantalla igual para que la cola siga y se pueda sacar fotos. La
        // inserción vuelve a chequear la sesión y el invitado del lado de RLS.
        if (active) setCheckingGuest(false)
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
    const previous = seenStatus.current
    seenStatus.current = new Map(queue.map((item) => [item.id, item.status]))
    if (!previous) return
    const newlyDone = queue.filter(
      // Solo transiciones vistas acá: lo que llega ya "done" (hidratado de
      // IndexedDB) no tiene estado previo y no festeja.
      (item) => item.status === 'done' && previous.has(item.id) && previous.get(item.id) !== 'done',
    )
    if (newlyDone.length === 0) return
    setConfettiTrigger((n) => n + 1)
    showToast(
      newlyDone.some((item) => item.missionId)
        ? '¡Misión cumplida! Tu foto ya está en el álbum'
        : newlyDone.length === 1
          ? '¡Listo! Tu foto ya está en el álbum'
          : `¡Listo! Ya están tus ${newlyDone.length} fotos en el álbum`,
    )
  }, [queue, showToast])

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    const next: StagedFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setStaged((current) => [...current, ...next])
    event.target.value = ''
  }

  function cancelStaged() {
    for (const item of staged) {
      URL.revokeObjectURL(item.previewUrl)
    }
    setStaged([])
    setCaption('')
  }

  async function confirmUpload() {
    setPreparing(true)

    // La selección queda a la vista (con "Preparando…") hasta que todas las
    // fotos están procesadas y en la cola; antes desaparecía al instante y no
    // había ninguna señal mientras se procesaban.
    const toProcess = staged

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
        }
      }),
    )

    for (const item of toProcess) URL.revokeObjectURL(item.previewUrl)
    setStaged([])
    if (anyFailed) {
      // Va como toast: el bloque de la selección ya no está para mostrarlo.
      showToast('Una de las fotos no se pudo procesar. Las demás ya están en la cola.', 'error')
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
      {toast}

      {/* Sin animate-page: el hero entra escalonado y eso ya es la entrada de la pantalla. */}
      {/* 4rem = alto de TopNav: la pantalla entra justa y los botones se centran
          en el espacio que sobra, sin vacío al pie. */}
      <main id="contenido" className="flex min-h-[calc(100svh-4rem)] flex-col gap-5 pb-8">
        <InviteCard />
        <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-2 px-6">
          <h1 className="animate-enter text-balance font-display text-3xl uppercase leading-none text-accent-text [@media(min-height:740px)]:text-4xl">
            ¡Sumate a la fiesta!
          </h1>
        </div>
        <div className="scallop-edge" />

        <div className="mx-auto flex w-full max-w-xl flex-1 animate-enter flex-col justify-center gap-6 px-6 [animation-delay:180ms]">
          {!hasStaged && (
            <div className="flex flex-col gap-4">
              <Button size="xl" icon="camera" onClick={() => cameraInputRef.current?.click()}>
                Sacar foto
              </Button>
              <Button size="xl" variant="secondary" icon="images" onClick={() => galleryInputRef.current?.click()}>
                Elegir fotos
              </Button>

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
                    className="aspect-square w-full animate-enter rounded-xl object-cover"
                  />
                ))}
              </div>

              <Input
                type="text"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Epígrafe (opcional)"
                aria-label="Epígrafe (opcional)"
                autoComplete="off"
              />

              {missions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-ink/70">Misión (opcional)</p>
                  <div className="flex flex-wrap gap-2">
                    {missions.map((mission) => (
                      <Chip
                        key={mission.id}
                        selected={missionId === mission.id}
                        onClick={() =>
                          setMissionId((current) => (current === mission.id ? null : mission.id))
                        }
                      >
                        {mission.title}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={cancelStaged} disabled={preparing} className="flex-1 px-4">
                  Cancelar
                </Button>
                <Button
                  icon="upload"
                  loading={preparing}
                  onClick={() => void confirmUpload()}
                  className="flex-[2] px-4"
                >
                  {preparing
                    ? 'Preparando…'
                    : `Subir ${staged.length > 1 ? staged.length + ' fotos' : 'foto'}`}
                </Button>
              </div>
            </div>
          )}

          {queue.length > 0 && (
            <ul aria-live="polite" className="flex flex-col gap-3">
              {queue.map((item) => (
                <QueueRow key={item.id} item={item} onRetry={retryItem} onDiscard={(id) => void removeItem(id)} />
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
