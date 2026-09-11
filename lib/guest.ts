import { getSupabaseClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

export type Guest = Database['public']['Tables']['guests']['Row']

export type GroupTag = 'familia' | 'amigas' | 'trabajo' | 'vecinos' | 'otros'

/**
 * Busca al invitado de la sesión anónima activa, sin crear una sesión nueva.
 * Devuelve null si no hay sesión o si todavía no completó el alta.
 * Usar en "/" para decidir si redirigir directo a /subir.
 */
export async function findExistingGuest(): Promise<Guest | null> {
  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data: guest } = await supabase
    .from('guests')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  return guest ?? null
}

/**
 * Da de alta al invitado: crea la sesión anónima si todavía no existe
 * y guarda la fila en `guests` linkeada a ese uid.
 * Usar en /entrar al confirmar el formulario.
 */
export async function createGuest(name: string, groupTag: GroupTag): Promise<Guest> {
  const supabase = getSupabaseClient()
  const userId = await ensureAnonymousUserId()

  const { data, error } = await supabase
    .from('guests')
    .insert({ user_id: userId, name, group_tag: groupTag })
    .select()
    .single()

  if (error || !data) {
    throw new Error('No te pudimos guardar, revisá la conexión y probá de nuevo.')
  }

  return data
}

async function ensureAnonymousUserId(): Promise<string> {
  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) return session.user.id

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error || !data.user) {
    throw new Error('No te pudimos conectar, revisá la conexión y probá de nuevo.')
  }

  return data.user.id
}
