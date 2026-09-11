import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'happy50_admin'
const MAX_AGE_SECONDS = 60 * 60 * 12

// No es un sistema de auth general — es un admin único para un evento
// puntual (SPEC.md sección 5). El cookie guarda un HMAC de ADMIN_PASSWORD,
// nunca la contraseña en texto plano, y solo lo puede reproducir quien
// conoce esa env var (server-side).
function sessionToken(): string {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) {
    throw new Error('Falta ADMIN_PASSWORD en las variables de entorno.')
  }
  return createHmac('sha256', secret).update('happy50-admin-session').digest('hex')
}

export async function createAdminSession(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || password !== expected) {
    return false
  }

  const store = await cookies()
  store.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/admin',
  })

  return true
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies()
  // delete(nombre) solo, sin más, borra un cookie en path "/" — el nuestro
  // se seteó con path: "/admin", así que hay que borrarlo con el mismo path
  // o el browser lo trata como un cookie distinto y el viejo queda vivo.
  store.delete({ name: COOKIE_NAME, path: '/admin' })
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies()
  const cookieValue = store.get(COOKIE_NAME)?.value
  if (!cookieValue) return false

  let expected: string
  try {
    expected = sessionToken()
  } catch {
    return false
  }

  const provided = Buffer.from(cookieValue)
  const target = Buffer.from(expected)
  if (provided.length !== target.length) return false

  return timingSafeEqual(provided, target)
}
