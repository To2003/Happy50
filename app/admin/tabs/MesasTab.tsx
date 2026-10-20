'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createTableAction, deleteTableAction, getTablesAction } from '../actions'
import { unwrap } from '../unwrap'
import { AdminSkeleton, AdminTable } from '../AdminTable'
import type { Database } from '@/lib/database.types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Dialog } from '@/components/Dialog'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Field'
import { useToast } from '@/components/Toast'

type PartyTable = Database['public']['Tables']['party_tables']['Row']

export function MesasTab() {
  const [tables, setTables] = useState<PartyTable[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toDelete, setToDelete] = useState<PartyTable | null>(null)
  const { toast, showToast } = useToast()

  async function load() {
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setCodeError('Poné el código de la mesa.')
      return
    }
    if (tables.some((t) => t.code === trimmed)) {
      setCodeError('Ya hay una mesa con ese código.')
      return
    }
    setCodeError(null)
    setCreating(true)
    try {
      unwrap(
        await createTableAction({
          code: trimmed,
          label: label.trim() || null,
          sortOrder: tables.length + 1,
        }),
      )
      setCode('')
      setLabel('')
      await load()
      showToast('Mesa agregada')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo crear.', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      unwrap(await deleteTableAction(toDelete.id))
      await load()
      showToast('Mesa borrada')
      setToDelete(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo borrar.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <AdminSkeleton />

  if (error && tables.length === 0) {
    return (
      <EmptyState icon="alert">
        <p className="text-base text-danger">{error}</p>
        <Button icon="retry" onClick={() => void load()}>
          Reintentar
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink/70">
        El código es lo que va impreso en el QR de esa mesa — cambiarlo o borrar la mesa después de
        imprimir rompe el QR.
      </p>

      <Card>
        <form onSubmit={handleCreate} noValidate className="flex flex-wrap items-start gap-3">
          <label className="flex w-28 flex-col gap-1.5 text-sm font-semibold text-ink/70">
            Código
            <Input
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                setCodeError(null)
              }}
              invalid={!!codeError}
              aria-describedby={codeError ? 'mesa-codigo-error' : undefined}
              className="h-11 px-3"
            />
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-sm font-semibold text-ink/70">
            Nombre (opcional)
            <Input value={label} onChange={(event) => setLabel(event.target.value)} className="h-11 px-3" />
          </label>
          <Button type="submit" size="sm" icon="plus" loading={creating} className="mt-[1.625rem]">
            Agregar
          </Button>
          {codeError && (
            <p id="mesa-codigo-error" className="w-full text-sm text-danger">
              {codeError}
            </p>
          )}
        </form>
      </Card>

      {tables.length === 0 ? (
        <EmptyState icon="users">
          <p className="text-base text-ink/70">Todavía no hay mesas. Agregá la primera arriba.</p>
        </EmptyState>
      ) : (
        <AdminTable head={['Código', 'Nombre', '']}>
          {tables.map((table) => (
            <tr key={table.id}>
              <td className="px-3 py-2 text-base font-semibold tabular-nums text-ink">Mesa {table.code}</td>
              <td className="px-3 py-2 text-base text-ink/80">{table.label ?? '—'}</td>
              <td className="px-3 py-2 text-right max-sm:ml-auto">
                <Button variant="ghost" size="sm" icon="trash" onClick={() => setToDelete(table)} className="text-danger">
                  Borrar
                </Button>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      {toDelete && (
        <Dialog title={`¿Borrar la mesa ${toDelete.code}? Si ya imprimiste su QR, deja de funcionar.`} onClose={() => !deleting && setToDelete(null)}>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setToDelete(null)} disabled={deleting} className="flex-1 px-4">
              No
            </Button>
            <Button variant="danger" icon="trash" loading={deleting} onClick={() => void confirmDelete()} className="flex-1 px-4">
              Sí, borrar
            </Button>
          </div>
        </Dialog>
      )}
      {toast}
    </div>
  )
}
