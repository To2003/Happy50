'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findExistingGuest } from '@/lib/guest'
import { buttonClasses } from '@/components/Button'
import { InviteCard } from '@/components/InviteCard'
import { CreditFooter } from '@/components/CreditFooter'

function Bienvenida() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    findExistingGuest()
      .then((guest) => {
        if (!active) return
        if (guest) {
          router.replace('/subir')
        } else {
          setChecking(false)
        }
      })
      .catch(() => {
        // Sin red no se puede saber si ya entraste: se muestra la bienvenida
        // en vez de dejar la pantalla en blanco.
        if (active) setChecking(false)
      })

    return () => {
      active = false
    }
  }, [router])

  if (checking) {
    return null
  }

  const mesa = searchParams.get('mesa')
  const entrarHref = mesa ? `/entrar?mesa=${encodeURIComponent(mesa)}` : '/entrar'

  return (
    <>
      <main id="contenido" className="flex flex-col">
        <InviteCard variant="poster" className="animate-enter" />
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 pb-10 pt-6">
          {/* La tarjeta es decorativa (aria-hidden): el título queda para lectores de pantalla. */}
          <h1 className="sr-only">50 años</h1>
          <div className="scallop-edge animate-enter [animation-delay:60ms]" />
          <p className="max-w-[30ch] animate-enter text-lg leading-snug text-ink [animation-delay:60ms]">
            Sumate a la fiesta y compartí tus fotos de la noche.
          </p>
          <a
            href={entrarHref}
            className={buttonClasses('primary', 'lg', 'animate-enter [animation-delay:120ms]')}
          >
            Sumate
          </a>
        </div>
      </main>
      <CreditFooter />
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Bienvenida />
    </Suspense>
  )
}
