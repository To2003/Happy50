import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

const POLL_INTERVAL_MS = 20_000

// Contador de la noche ("Ya van 247 fotos"). Polling liviano en vez de
// Realtime a propósito: Realtime lo justificamos recién en Fase 3 para
// /tv, donde de verdad hace falta "en vivo" de verdad.
export function usePhotoCount(): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const supabase = getSupabaseClient()

    async function fetchCount() {
      const { count: current } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'visible')

      if (active) setCount(current ?? 0)
    }

    void fetchCount()
    const interval = setInterval(() => void fetchCount(), POLL_INTERVAL_MS)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return count
}

// Texto del contador. /subir dejó de mostrarlo (pedido de diseño), pero queda
// listo por si vuelve.
export function photoCountLabel(count: number | null): string {
  if (count === null) return ''
  if (count === 0) return 'Sé la primera persona en subir una foto'
  if (count === 1) return 'Va 1 foto'
  return `Van ${count} fotos`
}
