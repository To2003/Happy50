'use client'

import { useEffect, useState } from 'react'
import { createTableAction, deleteTableAction, getTablesAction } from '../actions'
import type { Database } from '@/lib/database.types'

type PartyTable = Database['public']['Tables']['party_tables']['Row']

export function MesasTab() {
  const [tables, setTables] = useState<PartyTable[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setTables(await getTablesAction())
      setError(null)
    } catch {
      setError('No se pudo cargar. Puede ser la conexión — probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate() {
    if (!code.trim()) return
    setError(null)
    try {
      await createTableAction({
        code: code.trim(),
        label: label.trim() || null,
        sortOrder: tables.length + 1,
      })
      setCode('')
      setLabel('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear.')
    }
  }

  async function handleDelete(tableId: string) {
    setError(null)
    try {
      await deleteTableAction(tableId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar.')
    }
  }

  if (loading) return <p className="text-ink/70">Cargando...</p>

  if (error && tables.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-danger">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="h-10 rounded-lg bg-fuchsia text-white px-4 text-sm font-bold"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink/70">
        El código es lo que va impreso en el QR de esa mesa — cambiarlo o borrar la mesa después de
        imprimir rompe el QR.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-ink/70">
          Código
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="h-10 w-24 rounded-lg bg-rose/20 px-3 text-ink"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-ink/70">
          Nombre (opcional)
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="h-10 rounded-lg bg-rose/20 px-3 text-ink"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!code.trim()}
          className="h-10 rounded-lg bg-fuchsia text-white px-4 text-sm font-bold disabled:opacity-40"
        >
          Agregar
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      <ul className="flex flex-col gap-2">
        {tables.map((table) => (
          <li key={table.id} className="flex items-center gap-3 rounded-lg bg-surface p-3">
            <p className="flex-1">
              Mesa {table.code}
              {table.label && <span className="text-ink/70"> — {table.label}</span>}
            </p>
            <button
              type="button"
              onClick={() => void handleDelete(table.id)}
              className="h-10 rounded-lg bg-danger text-white px-3 text-sm font-medium"
            >
              Borrar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
