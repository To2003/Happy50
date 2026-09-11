'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findExistingGuest } from '@/lib/guest'

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-4xl font-bold">50 años</h1>
      <p className="text-lg text-neutral-300">
        Sumate a la fiesta y compartí tus fotos de la noche.
      </p>
      <a
        href={entrarHref}
        className="flex h-14 min-w-48 items-center justify-center rounded-lg bg-pink-600 px-10 text-lg font-bold active:bg-pink-700"
      >
        Sumate
      </a>
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
