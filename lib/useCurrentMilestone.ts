import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface MilestoneRow {
  id: string
  name: string
  started_at: string | null
}

// Reactivo a propósito: /tv corre horas sin recargarse, así que si el admin
// marca "Arrancar ahora" un nuevo momento tiene que verse solo, sin F5.
export function useCurrentMilestoneName(): string | null {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    let active = true

    async function refresh() {
      const { data } = await supabase
        .from('milestones')
        .select('id, name, started_at')
        .eq('is_prologue', false)
        .not('started_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (active) setName(data?.name ?? null)
    }

    void refresh()

    const channel = supabase
      .channel('tv-milestones')
      .on<MilestoneRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'milestones' },
        () => void refresh(),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [])

  return name
}
