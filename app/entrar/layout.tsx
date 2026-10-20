import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sumate' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
