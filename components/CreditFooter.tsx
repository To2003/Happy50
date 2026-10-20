import { CREDIT_URL } from '@/lib/credit'

const TEXT = 'Diseñado y desarrollado por Tomás Aguilar · Full Stack Developer'

// Crédito discreto: solo en home y al final de galería y book. Nunca en el
// flujo de subida ni en el admin.
export function CreditFooter() {
  return (
    <footer className="px-4 py-8 text-center text-sm text-ink/70">
      {CREDIT_URL ? (
        <a
          href={CREDIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-ink/30 underline-offset-4"
        >
          {TEXT}
        </a>
      ) : (
        TEXT
      )}
    </footer>
  )
}
