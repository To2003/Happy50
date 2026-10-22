import type { Metadata } from 'next'
import { InviteCard } from '@/components/InviteCard'

export const metadata: Metadata = { title: 'Acceso' }

// Sin cookie de acceso, el middleware manda acá. No hay campo de clave: se
// entra solo escaneando el QR de la entrada.
export default function AccesoPage() {
  return (
    <main id="contenido" className="flex min-h-svh flex-col gap-8 pb-12">
      <InviteCard variant="poster" />
      <h1 className="mx-auto my-auto max-w-xl text-balance px-6 text-center text-xl text-ink">
        Escaneá el QR de la entrada para ingresar.
      </h1>
    </main>
  )
}
