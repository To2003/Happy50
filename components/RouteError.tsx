'use client'

import Link from 'next/link'
import { Button, buttonClasses } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'

// error.tsx de las pantallas de invitado: algo falló al renderizar. Se puede
// reintentar sin recargar, o volver al inicio.
export function RouteError({ reset }: { reset: () => void }) {
  return (
    <main id="contenido" className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center px-4 py-12">
      <EmptyState icon="alert">
        <h1 className="text-balance font-display text-2xl font-semibold text-ink">Algo no salió bien</h1>
        <p className="text-base text-ink/70">Puede ser la conexión. Probá de nuevo; tus fotos en cola no se pierden.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button icon="retry" onClick={reset}>
            Reintentar
          </Button>
          <Link href="/" className={buttonClasses('secondary')}>
            Ir al inicio
          </Link>
        </div>
      </EmptyState>
    </main>
  )
}
