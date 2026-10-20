import type { ReactNode } from 'react'

// Tabla del admin: encabezado fijo dentro de su propio scroll, para que las
// columnas sigan a la vista en listas largas (también en el celu).
export function AdminTable({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="max-h-[65vh] overflow-auto rounded-2xl border border-rose bg-surface">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {head.map((label, i) => (
              <th
                key={i}
                scope="col"
                className="sticky top-0 z-10 whitespace-nowrap border-b border-rose bg-surface px-3 py-3 font-semibold text-ink/70"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rose">{children}</tbody>
      </table>
    </div>
  )
}

// Carga de una tab: filas grises con brillo en lugar de "Cargando...".
export function AdminSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden className="skeleton block h-14 rounded-xl bg-rose/40" />
      ))}
    </div>
  )
}
