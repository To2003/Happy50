import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from '@/components/Icon'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'xl' | 'lg' | 'md' | 'sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white shadow-soft',
  secondary: 'border border-accent text-accent-text',
  danger: 'bg-danger text-white',
  ghost: 'text-ink',
}

const SIZES: Record<Size, string> = {
  xl: 'h-[72px] px-8 text-xl gap-3',
  lg: 'h-16 px-8 text-lg gap-3',
  md: 'h-14 px-6 text-base gap-2.5',
  sm: 'h-11 px-4 text-sm gap-2',
}

// Clases compartidas con los links que se ven como botón (<a> / <Link>).
export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `press inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'xl' ? 'h-6 w-6' : 'h-5 w-5'
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? (
        <Icon name="loader" className={`${iconSize} animate-spin`} />
      ) : (
        icon && <Icon name={icon} className={iconSize} />
      )}
      {children}
    </button>
  )
}
