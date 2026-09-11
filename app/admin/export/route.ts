import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import { getAdminSupabaseClient } from '@/lib/supabase/server'

export interface ManifestMilestone {
  id: string
  name: string
  emoji: string | null
  sortOrder: number
  isPrologue: boolean
  startedAt: string | null
}

export interface ManifestPhoto {
  id: string
  storagePath: string
  thumbPath: string
  caption: string | null
  takenAt: string
  author: string | null
  milestoneId: string | null
  isFeatured: boolean
}

export interface Manifest {
  generatedAt: string
  milestones: ManifestMilestone[]
  photos: ManifestPhoto[]
  uploaders: string[]
}

// Manifiesto que consume scripts/build-book.ts (Fase 6) para armar el PDF
// y el ZIP fuera de Vercel. Ver SPEC.md sección 9.
export async function GET() {
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const supabase = getAdminSupabaseClient()

  const { data: photos, error } = await supabase
    .from('photos')
    .select(
      'id, storage_path, thumb_path, caption, taken_at, guest_id, milestone_id, milestone_override_id, is_featured',
    )
    .eq('status', 'visible')
    .order('taken_at', { ascending: true })

  if (error || !photos) {
    return NextResponse.json({ error: 'No se pudo armar el manifiesto.' }, { status: 500 })
  }

  const [{ data: guests }, { data: milestonesData }] = await Promise.all([
    supabase.from('guests').select('id, name'),
    supabase.from('milestones').select('*').order('sort_order'),
  ])

  const guestNameById = new Map((guests ?? []).map((g) => [g.id, g.name]))

  const milestones: ManifestMilestone[] = (milestonesData ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    emoji: m.emoji,
    sortOrder: m.sort_order,
    isPrologue: m.is_prologue,
    startedAt: m.started_at,
  }))

  const manifestPhotos: ManifestPhoto[] = photos.map((photo) => ({
    id: photo.id,
    storagePath: photo.storage_path,
    thumbPath: photo.thumb_path,
    caption: photo.caption,
    takenAt: photo.taken_at,
    author: photo.guest_id ? (guestNameById.get(photo.guest_id) ?? null) : null,
    milestoneId: photo.milestone_override_id ?? photo.milestone_id,
    isFeatured: photo.is_featured,
  }))

  const uploaders = Array.from(new Set(manifestPhotos.map((p) => p.author).filter((n): n is string => !!n))).sort(
    (a, b) => a.localeCompare(b, 'es'),
  )

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    milestones,
    photos: manifestPhotos,
    uploaders,
  }

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="manifiesto.json"',
    },
  })
}
