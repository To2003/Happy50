// Control de acceso por QR de la entrada. El QR apunta a /?k=<EVENT_ACCESS_KEY>;
// el middleware cambia esa clave por una cookie con su HMAC y saca la k de la
// URL. Sin la variable, el control queda apagado. Sin imports de Next ni de
// '@/': lo usan el middleware (Edge) y los tests de Node.

export const ACCESS_COOKIE = 'happy50_acceso'
export const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
export const ACCESS_PAGE = '/acceso'

const encoder = new TextEncoder()

// HMAC de un mensaje fijo con la clave: la cookie nunca lleva la clave en
// claro, y al rotar la clave todas las cookies viejas dejan de valer.
export async function accessToken(key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode('happy50-acceso-v1'))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Comparación en tiempo constante (Edge no tiene crypto.timingSafeEqual).
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

export function accessEnabled(key: string | undefined): key is string {
  return typeof key === 'string' && key.length > 0
}

export async function isValidAccessCookie(cookie: string | undefined, key: string): Promise<boolean> {
  return !!cookie && safeEqual(cookie, await accessToken(key))
}

// Se comparan los HMAC (largo fijo), no las claves: el tiempo no depende de k.
export async function isCorrectKey(k: string, key: string): Promise<boolean> {
  if (!k) return false // Web Crypto no acepta una clave HMAC vacía
  return safeEqual(await accessToken(k), await accessToken(key))
}

// Cuenta solo los FALLOS: en la fiesta todos salen por la misma IP pública.
// shortcut: memoria por instancia (cada instancia de Vercel cuenta aparte);
// si hiciera falta un límite global, pasar a un contador en Upstash/Postgres.
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const fails = new Map<string, { count: number; resetAt: number }>()
  const current = (id: string) => {
    const e = fails.get(id)
    return e && now() < e.resetAt ? e : null
  }
  return {
    blocked(id: string): boolean {
      return (current(id)?.count ?? 0) >= limit
    },
    fail(id: string): void {
      const e = current(id)
      if (e) {
        e.count++
        return
      }
      if (fails.size > 5000) fails.clear() // tope de memoria
      fails.set(id, { count: 1, resetAt: now() + windowMs })
    },
  }
}

export type RateLimiter = ReturnType<typeof createRateLimiter>

export type AccessDecision =
  | { action: 'pass' }
  // 303 a location; con setCookie, guarda ese token en ACCESS_COOKIE.
  | { action: 'redirect'; location: string; setCookie?: string }

// Decide qué hacer con un pedido a una pantalla de invitado o a /acceso.
export async function decideAccess(input: {
  key: string | undefined
  url: URL
  cookie: string | undefined
  ip: string
  limiter: RateLimiter
}): Promise<AccessDecision> {
  const { key, url, cookie, ip, limiter } = input
  if (!accessEnabled(key)) {
    return url.pathname === ACCESS_PAGE ? { action: 'redirect', location: '/' } : { action: 'pass' }
  }

  const hasCookie = await isValidAccessCookie(cookie, key)
  const k = url.searchParams.get('k')

  if (k !== null) {
    const clean = new URL(url)
    clean.searchParams.delete('k')
    const location = clean.pathname === ACCESS_PAGE ? '/' : clean.pathname + clean.search
    // Bloqueado: ni se evalúa k, aunque sea la correcta.
    if (!limiter.blocked(ip) && (await isCorrectKey(k, key))) {
      return { action: 'redirect', location, setCookie: await accessToken(key) }
    }
    limiter.fail(ip)
    return { action: 'redirect', location: hasCookie ? location : ACCESS_PAGE }
  }

  if (url.pathname === ACCESS_PAGE) return hasCookie ? { action: 'redirect', location: '/' } : { action: 'pass' }
  return hasCookie ? { action: 'pass' } : { action: 'redirect', location: ACCESS_PAGE }
}
