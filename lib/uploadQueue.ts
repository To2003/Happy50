import { get, set } from 'idb-keyval'

export type QueueStatus = 'waiting' | 'uploading' | 'done' | 'failed'

export interface QueueItem {
  id: string
  status: QueueStatus
  fileName: string
  caption: string | null
  missionId: string | null
  attempts: number
  progressPercent?: number
  errorMessage?: string
  displayBlob?: Blob
  thumbBlob?: Blob
  displayPath?: string
  thumbPath?: string
  takenAt?: string
  width?: number
  height?: number
}

const STORAGE_KEY = 'happy50-upload-queue'

let items: QueueItem[] = []
let hydrated = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

async function persist(): Promise<void> {
  await set(STORAGE_KEY, items)
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): QueueItem[] {
  return items
}

// Se llama una vez al montar /subir. Los items que quedaron "uploading"
// cuando se cerró el navegador vuelven a "waiting" para que el processor
// los reintente — ver SPEC.md sección 7 ("la cola sobrevive a que se
// cierre el navegador").
export async function hydrateQueue(): Promise<void> {
  if (hydrated) return
  hydrated = true

  const stored = await get<QueueItem[]>(STORAGE_KEY)
  if (stored) {
    items = stored.map((item) =>
      item.status === 'uploading' ? { ...item, status: 'waiting' } : item,
    )
    await persist()
  }

  notify()
}

export async function addItem(item: QueueItem): Promise<void> {
  items = [...items, item]
  await persist()
  notify()
}

export async function updateItem(id: string, patch: Partial<QueueItem>): Promise<void> {
  items = items.map((item) => (item.id === id ? { ...item, ...patch } : item))
  await persist()
  notify()
}
