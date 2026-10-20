'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/EmptyState'
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
      <main className="flex min-h-screen flex-col justify-center px-6">
        <EmptyState>
          <p className="text-base text-ink/70">No encontramos esa mesa.</p>
        </EmptyState>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div className="flex flex-col gap-6 px-4 pb-6 pt-10">
        <h1 className="text-balance font-display text-4xl font-semibold leading-none text-ink">El book de {table.label}</h1>
        <div className="scallop-edge" />
      </div>
      <BookTimeline tableFilter={table} />
    </main>
  )
}
