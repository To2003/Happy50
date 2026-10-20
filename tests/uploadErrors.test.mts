import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAlreadyExistsError, isUniqueViolation, retryDelayMs } from '../lib/uploadErrors.ts'

test('storage: "ya existe" se reconoce por statusCode, status o mensaje', () => {
  assert.equal(isAlreadyExistsError({ statusCode: '409', message: 'x' }), true)
  assert.equal(isAlreadyExistsError({ status: 409 }), true)
  assert.equal(isAlreadyExistsError({ message: 'The resource already exists' }), true)
  assert.equal(isAlreadyExistsError({ message: 'Duplicate' }), true)
})

test('storage: otros errores no cuentan como subida', () => {
  assert.equal(isAlreadyExistsError({ statusCode: '403', message: 'new row violates row-level security policy' }), false)
  assert.equal(isAlreadyExistsError(new TypeError('Failed to fetch')), false)
  assert.equal(isAlreadyExistsError(null), false)
  assert.equal(isAlreadyExistsError('409'), false)
})

test('insert: solo 23505 es "ya estaba guardada"', () => {
  assert.equal(isUniqueViolation({ code: '23505' }), true)
  assert.equal(isUniqueViolation({ code: '42501' }), false)
  assert.equal(isUniqueViolation(undefined), false)
})

test('reintentos: espera creciente 1 s, 2 s, 4 s', () => {
  assert.deepEqual([0, 1, 2].map((a) => retryDelayMs(a)), [1000, 2000, 4000])
})
