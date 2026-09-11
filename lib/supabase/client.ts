import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno.',
  )
}

// Único punto de creación del cliente Supabase del browser (anon key).
// Ningún otro archivo llama a createClient() directamente.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
