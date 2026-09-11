import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

// Le pega a Supabase para que el proyecto no se pause por inactividad
// (SPEC.md sección 3, "Nota operativa"). Lo llama un GitHub Action semanal,
// ver .github/workflows/keep-alive.yml.
export async function GET() {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('party_tables').select('id').limit(1)

  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
