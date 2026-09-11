'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { BookTimeline } from '@/components/BookTimeline'

export default function BookMesaPage() {
  const params = useParams<{ code: string }>()
  const [table, setTable] = useState<{ id: string; label: string } | null | undefined>(undefined)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase
      .from('party_tables')
      .select('id, code, label')
      .eq('code', params.code)
      .maybeSingle()
      .then(({ data }) => {
        setTable(data ? { id: data.id, label: data.label ?? `Mesa ${data.code}` } : null)
      })
  }, [params.code])

  if (table === undefined) return null

  if (table === null) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-neutral-400">No encontramos esa mesa.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">El book de {table.label}</h1>
      </div>
      <BookTimeline tableFilter={table} />
    </main>
  )
}
