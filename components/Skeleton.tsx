// Placeholder de carga con brillo que cruza (solo transform). Con
// reduced-motion queda quieto: el corte global deja una sola iteración.
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`skeleton block bg-rose/40 ${className}`} />
}
