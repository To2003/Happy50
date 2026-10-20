import { BookTimeline } from '@/components/BookTimeline'

export default function BookPage() {
  return (
    <main className="min-h-screen animate-page">
      <div className="px-4 pt-8">
        <h1 className="text-balance font-display text-3xl text-ink">El book de la noche</h1>
      </div>
      <BookTimeline />
    </main>
  )
}
