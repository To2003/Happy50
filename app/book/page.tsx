import { BookTimeline } from '@/components/BookTimeline'

export default function BookPage() {
  return (
    <main className="min-h-screen animate-page">
      <div className="flex flex-col gap-6 px-4 pb-6 pt-10">
        <h1 className="text-balance font-display text-4xl font-semibold leading-none text-ink">El book de la noche</h1>
        <div className="scallop-edge" />
      </div>
      <BookTimeline />
    </main>
  )
}
