import { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

export interface TvPhoto {
  id: string
  storage_path: string
  caption: string | null
  guest_id: string | null
}

interface SlideState {
  current: TvPhoto | null
  next: TvPhoto | null
  isNew: boolean
  uploaderName: string | null
}

interface PhotoInsertRow {
  id: string
  storage_path: string
  caption: string | null
  guest_id: string | null
  status: string
}

const SLIDE_SECONDS = 6

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]
    copy[i] = copy[j] as T
    copy[j] = temp as T
  }
  return copy
}

// SPEC.md sección 7 (/tv): cicla el histórico sin repetir hasta agotar, y
// una foto nueva por Realtime se muestra dentro de los próximos ~20s con
// cartelito de autoría — por eso una cola de prioridad separada del ciclo
// histórico, no una sola lista.
export function useTvSlideshow(): SlideState {
  const [state, setState] = useState<SlideState>({
    current: null,
    next: null,
    isNew: false,
    uploaderName: null,
  })

  const allKnown = useRef<Map<string, TvPhoto>>(new Map())
  const historicalQueue = useRef<TvPhoto[]>([])
  const priorityQueue = useRef<TvPhoto[]>([])

  useEffect(() => {
    const supabase = getSupabaseClient()
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    function pickNext(): { photo: TvPhoto; isNew: boolean } | null {
      const fromPriority = priorityQueue.current.shift()
      if (fromPriority) {
        return { photo: fromPriority, isNew: true }
      }

      if (historicalQueue.current.length === 0 && allKnown.current.size > 0) {
        historicalQueue.current = shuffle(Array.from(allKnown.current.values()))
      }

      const fromHistorical = historicalQueue.current.shift()
      return fromHistorical ? { photo: fromHistorical, isNew: false } : null
    }

    function peekNext(): TvPhoto | null {
      return priorityQueue.current[0] ?? historicalQueue.current[0] ?? null
    }

    async function advance() {
      const picked = pickNext()
      if (!picked) return

      let uploaderName: string | null = null
      if (picked.isNew && picked.photo.guest_id) {
        const { data } = await supabase
          .from('guests')
          .select('name')
          .eq('id', picked.photo.guest_id)
          .maybeSingle()
        uploaderName = data?.name ?? null
      }

      if (!active) return

      setState({
        current: picked.photo,
        next: peekNext(),
        isNew: picked.isNew,
        uploaderName,
      })
    }

    async function init() {
      const { data } = await supabase
        .from('photos')
        .select('id, storage_path, caption, guest_id')
        .eq('status', 'visible')
        .order('taken_at', { ascending: false })
        .limit(700)

      if (!active) return

      for (const photo of data ?? []) {
        allKnown.current.set(photo.id, photo)
      }
      historicalQueue.current = shuffle(Array.from(allKnown.current.values()))

      await advance()
      timer = setInterval(() => void advance(), SLIDE_SECONDS * 1000)
    }

    void init()

    const channel = supabase
      .channel('tv-photos')
      .on<PhotoInsertRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'photos' },
        (payload) => {
          const row = payload.new
          if (row.status !== 'visible') return

          const photo: TvPhoto = {
            id: row.id,
            storage_path: row.storage_path,
            caption: row.caption,
            guest_id: row.guest_id,
          }

          allKnown.current.set(photo.id, photo)
          priorityQueue.current.push(photo)
        },
      )
      .subscribe()

    return () => {
      active = false
      if (timer) clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [])

  return state
}
