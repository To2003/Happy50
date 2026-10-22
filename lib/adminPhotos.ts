import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export interface RecentPhotoForReassign {
  id: string
  storage_path: string
  thumb_path: string
  taken_at: string
  milestone_id: string | null
  milestone_override_id: string | null
}

// "Últimas fotos – reasignar individual" (Momentos): solo visibles, igual
// que /galeria y el book. Sin '@/' para poder testearla con un cliente falso.
export async function listRecentPhotosForReassign(
  supabase: SupabaseClient<Database>,
): Promise<RecentPhotoForReassign[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, thumb_path, taken_at, milestone_id, milestone_override_id')
    .eq('status', 'visible')
    .order('taken_at', { ascending: false })
    .limit(60)
  if (error || !data) throw new Error('No se pudieron cargar las fotos.')
  return data
}
