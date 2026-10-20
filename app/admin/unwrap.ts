import type { ActionResult } from './actions'

// Del lado del cliente: un resultado con error vuelve a ser una excepción con
// el mensaje en español que armó la acción, para los try/catch de las tabs.
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error)
  return result.data
}
