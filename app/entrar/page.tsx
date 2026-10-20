'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/Icon'
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
    <main className="flex min-h-svh flex-col justify-center gap-8 px-6 py-12">
      <div className="flex animate-enter flex-col gap-6">
        <h1 className="text-balance font-display text-4xl font-semibold leading-none text-ink">
          ¿Cómo te llamás?
        </h1>
        <div className="scallop-edge" />
      </div>

      <form onSubmit={handleSubmit} className="flex animate-enter flex-col gap-8 [animation-delay:60ms]">
        <input
          type="text"
          name="name"
          autoComplete="given-name"
          aria-label="Tu nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tu nombre"
          autoFocus
          className="h-14 rounded-2xl border border-ink/20 bg-surface px-4 text-lg text-ink outline-none placeholder:text-ink/70 focus:border-fuchsia focus:ring-1 focus:ring-fuchsia"
        />

        {!tableFromQr && (
          <div className="flex flex-col gap-3">
            <p className="font-display text-2xl font-semibold text-ink">¿En qué mesa estás?</p>
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
                  aria-pressed={selectedTableId === table.id}
                  className={`flex h-14 items-center justify-center gap-1.5 rounded-2xl px-2 text-base font-semibold ${
                    selectedTableId === table.id
                      ? 'bg-fuchsia text-white'
                      : 'border border-ink/20 bg-surface text-ink'
                  }`}
                >
                  {selectedTableId === table.id && <Icon name="check" className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{table.label ?? table.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-base text-danger">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-16 rounded-full bg-fuchsia text-lg font-semibold text-white shadow-soft disabled:opacity-40"
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
