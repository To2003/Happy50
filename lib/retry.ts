// Bucle de reintentos de la subida, sin dependencias (con tests en tests/).
// Recibe el entorno inyectado para poder probar cortes de red sin red.
export interface RetryEnv {
  isOffline: () => boolean
  waitForOnline: () => Promise<void>
  delay: (ms: number) => Promise<void>
  delayFor: (attempt: number) => number
  onFailedAttempt: (attemptsSoFar: number) => Promise<void>
}

// Intenta `task` hasta `maxAttempts` veces contando desde `startAttempt`.
// Sin conexión espera a que vuelva; un fallo mientras se está offline no
// gasta intento. Si se agotan los intentos, tira el último error.
export async function runWithRetries(
  task: () => Promise<void>,
  startAttempt: number,
  maxAttempts: number,
  env: RetryEnv,
): Promise<void> {
  let attempt = startAttempt
  while (attempt < maxAttempts) {
    await env.waitForOnline()
    try {
      await task()
      return
    } catch (err) {
      if (env.isOffline()) continue
      attempt++
      await env.onFailedAttempt(attempt)
      if (attempt >= maxAttempts) throw err
      await env.delay(env.delayFor(attempt - 1))
    }
  }
}
