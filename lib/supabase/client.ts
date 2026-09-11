import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

let cachedClient: SupabaseClient<Database> | undefined

// Único punto de creación del cliente Supabase del browser (anon key).
// Lazy a propósito: Next.js prerenderiza páginas de cliente en el servidor
// durante el build, y ahí no hace falta (ni conviene) que existan las env
// vars de Supabase. Si creáramos el cliente al importar el módulo, el build
// se rompería apenas faltara una env var en el entorno de build.
export function getSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno.',
    )
  }

  cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
  return cachedClient
}
