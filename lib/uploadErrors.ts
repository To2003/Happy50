// Clasifica errores de la subida sin depender del SDK (funciones puras, con tests).

function field(err: unknown, key: string): unknown {
  return err && typeof err === 'object' ? (err as Record<string, unknown>)[key] : undefined
}

// Storage contesta "ya existe" cuando un reintento vuelve a subir un archivo
// que el intento anterior sí llegó a guardar. Las rutas son UUID nuestros, así
// que si ya existe, es nuestra foto: cuenta como subida.
export function isAlreadyExistsError(err: unknown): boolean {
  const statusCode = field(err, 'statusCode')
  const status = field(err, 'status')
  const message = field(err, 'message')
  return (
    statusCode === '409' ||
    status === 409 ||
    (typeof message === 'string' && /already exists|duplicate/i.test(message))
  )
}

// Postgres 23505: la fila con ese id ya está (el insert anterior llegó pero se
// perdió la respuesta). La foto ya está guardada.
export function isUniqueViolation(err: unknown): boolean {
  return field(err, 'code') === '23505'
}

// Espera entre reintentos: 1 s, 2 s, 4 s… (SPEC.md sección 8).
export function retryDelayMs(attempt: number, baseMs = 1000): number {
  return baseMs * 2 ** attempt
}
