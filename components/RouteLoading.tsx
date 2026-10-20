import { Skeleton } from '@/components/Skeleton'

// loading.tsx de las pantallas de invitado: mismo esqueleto que la pantalla
// real (título, festón, grilla) mientras llega el código de la ruta.
export function RouteLoading() {
  return (
    <main className="flex min-h-screen flex-col gap-8 px-4 pb-12 pt-10" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-1/2 rounded-lg" />
        <div className="scallop-edge" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </main>
  )
}
