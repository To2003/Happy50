'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findExistingGuest } from '@/lib/guest'
import { buttonClasses } from '@/components/Button'

function Bienvenida() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    findExistingGuest().then((guest) => {
      if (!active) return
      if (guest) {
        router.replace('/subir')
      } else {
        setChecking(false)
      }
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
    <main className="flex min-h-svh flex-col justify-between gap-10 px-6 pb-10 pt-12">
      <h1 className="animate-enter font-display leading-[0.8]">
        <span className="block text-[min(64vw,44svh)] font-semibold tracking-[-0.05em] text-fuchsia">
          50{' '}
        </span>
        <span className="block text-5xl text-ink">años</span>
      </h1>
      <div className="flex flex-col gap-6">
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
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Bienvenida />
    </Suspense>
  )
}
