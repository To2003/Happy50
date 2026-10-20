import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runWithRetries, type RetryEnv } from '../lib/retry.ts'

function fakeEnv(offlineSequence: boolean[] = []) {
  const log: string[] = []
  const env: RetryEnv = {
    isOffline: () => offlineSequence.shift() ?? false,
    waitForOnline: async () => void log.push('wait'),
    delay: async (ms) => void log.push(`delay ${ms}`),
    delayFor: (attempt) => 1000 * 2 ** attempt,
    onFailedAttempt: async (n) => void log.push(`failed ${n}`),
  }
  return { env, log }
}

test('sube a la primera: un solo intento, sin esperas', async () => {
  const { env, log } = fakeEnv()
  let calls = 0
  await runWithRetries(async () => void calls++, 0, 3, env)
  assert.equal(calls, 1)
  assert.deepEqual(log, ['wait'])
})

test('falla dos veces y a la tercera sube, con espera creciente', async () => {
  const { env, log } = fakeEnv()
  let calls = 0
  await runWithRetries(async () => {
    calls++
    if (calls < 3) throw new Error('red')
  }, 0, 3, env)
  assert.equal(calls, 3)
  assert.deepEqual(log, ['wait', 'failed 1', 'delay 1000', 'wait', 'failed 2', 'delay 2000', 'wait'])
})

test('agota los intentos y tira el último error', async () => {
  const { env } = fakeEnv()
  await assert.rejects(runWithRetries(async () => { throw new Error('no') }, 0, 3, env), /no/)
})

test('respeta los intentos ya gastados (reintento manual resetea a 0 desde afuera)', async () => {
  const { env } = fakeEnv()
  let calls = 0
  await assert.rejects(runWithRetries(async () => { calls++; throw new Error('no') }, 2, 3, env))
  assert.equal(calls, 1)
})

test('un fallo estando offline no gasta intento', async () => {
  // Primer fallo: offline (no cuenta). Después falla online 3 veces.
  const { env, log } = fakeEnv([true, false, false, false])
  let calls = 0
  await assert.rejects(runWithRetries(async () => { calls++; throw new Error('corte') }, 0, 3, env))
  assert.equal(calls, 4)
  assert.equal(log.filter((l) => l.startsWith('failed')).length, 3)
})
