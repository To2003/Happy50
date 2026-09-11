import { getSupabaseClient } from '@/lib/supabase/client'

// Dar un corazón es toggle (SPEC.md sección 6).
export async function hasHearted(photoId: string, guestId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('hearts')
    .select('photo_id')
    .eq('photo_id', photoId)
    .eq('guest_id', guestId)
    .maybeSingle()

  return !!data
}

export async function addHeart(photoId: string, guestId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('hearts').insert({ photo_id: photoId, guest_id: guestId })

  if (error) {
    throw new Error('No se pudo dar el corazón, probá de nuevo.')
  }
}

export async function removeHeart(photoId: string, guestId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('hearts')
    .delete()
    .eq('photo_id', photoId)
    .eq('guest_id', guestId)

  if (error) {
    throw new Error('No se pudo sacar el corazón, probá de nuevo.')
  }
}
