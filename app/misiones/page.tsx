'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { storage } from '@/lib/storage'
import { findExistingGuest } from '@/lib/guest'
import { listActiveMissions, type Mission } from '@/lib/missions'
import { TopNav } from '@/components/TopNav'

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

  if (checkingGuest || loading) return null

  if (error) {
    return (
      <>
        <TopNav />
        <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-base text-danger">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="h-12 rounded-full bg-fuchsia px-6 text-base font-bold text-white"
          >
            Reintentar
          </button>
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
      <main className="flex min-h-screen flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl text-ink">Misiones</h1>
            <span className="text-base font-bold text-ink">
              {doneCount}/{totalCount}
            </span>
          </div>
          <p className="text-base text-ink/70">Tocá una para ir a sacarle la foto.</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-rose/30">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {missions.map((mission, index) => {
            const completion = completions.get(mission.id)
            const isDone = !!completion
            const pastel = PASTELS[index % PASTELS.length]

            return (
              <a
                key={mission.id}
                href={`/subir?mission=${mission.id}`}
                className={`relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl p-3 text-center shadow-sm ${pastel}`}
              >
                {isDone && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={storage.getPublicUrl(completion.thumbPath)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-30"
                  />
                )}
                <span className="relative text-3xl" aria-hidden>
                  {mission.emoji}
                </span>
                <span
                  className={`relative text-base font-bold text-ink ${isDone ? 'line-through decoration-2' : ''}`}
                >
                  {mission.title}
                </span>
                {isDone && (
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia text-base text-white">
                    ✓
                  </span>
                )}
              </a>
            )
          })}
        </div>
      </main>
    </>
  )
}
