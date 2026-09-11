import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import { getAdminSupabaseClient } from '@/lib/supabase/server'

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
      'id, storage_path, thumb_path, caption, taken_at, guest_id, milestone_id, milestone_override_id',
    )
    .eq('status', 'visible')
    .order('taken_at', { ascending: true })

  if (error || !photos) {
    return NextResponse.json({ error: 'No se pudo armar el manifiesto.' }, { status: 500 })
  }

  const [{ data: guests }, { data: milestones }] = await Promise.all([
    supabase.from('guests').select('id, name'),
    supabase.from('milestones').select('id, name'),
  ])

  const guestNameById = new Map((guests ?? []).map((g) => [g.id, g.name]))
  const milestoneNameById = new Map((milestones ?? []).map((m) => [m.id, m.name]))

  const manifest = photos.map((photo) => {
    const effectiveMilestoneId = photo.milestone_override_id ?? photo.milestone_id
    return {
      id: photo.id,
      storage_path: photo.storage_path,
      thumb_path: photo.thumb_path,
      caption: photo.caption,
      taken_at: photo.taken_at,
      author: photo.guest_id ? (guestNameById.get(photo.guest_id) ?? null) : null,
      milestone: effectiveMilestoneId ? (milestoneNameById.get(effectiveMilestoneId) ?? null) : null,
    }
  })

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="manifiesto.json"',
    },
  })
}
