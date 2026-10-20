import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  bearerToken,
  codeFromResponse,
  deleteErrorMessage,
  deleteOwnPhoto,
  type DeletePhotoDeps,
} from '../lib/deletePhoto.ts'

const PHOTO = '11111111-2222-4333-8444-555555555555'

// Mock por defecto: sesión válida de u1 -> invitado g1, dueño de PHOTO.
function deps(over: Partial<DeletePhotoDeps> = {}) {
  const calls: string[] = []
  const d: DeletePhotoDeps = {
    userIdFromToken: async (t) => (t === 'valid' ? 'u1' : null),
    guestIdForUser: async (u) => (u === 'u1' ? 'g1' : null),
    photo: async (id) => (id === PHOTO ? { guestId: 'g1', status: 'visible' } : null),
    markDeleted: async (id, g) => {
      calls.push(`markDeleted ${id} ${g}`)
      return 1
    },
    ...over,
  }
  return { d, calls }
}

test('foto propia: 200 y un solo UPDATE con id y guest_id', async () => {
  const { d, calls } = deps()
  assert.deepEqual(await deleteOwnPhoto(d, 'valid', PHOTO), { ok: true, status: 200 })
  assert.deepEqual(calls, [`markDeleted ${PHOTO} g1`])
})

test('sin token o token inválido: 401 no_session, sin tocar la base', async () => {
  const { d, calls } = deps()
  assert.equal((await deleteOwnPhoto(d, null, PHOTO)).status, 401)
  const r = await deleteOwnPhoto(d, 'vencido', PHOTO)
  assert.equal(r.ok ? 0 : r.code, 'no_session')
  assert.deepEqual(calls, [])
})

test('foto de otro invitado: 403 not_owner y no se escribe nada', async () => {
  const { d, calls } = deps({ photo: async () => ({ guestId: 'g2', status: 'visible' }) })
  const r = await deleteOwnPhoto(d, 'valid', PHOTO)
  assert.equal(r.ok ? 0 : r.code, 'not_owner')
  assert.equal(r.status, 403)
  assert.deepEqual(calls, [])
})

test('sesión sin invitado (identificación de "foto propia" que no coincide): 403', async () => {
  const { d } = deps({ guestIdForUser: async () => null })
  const r = await deleteOwnPhoto(d, 'valid', PHOTO)
  assert.equal(r.ok ? 0 : r.code, 'not_owner')
})

test('foto inexistente o id con formato inválido: 404', async () => {
  const { d } = deps()
  assert.equal((await deleteOwnPhoto(d, 'valid', '99999999-2222-4333-8444-555555555555')).status, 404)
  assert.equal((await deleteOwnPhoto(d, 'valid', "1' or 1=1")).status, 404)
})

test('0 filas afectadas no se toma como éxito: 404 not_found', async () => {
  const { d } = deps({ markDeleted: async () => 0 })
  const r = await deleteOwnPhoto(d, 'valid', PHOTO)
  assert.equal(r.ok ? 0 : r.code, 'not_found')
})

test('ya estaba borrada: 200 sin volver a escribir (idempotente)', async () => {
  const { d, calls } = deps({ photo: async () => ({ guestId: 'g1', status: 'deleted' }) })
  assert.equal((await deleteOwnPhoto(d, 'valid', PHOTO)).status, 200)
  assert.deepEqual(calls, [])
})

test('error de la base (p. ej. RLS 42501): 500 con detalle solo para el log', async () => {
  const { d } = deps({
    markDeleted: async () => {
      throw new Error('new row violates row-level security policy for table "photos"')
    },
  })
  const r = await deleteOwnPhoto(d, 'valid', PHOTO)
  assert.equal(r.status, 500)
  assert.ok(!r.ok && r.code === 'server_error' && r.detail?.includes('row-level security'))
})

test('Authorization: solo "Bearer <token>"', () => {
  assert.equal(bearerToken('Bearer abc.def'), 'abc.def')
  assert.equal(bearerToken('bearer abc'), 'abc')
  assert.equal(bearerToken('Basic abc'), null)
  assert.equal(bearerToken(null), null)
})

test('cliente: código del cuerpo, o según el status si el cuerpo no sirve', () => {
  assert.equal(codeFromResponse(403, { code: 'not_owner' }), 'not_owner')
  assert.equal(codeFromResponse(503, { code: 'misconfigured' }), 'misconfigured')
  assert.equal(codeFromResponse(401, null), 'no_session')
  assert.equal(codeFromResponse(502, '<html>'), 'server_error')
  assert.equal(codeFromResponse(500, { code: 'cualquiera' }), 'server_error')
})

test('mensajes: "no es tuya" distinto de "reintentá", sin jerga técnica', () => {
  assert.match(deleteErrorMessage('not_owner'), /no es tuya/)
  assert.match(deleteErrorMessage('server_error'), /Probá de nuevo/)
  assert.equal(deleteErrorMessage('misconfigured'), deleteErrorMessage('server_error'))
  for (const c of ['not_owner', 'no_session', 'network', 'server_error'] as const) {
    assert.doesNotMatch(deleteErrorMessage(c), /error|RLS|500|403|token/i)
  }
})
