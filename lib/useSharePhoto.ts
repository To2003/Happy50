'use client'

import { useEffect, useState } from 'react'

// Compartir la foto como archivo (WhatsApp la muestra como foto, no como link
// al bucket). La foto se baja al abrir el visor: iOS exige llamar a share()
// pegado al toque, sin un fetch en el medio. Si no se puede compartir el
// archivo, se comparte la URL. Sin Web Share devuelve null y no hay botón.
export function useSharePhoto(url: string, fileName: string): (() => Promise<void>) | null {
  const [file, setFile] = useState<File | null>(null)
  const supported = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!supported) return
    let active = true
    fetch(url)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (active) setFile(new File([blob], fileName, { type: blob.type || 'image/jpeg' }))
      })
      .catch(() => {
        // Sin archivo se comparte la URL: no hace falta avisar nada.
      })
    return () => {
      active = false
    }
  }, [url, fileName, supported])

  if (!supported) return null

  return async () => {
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        await navigator.share({ url })
      }
    } catch {
      // Cancelar el menú de compartir tira AbortError: no es un error para mostrar.
    }
  }
}
