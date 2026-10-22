import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types.ts'
import { listRecentPhotosForReassign } from '../lib/adminPhotos.ts'

type Row = { id: string; status: string; taken_at: string }

// Cliente falso: aplica de verdad eq/order/limit sobre las filas, así el test
// falla si la consulta deja de filtrar (no solo si cambia el texto).
function fakeClient(rows: Row[], fail = false) {
  const calls: string[] = []
  let result = [...rows]
  const builder = {
    select(cols: string) {
      calls.push(`select ${cols}`)
      return builder
    },
    eq(col: keyof Row, value: string) {
      calls.push(`eq ${col}=${value}`)
      result = result.filter((r) => r[col] === value)
      return builder
    },
    order(col: keyof Row, opts: { ascending: boolean }) {
      result.sort((a, b) => (opts.ascending ? 1 : -1) * a[col].localeCompare(b[col]))
      return builder
    },
    limit(n: number) {
      result = result.slice(0, n)
      return builder
    },
    then<T>(resolve: (v: { data: Row[] | null; error: { message: string } | null }) => T) {
      return Promise.resolve(resolve(fail ? { data: null, error: { message: 'boom' } } : { data: result, error: null }))
    },
  }
  const client = { from: (table: string) => (calls.push(`from ${table}`), builder) }
  return { client: client as unknown as SupabaseClient<Database>, calls }
}

const at = (h: number) => `2026-10-23T${String(h).padStart(2, '0')}:00:00Z`

test('reasignar individual: solo fotos visibles, ni borradas ni ocultas', async () => {
  const { client, calls } = fakeClient([
    { id: 'visible-1', status: 'visible', taken_at: at(21) },
    { id: 'borrada', status: 'deleted', taken_at: at(23) },
    { id: 'oculta', status: 'hidden', taken_at: at(22) },
    { id: 'visible-2', status: 'visible', taken_at: at(20) },
  ])
  const photos = await listRecentPhotosForReassign(client)
  assert.deepEqual(photos.map((p) => p.id), ['visible-1', 'visible-2'])
  assert.ok(calls.includes('from photos'))
  assert.ok(calls.includes('eq status=visible'))
})

test('reasignar individual: filtra antes del límite (60 visibles aunque haya muchas borradas)', async () => {
  const rows: Row[] = Array.from({ length: 100 }, (_, i) => ({
    id: `b${i}`,
    status: 'deleted',
    taken_at: `2026-10-23T23:${String(i % 60).padStart(2, '0')}:00Z`,
  }))
  for (let i = 0; i < 70; i++) rows.push({ id: `v${i}`, status: 'visible', taken_at: at(i % 23) })
  const photos = await listRecentPhotosForReassign(fakeClient(rows).client)
  assert.equal(photos.length, 60)
  assert.ok(photos.every((p) => p.id.startsWith('v')))
})

test('reasignar individual: error de la base -> mensaje en castellano', async () => {
  await assert.rejects(listRecentPhotosForReassign(fakeClient([], true).client), /No se pudieron cargar las fotos/)
})
