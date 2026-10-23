import { test } from 'node:test'
import assert from 'node:assert/strict'
import { onlyTableId } from '../lib/tables.ts'

test('una sola mesa: se preselecciona', () => {
  assert.equal(onlyTableId([{ id: 't1' }]), 't1')
})

test('ninguna o varias mesas: no se preselecciona nada', () => {
  assert.equal(onlyTableId([]), null)
  assert.equal(onlyTableId([{ id: 't1' }, { id: 't2' }]), null)
})
