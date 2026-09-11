import exifr from 'exifr'
import type { ProcessedPhoto } from './types'

// SPEC.md sección 8: dos versiones, con objetivo de peso, bajando calidad
// iterativamente si hace falta.
const DISPLAY_MAX_SIDE = 1600
const DISPLAY_TARGET_BYTES = 300 * 1024
const DISPLAY_START_QUALITY = 0.82

const THUMB_MAX_SIDE = 400
const THUMB_TARGET_BYTES = 40 * 1024
const THUMB_START_QUALITY = 0.7

const MIN_QUALITY = 0.4
const QUALITY_STEP = 0.1

function looksLikeHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') return true
  const name = file.name.toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif')
}

async function readTakenAt(file: File): Promise<Date> {
  try {
    const raw: unknown = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'] })
    if (raw && typeof raw === 'object') {
      const tags = raw as Record<string, unknown>
      const candidate = tags.DateTimeOriginal ?? tags.CreateDate
      if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
        return candidate
      }
    }
  } catch {
    // Sin EXIF legible: cae al fallback de abajo, como dice el spec.
  }
  return new Date()
}

// Decodificación nativa primero (Safari puede abrir HEIC directo); si falla
// y el archivo es HEIC, heic2any como fallback. Ver SPEC.md sección 8 y
// CLAUDE.md — probar de verdad en iPhone en Fase 2, esto es la parte más
// frágil del pipeline.
async function decodeToBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (err) {
    if (!looksLikeHeic(file)) throw err

    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted

    if (!jpegBlob) {
      throw new Error('No pudimos abrir esa foto.')
    }

    return createImageBitmap(jpegBlob, { imageOrientation: 'from-image' })
  }
}

// Funciona igual en el hilo principal que en el Worker: usa OffscreenCanvas
// si existe (siempre en el Worker que armamos, ver runPipeline.ts) y cae a
// un <canvas> normal en el hilo principal cuando no hay Worker disponible.
function createCanvas(
  width: number,
  height: number,
): { canvas: OffscreenCanvas | HTMLCanvasElement; isOffscreen: boolean } {
  if (typeof OffscreenCanvas !== 'undefined') {
    return { canvas: new OffscreenCanvas(width, height), isOffscreen: true }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, isOffscreen: false }
}

function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  isOffscreen: boolean,
  quality: number,
): Promise<Blob> {
  if (isOffscreen) {
    return (canvas as OffscreenCanvas).convertToBlob({ type: 'image/jpeg', quality })
  }

  return new Promise((resolve, reject) => {
    ;(canvas as HTMLCanvasElement).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))),
      'image/jpeg',
      quality,
    )
  })
}

async function resizeAndCompress(
  bitmap: ImageBitmap,
  maxSide: number,
  targetBytes: number,
  startQuality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const { canvas, isOffscreen } = createCanvas(width, height)
  const ctx = canvas.getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null

  if (!ctx) {
    throw new Error('No se pudo procesar la imagen.')
  }

  ctx.drawImage(bitmap, 0, 0, width, height)

  let quality = startQuality
  let blob = await canvasToBlob(canvas, isOffscreen, quality)

  while (blob.size > targetBytes && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP)
    blob = await canvasToBlob(canvas, isOffscreen, quality)
  }

  return { blob, width, height }
}

export async function processImage(file: File): Promise<ProcessedPhoto> {
  const [takenAt, bitmap] = await Promise.all([readTakenAt(file), decodeToBitmap(file)])

  try {
    const display = await resizeAndCompress(
      bitmap,
      DISPLAY_MAX_SIDE,
      DISPLAY_TARGET_BYTES,
      DISPLAY_START_QUALITY,
    )
    const thumb = await resizeAndCompress(
      bitmap,
      THUMB_MAX_SIDE,
      THUMB_TARGET_BYTES,
      THUMB_START_QUALITY,
    )

    return {
      display: display.blob,
      thumb: thumb.blob,
      width: display.width,
      height: display.height,
      takenAt,
    }
  } finally {
    bitmap.close()
  }
}
