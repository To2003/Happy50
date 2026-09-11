'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'
import { storage } from '@/lib/storage'
import { useTvSlideshow } from '@/lib/tvSlideshow'
import { useCurrentMilestoneName } from '@/lib/useCurrentMilestone'

interface Layer {
  key: string
  url: string
  visible: boolean
}

function Clock() {
  // null en el primer render (server y cliente coinciden ahí) — new Date()
  // recién en el efecto, que solo corre en el cliente. Si lo calculáramos
  // en el useState inicial, server y cliente lo evalúan en momentos
  // distintos y React tira hydration mismatch.
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  if (!now) return null

  return <>{now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</>
}

function QrOverlay() {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  useEffect(() => {
    if (!siteUrl) return
    QRCode.toDataURL(siteUrl, { margin: 1, width: 160 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null))
  }, [siteUrl])

  if (!dataUrl) return null

  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-3 rounded-lg bg-black/60 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="QR para subir fotos" className="h-20 w-20" />
      <p className="max-w-[8rem] text-sm text-white">Subí tus fotos acá</p>
    </div>
  )
}

function TvScreen() {
  const slide = useTvSlideshow()
  const milestoneName = useCurrentMilestoneName()
  const [layers, setLayers] = useState<Layer[]>([])

  const currentId = slide.current?.id
  const currentPath = slide.current?.storage_path

  useEffect(() => {
    if (!currentId || !currentPath) return
    const url = storage.getPublicUrl(currentPath)

    // Como máximo 2 capas (la que entra, la que sale) — la vieja se pisa
    // sola, sin acumular <img> de más. Ver SPEC.md: 6 horas sin memory leaks.
    setLayers((prev) => {
      const fadingOut = prev.map((layer) => ({ ...layer, visible: false }))
      return [...fadingOut, { key: currentId, url, visible: true }].slice(-2)
    })
  }, [currentId, currentPath])

  const nextPath = slide.next?.storage_path

  useEffect(() => {
    if (!nextPath) return
    const preload = new window.Image()
    preload.src = storage.getPublicUrl(nextPath)
  }, [nextPath])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {layers.map((layer) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={layer.key}
          src={layer.url}
          alt=""
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-1000"
          style={{ opacity: layer.visible ? 1 : 0 }}
        />
      ))}

      {slide.isNew && slide.uploaderName && (
        <div className="absolute left-6 top-6 rounded-lg bg-black/60 px-4 py-2 text-white">
          Recién subida por {slide.uploaderName}
        </div>
      )}

      <div className="absolute right-6 top-6 flex flex-col items-end gap-1 text-right text-white">
        <span className="text-3xl font-bold">
          <Clock />
        </span>
        {milestoneName && <span className="text-lg text-neutral-300">{milestoneName}</span>}
      </div>

      <QrOverlay />
    </main>
  )
}

function GateOrScreen() {
  const searchParams = useSearchParams()
  const key = searchParams.get('key')
  const expectedKey = process.env.NEXT_PUBLIC_TV_KEY

  const authorized = useMemo(() => !!expectedKey && key === expectedKey, [key, expectedKey])

  if (!authorized) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black p-6 text-center text-white">
        <p>Pedile el link completo a quien organiza la fiesta.</p>
      </main>
    )
  }

  return <TvScreen />
}

export default function TvPage() {
  return (
    <Suspense fallback={null}>
      <GateOrScreen />
    </Suspense>
  )
}
