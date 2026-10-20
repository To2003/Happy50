import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chaptersWithPhotos, groupByChapter } from '../lib/book.ts'

const photo = (id: string, milestone: string | null, takenAt: string, guest: string | null = 'g1') => ({
  id,
  effective_milestone_id: milestone,
  guest_id: guest,
  taken_at: takenAt,
})

test('agrupa por capítulo efectivo y ordena por hora dentro de cada uno', () => {
  const grouped = groupByChapter(
    [
      photo('b', 'cena', '2026-10-20T22:30:00Z'),
      photo('a', 'cena', '2026-10-20T22:00:00Z'),
      photo('c', 'baile', '2026-10-21T01:00:00Z'),
    ],
    new Map(),
  )
  assert.deepEqual(grouped.get('cena')?.map((p) => p.id), ['a', 'b'])
  assert.deepEqual(grouped.get('baile')?.map((p) => p.id), ['c'])
})

test('fotos sin capítulo no aparecen', () => {
  const grouped = groupByChapter([photo('x', null, '2026-10-20T22:00:00Z')], new Map())
  assert.equal(grouped.size, 0)
})

test('pone el nombre del invitado, o null si no se conoce', () => {
  const grouped = groupByChapter(
    [photo('a', 'cena', '2026-10-20T22:00:00Z', 'g1'), photo('b', 'cena', '2026-10-20T22:01:00Z', 'g9'), photo('c', 'cena', '2026-10-20T22:02:00Z', null)],
    new Map([['g1', 'Marta']]),
  )
  assert.deepEqual(grouped.get('cena')?.map((p) => p.guest_name), ['Marta', null, null])
})

test('capítulos con fotos, en el orden de los momentos', () => {
  const milestones = [{ id: 'prologo' }, { id: 'cena' }, { id: 'baile' }, { id: 'torta' }]
  const grouped = new Map([['baile', [1]], ['prologo', [1]], ['torta', []]])
  assert.deepEqual(chaptersWithPhotos(milestones, grouped).map((m) => m.id), ['prologo', 'baile'])
})
