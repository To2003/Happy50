import type { ProcessedPhoto } from './types'
import type { PipelineRequest, PipelineResponse } from './worker'

let worker: Worker | null = null
let listenerAttached = false
let workerSupported: boolean | null = null

const pending = new Map<
  string,
  { resolve: (photo: ProcessedPhoto) => void; reject: (error: Error) => void }
>()

function supportsWorkerPipeline(): boolean {
  if (workerSupported === null) {
    workerSupported = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
  }
  return workerSupported
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url))
  }

  if (!listenerAttached) {
    worker.addEventListener('message', (event: MessageEvent<PipelineResponse>) => {
      const response = event.data
      const callbacks = pending.get(response.id)
      if (!callbacks) return

      pending.delete(response.id)
      if (response.ok) {
        callbacks.resolve(response.result)
      } else {
        callbacks.reject(new Error(response.error))
      }
    })
    listenerAttached = true
  }

  return worker
}

// Punto único de entrada al pipeline de imagen: procesa en un Web Worker
// cuando el navegador lo soporta (para no congelar la UI con selecciones
// grandes), y cae al hilo principal si no — mismo código de compress.ts en
// los dos casos. Ver SPEC.md sección 8.
export async function runPipeline(file: File): Promise<ProcessedPhoto> {
  if (!supportsWorkerPipeline()) {
    const { processImage } = await import('./compress')
    return processImage(file)
  }

  const activeWorker = getWorker()
  const id = crypto.randomUUID()

  return new Promise<ProcessedPhoto>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const request: PipelineRequest = { id, file }
    activeWorker.postMessage(request)
  })
}
