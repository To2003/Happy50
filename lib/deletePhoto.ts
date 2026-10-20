// Borrado lógico de una foto propia (SPEC.md sección 6), verificado en el
// servidor. Funciones puras con dependencias inyectadas: tests en tests/.

export type DeletePhotoCode =
  | 'no_session' // sin token o token inválido/vencido
  | 'not_owner' // la foto existe pero es de otro invitado (o no sos invitado)
  | 'not_found' // no existe, o se borró entre la verificación y el update
  | 'misconfigured' // falta configuración del servidor (p. ej. la clave de servicio)
  | 'server_error' // falló la base u otra cosa inesperada
  | 'network' // solo del lado del cliente: no llegó al servidor

const STATUS: Record<Exclude<DeletePhotoCode, 'network'>, number> = {
  no_session: 401,
  not_owner: 403,
  not_found: 404,
  misconfigured: 503,
  server_error: 500,
}

export interface DeletePhotoDeps {
  // uid del token verificado contra Supabase Auth; null si no es válido.
  userIdFromToken: (token: string) => Promise<string | null>
  guestIdForUser: (userId: string) => Promise<string | null>
  photo: (photoId: string) => Promise<{ guestId: string | null; status: string } | null>
  // UPDATE ... SET status = 'deleted' WHERE id = ? AND guest_id = ?: devuelve
  // las filas afectadas. El guest_id en el WHERE repite la verificación en la
  // misma sentencia (sin carrera entre chequear y escribir).
  markDeleted: (photoId: string, guestId: string) => Promise<number>
}

export type DeletePhotoResult =
  | { ok: true; status: 200 }
  | { ok: false; status: number; code: Exclude<DeletePhotoCode, 'network'>; detail?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(code: Exclude<DeletePhotoCode, 'network'>, detail?: string): DeletePhotoResult {
  return { ok: false, status: STATUS[code], code, detail }
}

export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i)
  return match?.[1] ?? null
}

// El borrado es una sola sentencia sobre una sola fila: o queda 'deleted' o no
// cambia nada. No hay archivo que borrar (el de Storage se conserva a propósito),
// así que no puede quedar una foto a medio borrar.
export async function deleteOwnPhoto(
  deps: DeletePhotoDeps,
  token: string | null,
  photoId: string,
): Promise<DeletePhotoResult> {
  if (!token) return fail('no_session')
  if (!UUID.test(photoId)) return fail('not_found')

  try {
    const userId = await deps.userIdFromToken(token)
    if (!userId) return fail('no_session')

    const guestId = await deps.guestIdForUser(userId)
    if (!guestId) return fail('not_owner', 'la sesión no tiene invitado')

    const photo = await deps.photo(photoId)
    if (!photo) return fail('not_found')
    if (photo.guestId !== guestId) return fail('not_owner')
    if (photo.status === 'deleted') return { ok: true, status: 200 } // idempotente

    const affected = await deps.markDeleted(photoId, guestId)
    if (affected === 0) return fail('not_found', 'update sin filas afectadas')
    return { ok: true, status: 200 }
  } catch (err) {
    return fail('server_error', err instanceof Error ? err.message : String(err))
  }
}

// Del lado del cliente: el código que mandó el servidor, o server_error si la
// respuesta no es la esperada.
export function codeFromResponse(status: number, body: unknown): DeletePhotoCode {
  const code = body && typeof body === 'object' ? (body as Record<string, unknown>).code : undefined
  if (typeof code === 'string' && code in STATUS) return code as DeletePhotoCode
  return status === 401 ? 'no_session' : status === 403 ? 'not_owner' : 'server_error'
}

// Lo que ve el invitado: distingue "no es tuya" y "sesión" de "reintentá".
export function deleteErrorMessage(code: DeletePhotoCode): string {
  switch (code) {
    case 'not_owner':
      return 'Esta foto no es tuya, así que no la podés borrar.'
    case 'no_session':
      return 'Se cerró tu sesión. Volvé a entrar con el link de la fiesta para borrarla.'
    case 'network':
      return 'Se te cayó la conexión. Probá de nuevo en un ratito.'
    default:
      return 'No se pudo borrar la foto. Probá de nuevo.'
  }
}
