import { getSupabaseClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

export type Guest = Database['public']['Tables']['guests']['Row']
export type PartyTable = Database['public']['Tables']['party_tables']['Row']

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
 * Busca la mesa por el `code` que viene en `?mesa=`. Devuelve null si el
 * código no existe (QR roto, link editado a mano) — en ese caso /entrar
 * cae al selector manual de mesa.
 */
export async function findTableByCode(code: string): Promise<PartyTable | null> {
  const supabase = getSupabaseClient()

  const { data: table } = await supabase
    .from('party_tables')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  return table ?? null
}

/**
 * Lista todas las mesas, para el selector de fallback en /entrar cuando
 * no llegó un `?mesa=` válido por query param.
 */
export async function listTables(): Promise<PartyTable[]> {
  const supabase = getSupabaseClient()

  const { data: tables, error } = await supabase
    .from('party_tables')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error || !tables) {
    throw new Error('No pudimos cargar las mesas, revisá la conexión y probá de nuevo.')
  }

  return tables
}

/**
 * Da de alta al invitado: crea la sesión anónima si todavía no existe
 * y guarda la fila en `guests` linkeada a ese uid y a la mesa.
 * Usar en /entrar al confirmar el formulario.
 */
export async function createGuest(name: string, tableId: string): Promise<Guest> {
  const supabase = getSupabaseClient()
  const userId = await ensureAnonymousUserId()

  const { data, error } = await supabase
    .from('guests')
    .insert({ user_id: userId, name, table_id: tableId })
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
