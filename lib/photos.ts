import { getSupabaseClient } from '@/lib/supabase/client'
import { isUniqueViolation } from '@/lib/uploadErrors'
import { codeFromResponse, deleteErrorMessage, type DeletePhotoCode } from '@/lib/deletePhoto'

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

  // 23505: el insert anterior llegó pero se perdió la respuesta; ya está guardada.
  if (error && !isUniqueViolation(error)) {
    throw new Error('No se pudo guardar la foto, la reintentamos sola.')
  }
}

export class DeletePhotoError extends Error {
  constructor(readonly code: DeletePhotoCode) {
    super(deleteErrorMessage(code))
  }
}

// Borrado lógico: nunca se borra el archivo del storage ni la fila
// (SPEC.md sección 6). Pasa por /api/photos/[id], que verifica en el servidor
// que la foto sea del invitado de esta sesión (ver la ruta para el porqué).
export async function deleteOwnPhoto(photoId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new DeletePhotoError('no_session')

  let response: Response
  try {
    response = await fetch(`/api/photos/${encodeURIComponent(photoId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
  } catch (err) {
    console.error('[borrar foto] sin respuesta del servidor:', err)
    throw new DeletePhotoError('network')
  }
  if (response.ok) return

  const body: unknown = await response.json().catch(() => null)
  const code = codeFromResponse(response.status, body)
  console.error(`[borrar foto] ${response.status} ${code}`)
  throw new DeletePhotoError(code)
}
