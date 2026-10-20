import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonClasses } from '@/components/Button'

export const metadata: Metadata = { title: 'No encontramos esta página' }

// 404 con la identidad de la home: el número grande hace de título visual.
export default function NotFound() {
  return (
    <main id="contenido" className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-between gap-10 px-6 pb-10 pt-12">
      <p aria-hidden className="font-display text-[min(56vw,40svh)] font-semibold leading-[0.8] tracking-[-0.05em] text-fuchsia/20">
        404
      </p>
      <div className="flex flex-col gap-6">
        <div className="scallop-edge" />
        <h1 className="text-balance font-display text-4xl font-semibold leading-none text-ink">
          No encontramos esta página
        </h1>
        <p className="max-w-[32ch] text-lg leading-snug text-ink">
          Puede que el link esté mal escrito. Volvé al inicio y seguí desde ahí.
        </p>
        <Link href="/" className={buttonClasses('primary', 'lg')}>
          Ir al inicio
        </Link>
      </div>
    </main>
  )
}
