'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'

type Tone = 'success' | 'error'

interface ToastState {
  id: number
  message: string
  tone: Tone
  leaving: boolean
}

const VISIBLE_MS = 3500
const LEAVE_MS = 200

// Toast local a cada pantalla (sin estado global): la pantalla renderiza
// `toast` y llama a `showToast`. Uno a la vez; el nuevo reemplaza al anterior.
export function useToast() {
  const [state, setState] = useState<ToastState | null>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  const showToast = useCallback((message: string, tone: Tone = 'success') => {
    clearTimers()
    const id = Date.now()
    setState({ id, message, tone, leaving: false })
    timers.current.push(
      window.setTimeout(() => setState((s) => (s?.id === id ? { ...s, leaving: true } : s)), VISIBLE_MS),
      window.setTimeout(() => setState((s) => (s?.id === id ? null : s)), VISIBLE_MS + LEAVE_MS),
    )
  }, [])

  useEffect(() => clearTimers, [])

  const toast = (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {state && (
        <div
          key={state.id}
          className={`flex max-w-sm animate-enter items-center gap-3 rounded-2xl bg-ink px-5 py-4 text-base font-semibold text-white shadow-lift transition-opacity duration-200 ${
            state.leaving ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Icon
            name={state.tone === 'success' ? 'check' : 'alert'}
            className={`h-5 w-5 shrink-0 ${state.tone === 'success' ? 'text-blush' : 'text-rose'}`}
          />
          {state.message}
        </div>
      )}
    </div>
  )

  return { toast, showToast }
}
