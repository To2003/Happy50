import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

let cachedClient: SupabaseClient<Database> | undefined

// Cliente con service role — se salta RLS por completo. Solo lo importa
// código de /admin (server actions), nunca un Client Component. El import
// de "server-only" hace que el build falle si algo del cliente lo arrastra
// por error.
export function getAdminSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.')
  }

  cachedClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  return cachedClient
}
