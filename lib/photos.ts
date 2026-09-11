import { getSupabaseClient } from '@/lib/supabase/client'

interface InsertPhotoInput {
  id: string
  storagePath: string
  thumbPath: string
  width: number | null
  height: number | null
  caption: string | null
  missionId: string | null
  takenAt: string
}

// Recién se llama cuando display y thumb ya están subidas — ver
// SPEC.md sección 8, paso 6.
export async function insertPhoto(input: InsertPhotoInput): Promise<void> {
  const supabase = getSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Se cerró tu sesión, volvé a entrar para seguir subiendo.')
  }

  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (guestError || !guest) {
    throw new Error('No encontramos tu perfil de invitado.')
  }

  const { error } = await supabase.from('photos').insert({
    id: input.id,
    guest_id: guest.id,
    mission_id: input.missionId,
    storage_path: input.storagePath,
    thumb_path: input.thumbPath,
    width: input.width,
    height: input.height,
    caption: input.caption,
    taken_at: input.takenAt,
  })

  if (error) {
    throw new Error('No se pudo guardar la foto, la reintentamos sola.')
  }
}

// Borrado lógico: nunca se borra el archivo del storage ni la fila
// (SPEC.md sección 6). RLS solo deja pasar esto si la foto es del guest
// linkeado a la sesión activa.
export async function deleteOwnPhoto(photoId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('photos').update({ status: 'deleted' }).eq('id', photoId)

  if (error) {
    throw new Error('No se pudo borrar la foto, probá de nuevo.')
  }
}
