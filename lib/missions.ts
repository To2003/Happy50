import { getSupabaseClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

export type Mission = Database['public']['Tables']['missions']['Row']

// Selector opcional de misión en /subir. El photo bingo completo (/misiones)
// es Fase 5 — acá solo hace falta la lista para elegir al subir una foto.
export async function listActiveMissions(): Promise<Mission[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error || !data) {
    return []
  }

  return data
}
