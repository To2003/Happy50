import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'El book de la noche' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
