import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

const BASE =
  'h-14 min-w-0 rounded-2xl border bg-surface px-4 text-base text-ink placeholder:text-ink/70 disabled:opacity-40'

// `invalid` pinta el borde de error; el mensaje va aparte, al lado del campo.
export function Input({
  invalid = false,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`${BASE} w-full ${invalid ? 'border-danger' : 'border-accent'} ${className}`}
      {...rest}
    />
  )
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${BASE} h-12 rounded-full border-accent font-semibold ${className}`} {...rest} />
}
