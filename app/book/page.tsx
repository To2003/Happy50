import { BookTimeline } from '@/components/BookTimeline'
import { PageHeader } from '@/components/PageHeader'
import { CreditFooter } from '@/components/CreditFooter'

export default function BookPage() {
  return (
    <main id="contenido" className="min-h-screen animate-page">
      <div className="px-4 pb-6 pt-10">
        <PageHeader title="El book de la noche" />
      </div>
      <BookTimeline />
      <CreditFooter />
    </main>
  )
}
