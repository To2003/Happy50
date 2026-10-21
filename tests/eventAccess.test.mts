import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACCESS_PAGE,
  accessToken,
  createRateLimiter,
  decideAccess,
  isCorrectKey,
  safeEqual,
} from '../lib/eventAccess.ts'

const KEY = 'fiesta-de-ine-2026'
const BASE = 'https://album.example'

function decide(path: string, opts: { key?: string; cookie?: string; ip?: string; limiter?: ReturnType<typeof createRateLimiter> } = {}) {
  return decideAccess({
    key: 'key' in opts ? opts.key : KEY,
    url: new URL(path, BASE),
    cookie: opts.cookie,
    ip: opts.ip ?? '1.2.3.4',
    limiter: opts.limiter ?? createRateLimiter(10, 60_000),
  })
}

test('sin variable (o vacía) el control está apagado: todo pasa', async () => {
  for (const key of [undefined, '']) {
    assert.deepEqual(await decide('/', { key }), { action: 'pass' })
    assert.deepEqual(await decide('/galeria', { key }), { action: 'pass' })
    assert.deepEqual(await decide('/?k=lo-que-sea', { key }), { action: 'pass' })
    assert.deepEqual(await decide('/acceso', { key }), { action: 'redirect', location: '/' })
  }
})

test('k válida: cookie con el HMAC y 303 a la misma URL sin k', async () => {
  const d = await decide(`/?k=${KEY}&mesa=7`)
  assert.equal(d.action, 'redirect')
  assert.ok(d.action === 'redirect')
  assert.equal(d.location, '/?mesa=7')
  assert.equal(d.setCookie, await accessToken(KEY))
  assert.match(d.setCookie ?? '', /^[0-9a-f]{64}$/)
  assert.ok(!(d.setCookie ?? '').includes(KEY))

  assert.deepEqual(await decide(`/galeria?k=${encodeURIComponent(KEY)}`), {
    action: 'redirect',
    location: '/galeria',
    setCookie: await accessToken(KEY),
  })
  // Desde /acceso, a la home (no de vuelta a /acceso).
  const fromAcceso = await decide(`/acceso?k=${KEY}`)
  assert.ok(fromAcceso.action === 'redirect')
  assert.equal(fromAcceso.location, '/')
})

test('k inválida: a /acceso, sin cookie y sin la k en la URL', async () => {
  for (const k of ['', 'otra', KEY + 'x', KEY.toUpperCase()]) {
    assert.deepEqual(await decide(`/?k=${k}`), { action: 'redirect', location: ACCESS_PAGE })
  }
  // Con cookie válida, k mala solo se limpia de la URL.
  assert.deepEqual(await decide('/subir?k=otra', { cookie: await accessToken(KEY) }), {
    action: 'redirect',
    location: '/subir',
  })
})

test('cookie válida: pasa a las pantallas y /acceso manda a la home', async () => {
  const cookie = await accessToken(KEY)
  for (const p of ['/', '/entrar', '/subir', '/galeria', '/misiones', '/book', '/book/mesa/A1']) {
    assert.deepEqual(await decide(p, { cookie }), { action: 'pass' })
  }
  assert.deepEqual(await decide('/acceso', { cookie }), { action: 'redirect', location: '/' })
})

test('sin cookie o cookie inválida: a /acceso; /acceso se muestra', async () => {
  for (const cookie of [undefined, '', 'abc', KEY]) {
    assert.deepEqual(await decide('/galeria', { cookie }), { action: 'redirect', location: ACCESS_PAGE })
  }
  assert.deepEqual(await decide('/acceso'), { action: 'pass' })
})

test('rotación: la cookie de la clave vieja deja de valer', async () => {
  const vieja = await accessToken('clave-vieja')
  assert.deepEqual(await decide('/', { key: 'clave-vieja', cookie: vieja }), { action: 'pass' })
  assert.deepEqual(await decide('/', { key: 'clave-nueva', cookie: vieja }), {
    action: 'redirect',
    location: ACCESS_PAGE,
  })
})

test('límite: 10 k inválidas por IP bloquean hasta la k correcta por un minuto', async () => {
  let t = 0
  const limiter = createRateLimiter(10, 60_000, () => t)
  for (let i = 0; i < 10; i++) await decide('/?k=mal', { limiter })
  assert.deepEqual(await decide(`/?k=${KEY}`, { limiter }), { action: 'redirect', location: ACCESS_PAGE })
  // Otra IP no se ve afectada.
  const otra = await decide(`/?k=${KEY}`, { limiter, ip: '5.6.7.8' })
  assert.ok(otra.action === 'redirect' && otra.setCookie)
  // Pasado el minuto, vuelve a entrar.
  t = 60_001
  const despues = await decide(`/?k=${KEY}`, { limiter })
  assert.ok(despues.action === 'redirect' && despues.setCookie)
})

test('límite: los aciertos no cuentan (toda la fiesta sale por la misma IP)', async () => {
  const limiter = createRateLimiter(10, 60_000)
  for (let i = 0; i < 50; i++) await decide(`/?k=${KEY}`, { limiter })
  for (let i = 0; i < 9; i++) await decide('/?k=mal', { limiter })
  const d = await decide(`/?k=${KEY}`, { limiter })
  assert.ok(d.action === 'redirect' && d.setCookie)
})

test('isCorrectKey y safeEqual', async () => {
  assert.equal(await isCorrectKey(KEY, KEY), true)
  assert.equal(await isCorrectKey('', KEY), false)
  assert.equal(await isCorrectKey(` ${KEY}`, KEY), false)
  assert.equal(safeEqual('abc', 'abc'), true)
  assert.equal(safeEqual('abc', 'abd'), false)
  assert.equal(safeEqual('abc', 'abcd'), false)
  assert.equal(safeEqual('', ''), true)
})
