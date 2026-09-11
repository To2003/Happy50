'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { loginAdminAction } from './actions'

export function LoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { success } = await loginAdminAction(password)
    if (success) {
      router.refresh()
    } else {
      setError('Contraseña incorrecta.')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña"
          autoFocus
          className="h-14 rounded-lg bg-neutral-900 px-4 text-lg outline-none ring-pink-600 focus:ring-2"
        />
        {error && <p className="text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="h-14 rounded-lg bg-pink-600 text-lg font-bold disabled:opacity-40"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
