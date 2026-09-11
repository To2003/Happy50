'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { storage } from '@/lib/storage'
import { findExistingGuest } from '@/lib/guest'
import { listActiveMissions, type Mission } from '@/lib/missions'
import { BottomNav } from '@/components/BottomNav'

interface Completion {
  missionId: string
  thumbPath: string
}

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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="h-14 rounded-lg bg-pink-600 px-6 text-lg font-bold"
        >
          Reintentar
        </button>
      </main>
    )
  }

  return (
    <>
    <main className="flex min-h-screen flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Misiones</h1>
      <p className="text-neutral-400">Tocá una para ir a sacarle la foto.</p>

      <div className="grid grid-cols-2 gap-3">
        {missions.map((mission) => {
          const completion = completions.get(mission.id)
          const isDone = !!completion

          return (
            <a
              key={mission.id}
              href={`/subir?mission=${mission.id}`}
              className="relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-lg bg-neutral-900 p-3 text-center"
            >
              {isDone && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storage.getPublicUrl(completion.thumbPath)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
              )}
              <span className="relative text-3xl">{mission.emoji}</span>
              <span
                className={`relative text-sm font-medium ${isDone ? 'line-through decoration-2 text-neutral-300' : ''}`}
              >
                {mission.title}
              </span>
              {isDone && (
                <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-sm">
                  ✓
                </span>
              )}
            </a>
          )
        })}
      </div>
    </main>
    <BottomNav />
    </>
  )
}
