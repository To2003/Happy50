'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { storage } from '@/lib/storage'
import { findExistingGuest } from '@/lib/guest'
import { listActiveMissions, type Mission } from '@/lib/missions'
import { TopNav } from '@/components/TopNav'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { useInitialStagger } from '@/lib/useInitialStagger'

interface Completion {
  missionId: string
  thumbPath: string
}

const PASTELS = ['bg-card-rose', 'bg-card-gold', 'bg-card-mauve', 'bg-card-peach']

export default function MisionesPage() {
  const router = useRouter()
  const [checkingGuest, setCheckingGuest] = useState(true)
  const [missions, setMissions] = useState<Mission[]>([])
  const [completions, setCompletions] = useState<Map<string, Completion>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const staggerFor = useInitialStagger(
    missions.map((mission) => mission.id),
    !checkingGuest && !loading && !error,
  )

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const guest = await findExistingGuest()
      if (!guest) {
        router.replace('/')
        return
      }

      const supabase = getSupabaseClient()
      const [missionsData, { data: photos }] = await Promise.all([
        listActiveMissions(),
        supabase
          .from('photos')
          .select('mission_id, thumb_path, created_at')
          .eq('guest_id', guest.id)
          .neq('status', 'deleted')
          .not('mission_id', 'is', null)
          .order('created_at', { ascending: false }),
      ])

      setMissions(missionsData)

      const byMission = new Map<string, Completion>()
      for (const photo of photos ?? []) {
        if (!photo.mission_id || byMission.has(photo.mission_id)) continue
        byMission.set(photo.mission_id, { missionId: photo.mission_id, thumbPath: photo.thumb_path })
      }
      setCompletions(byMission)
    } catch {
      setError('No se pudieron cargar las misiones. Puede ser la conexión — probá de nuevo.')
    } finally {
      setLoading(false)
      setCheckingGuest(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El chequeo de invitado y la carga van juntos en load(): skeleton para ambos
  // (si no hay invitado, redirige a la home igual que antes).
  if (checkingGuest || loading) {
    return (
      <>
        <TopNav />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 pb-12 pt-10" aria-busy="true">
          <PageHeader title="Misiones">
            <Skeleton className="h-1.5 w-full rounded-full" />
          </PageHeader>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <TopNav />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 pb-12 pt-10">
          <PageHeader title="Misiones" />
          <EmptyState icon="alert">
            <p className="text-base text-danger">{error}</p>
            <Button icon="retry" onClick={() => void load()}>
              Reintentar
            </Button>
          </EmptyState>
        </main>
      </>
    )
  }

  const doneCount = completions.size
  const totalCount = missions.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  return (
    <>
      <TopNav />
      <main id="contenido" className="mx-auto flex min-h-screen w-full max-w-5xl animate-page flex-col gap-8 px-4 pb-12 pt-10">
        <PageHeader
          title="Misiones"
          aside={
            <span className="font-display text-3xl tabular-nums leading-none text-accent">
              {doneCount}/{totalCount}
            </span>
          }
        >
          <p className="text-base text-ink/70">Tocá una para ir a sacarle la foto.</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blush/70">
            <div
              className="h-full origin-left rounded-full bg-accent transition-transform duration-400 ease-out"
              style={{ transform: `scaleX(${progressPercent / 100})` }}
            />
          </div>
        </PageHeader>

        {missions.length === 0 && (
          <EmptyState icon="target">
            <p className="text-base text-ink/70">Todavía no hay misiones. Volvé en un rato.</p>
          </EmptyState>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {missions.map((mission, index) => {
            const completion = completions.get(mission.id)
            const isDone = !!completion
            const pastel = PASTELS[index % PASTELS.length]
            const stagger = staggerFor(mission.id)

            return (
              <a
                key={mission.id}
                href={`/subir?mission=${mission.id}`}
                style={stagger.style}
                onAnimationEnd={stagger.onAnimationEnd}
                className={`press ${stagger.className ?? ''} relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl p-4 ${
                  isDone ? 'bg-ink text-white' : `${pastel} text-ink`
                }`}
              >
                {isDone ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={storage.getPublicUrl(completion.thumbPath)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-ink/90 to-transparent" />
                    <span className="relative flex h-8 w-8 items-center justify-center self-end rounded-full bg-surface text-accent">
                      <Icon name="check" className="h-5 w-5" />
                    </span>
                  </>
                ) : (
                  <Icon name="target" className="h-6 w-6 text-accent" />
                )}
                <span
                  className={`relative text-balance font-display text-xl leading-tight ${
                    isDone ? 'line-through decoration-blush decoration-2' : ''
                  }`}
                >
                  {mission.title}
                </span>
              </a>
            )
          })}
        </div>
      </main>
    </>
  )
}
