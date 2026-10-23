'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { Input } from '@/components/Field'
import { createGuest, findTableByCode, listTables, type PartyTable } from '@/lib/guest'
import { onlyTableId } from '@/lib/tables'

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
  // Error al cargar las mesas y "Reintentar": guests.table_id es obligatorio,
  // así que sin mesas no se puede entrar.
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [reloading, setReloading] = useState(false)

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
        setTablesError(null)
        const onlyId = onlyTableId(allTables)
        if (onlyId) setSelectedTableId(onlyId)
      } catch (err) {
        if (active) setTablesError(err instanceof Error ? err.message : 'No pudimos cargar las mesas, probá de nuevo.')
      } finally {
        if (active) {
          setResolving(false)
          setReloading(false)
        }
      }
    }

    resolve()

    return () => {
      active = false
    }
  }, [mesaCode, reloadKey])

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
    <main id="contenido" className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-8 px-6 py-12">
      <div className="flex animate-enter flex-col gap-6">
        <h1 className="text-balance font-display text-4xl uppercase leading-none text-accent-text">
          ¿Cómo te llamás?
        </h1>
        <div className="scallop-edge" />
      </div>

      <form onSubmit={handleSubmit} className="flex animate-enter flex-col gap-8 [animation-delay:60ms]">
        <Input
          type="text"
          name="name"
          autoComplete="given-name"
          aria-label="Tu nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tu nombre"
          autoFocus
          className="text-lg"
        />

        {/* Con una sola mesa ya quedó elegida: solo nombre y entrar. */}
        {!tableFromQr && !(tables.length === 1 && !tablesError) && (
          <div className="flex flex-col gap-3">
            <p className="font-display text-2xl uppercase leading-none text-accent-text">¿En qué mesa estás?</p>
            {(tablesError || tables.length === 0) && (
              <div className="flex flex-col items-start gap-3">
                <p role="alert" className="text-base text-danger">
                  {tablesError ?? 'Todavía no hay mesas cargadas. Avisale a quien organiza y probá de nuevo.'}
                </p>
                <Button
                  variant="secondary"
                  icon="retry"
                  loading={reloading}
                  onClick={() => {
                    setReloading(true)
                    setReloadKey((k) => k + 1)
                  }}
                >
                  Reintentar
                </Button>
              </div>
            )}
            {mesaCode && tables.length > 0 && (
              <p className="text-base text-ink/70">
                No encontramos esa mesa, elegí la tuya de la lista.
              </p>
            )}
            <div className="grid grid-cols-3 gap-3">
              {tables.map((table) => (
                <Chip
                  key={table.id}
                  selected={selectedTableId === table.id}
                  onClick={() => setSelectedTableId(table.id)}
                  className="h-14 rounded-2xl px-2"
                >
                  {table.label ?? table.code}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-base text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={!canSubmit} loading={loading}>
          {loading ? 'Un segundo…' : 'Sumate'}
        </Button>
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
