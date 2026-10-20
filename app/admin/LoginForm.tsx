'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { loginAdminAction } from './actions'
import { Button } from '@/components/Button'
import { Input } from '@/components/Field'

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
    <main id="contenido" className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-8 px-6">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-4xl font-semibold leading-none text-ink">Admin</h1>
        <div className="scallop-edge" />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          aria-label="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña"
          invalid={!!error}
          aria-describedby={error ? 'login-error' : undefined}
          autoFocus
          className="text-lg"
        />
        {error && (
          <p id="login-error" role="alert" className="text-base text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={!password} loading={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
