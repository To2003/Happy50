'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createGuest, type GroupTag } from '@/lib/guest'

const GROUPS: { value: GroupTag; label: string }[] = [
  { value: 'familia', label: 'Familia' },
  { value: 'amigas', label: 'Amigas/os' },
  { value: 'trabajo', label: 'Trabajo' },
  { value: 'vecinos', label: 'Vecinos' },
  { value: 'otros', label: 'Otros' },
]

export default function EntrarPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [group, setGroup] = useState<GroupTag | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && group !== null && !loading

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !group) return

    setLoading(true)
    setError(null)

    try {
      await createGuest(name.trim(), group)
      router.push('/subir')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal, probá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center gap-8 px-6 py-10">
      <h1 className="text-3xl font-bold">¿Cómo te llamás?</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tu nombre"
          autoFocus
          className="h-14 rounded-lg bg-neutral-900 px-4 text-lg outline-none ring-pink-600 focus:ring-2"
        />

        <div className="flex flex-col gap-3">
          <p className="text-lg">¿De qué lado venís?</p>
          <div className="grid grid-cols-2 gap-3">
            {GROUPS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setGroup(option.value)}
                className={`h-14 rounded-lg text-lg font-medium transition-colors ${
                  group === option.value
                    ? 'bg-pink-600'
                    : 'bg-neutral-900 active:bg-neutral-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-14 rounded-lg bg-pink-600 text-lg font-bold disabled:opacity-40"
        >
          {loading ? 'Un segundo...' : 'Sumate'}
        </button>
      </form>
    </main>
  )
}
