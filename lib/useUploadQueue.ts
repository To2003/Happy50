import { useSyncExternalStore } from 'react'
import { getSnapshot, subscribe, type QueueItem } from '@/lib/uploadQueue'

// Sin librería de estado global (ver CLAUDE.md): useSyncExternalStore de
// React alcanza para suscribirse a la cola persistida en IndexedDB.
export function useUploadQueue(): QueueItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
