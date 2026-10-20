import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Galería' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
