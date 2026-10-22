import { NextResponse, type NextRequest } from 'next/server'
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE_SECONDS,
  createRateLimiter,
  decideAccess,
} from '@/lib/eventAccess'

// 10 claves inválidas por minuto por IP.
const limiter = createRateLimiter(10, 60_000)

export async function middleware(req: NextRequest) {
  const decision = await decideAccess({
    key: process.env.EVENT_ACCESS_KEY,
    url: req.nextUrl,
    cookie: req.cookies.get(ACCESS_COOKIE)?.value,
    // En Vercel, x-forwarded-for lo pone la plataforma (no lo elige el cliente).
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local',
    limiter,
  })
  if (decision.action === 'pass') return NextResponse.next()

  const res = NextResponse.redirect(new URL(decision.location, req.url), 303)
  // La URL de origen puede traer la clave: que no viaje en el Referer ni quede en caché.
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('Cache-Control', 'no-store')
  if (decision.setCookie) {
    res.cookies.set(ACCESS_COOKIE, decision.setCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_MAX_AGE_SECONDS,
    })
  }
  return res
}

// Solo las pantallas de invitado y /acceso. Quedan afuera /admin, /api (health
// y el borrado de fotos propias), /tv, los assets, el manifest, los íconos y robots.txt.
export const config = {
  matcher: ['/', '/entrar', '/subir', '/galeria', '/misiones', '/book/:path*', '/acceso'],
}
