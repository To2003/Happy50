import { BookTimeline } from '@/components/BookTimeline'

export default function BookPage() {
  return (
    <main className="min-h-screen">
      <div className="px-4 pt-6">
        <h1 className="font-display text-3xl text-ink">El book de la noche</h1>
      </div>
      <BookTimeline />
    </main>
  )
}
