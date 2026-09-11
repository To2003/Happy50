import { storage } from '@/lib/storage'
import { insertPhoto } from '@/lib/photos'
import { getSnapshot, subscribe, updateItem, type QueueItem } from '@/lib/uploadQueue'

// SPEC.md sección 8: 3 intentos, backoff exponencial.
const MAX_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1000

let processing = false

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function uploadOnce(item: QueueItem): Promise<void> {
  if (
    !item.displayBlob ||
    !item.thumbBlob ||
    !item.displayPath ||
    !item.thumbPath ||
    !item.takenAt
  ) {
    throw new Error('Falta información de la foto procesada.')
  }

  await updateItem(item.id, { progressPercent: 0 })
  await storage.upload(item.displayPath, item.displayBlob)

  await updateItem(item.id, { progressPercent: 50 })
  await storage.upload(item.thumbPath, item.thumbBlob)

  await updateItem(item.id, { progressPercent: 100 })
  await insertPhoto({
    id: item.id,
    storagePath: item.displayPath,
    thumbPath: item.thumbPath,
    width: item.width ?? null,
    height: item.height ?? null,
    caption: item.caption,
    missionId: item.missionId,
    takenAt: item.takenAt,
  })
}

async function uploadWithRetries(item: QueueItem): Promise<void> {
  for (let attempt = item.attempts; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await uploadOnce(item)
      return
    } catch (err) {
      const nextAttempt = attempt + 1
      await updateItem(item.id, { attempts: nextAttempt })

      if (nextAttempt >= MAX_ATTEMPTS) {
        throw err
      }

      await delay(RETRY_BASE_DELAY_MS * 2 ** attempt)
    }
  }
}

async function processNext(): Promise<boolean> {
  const next = getSnapshot().find((item) => item.status === 'waiting')
  if (!next) return false

  await updateItem(next.id, { status: 'uploading' })

  try {
    await uploadWithRetries({ ...next })
    await updateItem(next.id, { status: 'done', progressPercent: 100 })
  } catch (err) {
    await updateItem(next.id, {
      status: 'failed',
      errorMessage:
        err instanceof Error ? err.message : 'No se pudo subir, tocá para reintentar.',
    })
  }

  return true
}

async function runProcessor(): Promise<void> {
  if (processing) return
  processing = true

  try {
    let more = true
    while (more) {
      more = await processNext()
    }
  } finally {
    processing = false
  }
}

let started = false

// Se dispara solo cada vez que la cola cambia (foto nueva, reintento
// manual, hidratación desde IndexedDB al abrir /subir).
export function startUploadProcessor(): void {
  if (started) return
  started = true

  subscribe(() => {
    void runProcessor()
  })

  void runProcessor()
}
