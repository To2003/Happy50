'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/EmptyState'
import { BookTimeline } from '@/components/BookTimeline'
import { PageHeader } from '@/components/PageHeader'
import { CreditFooter } from '@/components/CreditFooter'

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
      <main id="contenido" className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4">
        <EmptyState icon="book">
          <p className="text-base text-ink/70">No encontramos esa mesa.</p>
        </EmptyState>
      </main>
    )
  }

  return (
    <main id="contenido" className="mx-auto min-h-screen w-full max-w-5xl">
      <div className="px-4 pb-6 pt-10">
        <PageHeader title={`El book de ${table.label}`} />
      </div>
      <BookTimeline tableFilter={table} />
      <CreditFooter />
    </main>
  )
}
