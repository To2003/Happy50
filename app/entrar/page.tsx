'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createGuest, findTableByCode, listTables, type PartyTable } from '@/lib/guest'

function EntrarForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mesaCode = searchParams.get('mesa')

  const [resolving, setResolving] = useState(true)
  const [tableFromQr, setTableFromQr] = useState<PartyTable | null>(null)
  const [tables, setTables] = useState<PartyTable[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function resolve() {
      if (mesaCode) {
        const table = await findTableByCode(mesaCode)
        if (!active) return
        if (table) {
          setTableFromQr(table)
          setSelectedTableId(table.id)
          setResolving(false)
          return
        }
      }

      // Sin mesa por QR, o el código no existe: mostramos el selector manual.
      try {
        const allTables = await listTables()
        if (!active) return
        setTables(allTables)
      } catch {
        // Si falla la lista, dejamos que intente enviar igual — ahí se ve el error real.
      } finally {
        if (active) setResolving(false)
      }
    }

    resolve()

    return () => {
      active = false
    }
  }, [mesaCode])

  const canSubmit = name.trim().length > 0 && selectedTableId !== null && !loading

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !selectedTableId) return

    setLoading(true)
    setError(null)

    try {
      await createGuest(name.trim(), selectedTableId)
      router.push('/subir')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal, probá de nuevo.')
      setLoading(false)
    }
  }

  if (resolving) {
    return null
  }

  return (
    <main className="flex min-h-screen flex-col justify-center gap-8 px-6 py-10">
      <h1 className="font-display text-4xl leading-tight text-ink">¿Cómo te llamás?</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tu nombre"
          autoFocus
          className="h-14 rounded-2xl border border-rose bg-surface px-4 text-lg text-ink shadow-soft outline-none placeholder:text-ink/50 focus:ring-2 focus:ring-fuchsia"
        />

        {!tableFromQr && (
          <div className="flex flex-col gap-3">
            <p className="text-lg font-bold text-ink">¿En qué mesa estás?</p>
            {mesaCode && (
              <p className="text-base text-ink/70">
                No encontramos esa mesa, elegí la tuya de la lista.
              </p>
            )}
            <div className="grid grid-cols-3 gap-3">
              {tables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => setSelectedTableId(table.id)}
                  className={`h-14 rounded-2xl text-lg font-bold transition-colors duration-150 ease-out ${
                    selectedTableId === table.id
                      ? 'bg-fuchsia text-white shadow-soft'
                      : 'border-2 border-rose bg-surface text-ink active:bg-rose/20'
                  }`}
                >
                  {table.label ?? table.code}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-base text-danger">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-16 rounded-full bg-fuchsia text-xl font-bold text-white shadow-soft active:opacity-90 disabled:opacity-40"
        >
          {loading ? 'Un segundo...' : 'Sumate'}
        </button>
      </form>
    </main>
  )
}

export default function EntrarPage() {
  return (
    <Suspense fallback={null}>
      <EntrarForm />
    </Suspense>
  )
}
