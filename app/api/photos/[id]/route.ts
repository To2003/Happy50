import { NextResponse } from 'next/server'
import { getAdminSupabaseClient } from '@/lib/supabase/server'
import { bearerToken, deleteOwnPhoto, type DeletePhotoDeps } from '@/lib/deletePhoto'

// Borrado lógico de una foto propia. Excepción a "las escrituras de invitado
// van directo a Supabase" (CLAUDE.md): con la RLS actual, el UPDATE a
// status = 'deleted' lo rechaza Postgres porque la fila nueva deja de cumplir
// photos_select_visible (ver sql/propuesta-seguridad.sql). Acá se verifica el
// JWT del invitado y que la foto sea suya, y recién ahí se escribe con la
// clave de servicio, en un único UPDATE filtrado por id y guest_id.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let supabase: ReturnType<typeof getAdminSupabaseClient>
  try {
    supabase = getAdminSupabaseClient()
  } catch (err) {
    console.error('[borrar foto] falta configuración del servidor:', err)
    return NextResponse.json({ code: 'misconfigured' }, { status: 503 })
  }

  const deps: DeletePhotoDeps = {
    async userIdFromToken(token) {
      const { data, error } = await supabase.auth.getUser(token)
      return error || !data.user ? null : data.user.id
    },
    async guestIdForUser(userId) {
      const { data, error } = await supabase.from('guests').select('id').eq('user_id', userId).maybeSingle()
      if (error) throw new Error(`guests: ${error.message}`)
      return data?.id ?? null
    },
    async photo(photoId) {
      const { data, error } = await supabase
        .from('photos')
        .select('guest_id, status')
        .eq('id', photoId)
        .maybeSingle()
      if (error) throw new Error(`photos select: ${error.message}`)
      return data ? { guestId: data.guest_id, status: data.status } : null
    },
    async markDeleted(photoId, guestId) {
      const { data, error } = await supabase
        .from('photos')
        .update({ status: 'deleted' })
        .eq('id', photoId)
        .eq('guest_id', guestId)
        .select('id')
      if (error) throw new Error(`photos update: ${error.code ?? ''} ${error.message}`)
      return data.length
    },
  }

  const result = await deleteOwnPhoto(deps, bearerToken(request.headers.get('authorization')), id)
  if (result.ok) return NextResponse.json({ ok: true })

  // El detalle técnico va al log de Vercel; al cliente, solo el código.
  if (result.code === 'server_error' || result.detail) {
    console.error(`[borrar foto] ${result.code} (${result.status}) foto=${id}: ${result.detail ?? ''}`)
  }
  return NextResponse.json({ code: result.code }, { status: result.status })
}
