import { processImage } from './compress'
import type { ProcessedPhoto } from './types'

export interface PipelineRequest {
  id: string
  file: File
}

export type PipelineResponse =
  | { id: string; ok: true; result: ProcessedPhoto }
  | { id: string; ok: false; error: string }

// No usamos la lib "webworker" de TS acá a propósito: convive mal con "dom"
// (ambas declaran `self` distinto) en un solo tsconfig para todo el proyecto.
// En cambio tipamos nosotros la porción de la API de Worker que usamos.
interface WorkerScope {
  postMessage(message: PipelineResponse): void
  onmessage: ((event: MessageEvent<PipelineRequest>) => void) | null
}

const ctx = self as unknown as WorkerScope

ctx.onmessage = async (event) => {
  const { id, file } = event.data

  try {
    const result = await processImage(file)
    ctx.postMessage({ id, ok: true, result })
  } catch (err) {
    ctx.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido procesando la imagen.',
    })
  }
}
