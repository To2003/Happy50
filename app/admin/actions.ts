'use server'

import { revalidatePath } from 'next/cache'
import { getAdminSupabaseClient } from '@/lib/supabase/server'
import { createAdminSession, destroyAdminSession, isAdminAuthenticated } from '@/lib/adminAuth'
import type { Database } from '@/lib/database.types'

type Milestone = Database['public']['Tables']['milestones']['Row']
type Mission = Database['public']['Tables']['missions']['Row']
type PartyTable = Database['public']['Tables']['party_tables']['Row']

async function requireAdmin(): Promise<void> {
  const ok = await isAdminAuthenticated()
  if (!ok) {
    throw new Error('No autorizado.')
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginAdminAction(password: string): Promise<{ success: boolean }> {
  const success = await createAdminSession(password)
  if (success) revalidatePath('/admin')
  return { success }
}

export async function logoutAdminAction(): Promise<void> {
  await destroyAdminSession()
  revalidatePath('/admin')
}

// ---------------------------------------------------------------------------
// Momentos
// ---------------------------------------------------------------------------

export async function getMilestonesAction(): Promise<Milestone[]> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { data, error } = await supabase.from('milestones').select('*').order('sort_order')
  if (error || !data) throw new Error('No se pudieron cargar los momentos.')
  return data
}

export async function startMilestoneAction(milestoneId: string): Promise<void> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { error } = await supabase
    .from('milestones')
    .update({ started_at: new Date().toISOString() })
    .eq('id', milestoneId)
  if (error) throw new Error('No se pudo arrancar el momento.')
  revalidatePath('/admin')
}

interface RecentPhotoForReassign {
  id: string
  storage_path: string
  taken_at: string
  milestone_id: string | null
  milestone_override_id: string | null
}

export async function getRecentPhotosForReassignAction(): Promise<RecentPhotoForReassign[]> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, taken_at, milestone_id, milestone_override_id')
    .order('taken_at', { ascending: false })
    .limit(60)
  if (error || !data) throw new Error('No se pudieron cargar las fotos.')
  return data
}

export async function reassignPhotoMilestoneAction(
  photoId: string,
  milestoneId: string | null,
): Promise<void> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { error } = await supabase
    .from('photos')
    .update({ milestone_override_id: milestoneId })
    .eq('id', photoId)
  if (error) throw new Error('No se pudo reasignar la foto.')
  revalidatePath('/admin')
}

export async function reassignByTimeRangeAction(
  fromISO: string,
  toISO: string,
  milestoneId: string,
): Promise<{ count: number }> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { data, error } = await supabase
    .from('photos')
    .update({ milestone_override_id: milestoneId })
    .gte('taken_at', fromISO)
    .lte('taken_at', toISO)
    .select('id')
  if (error) throw new Error('No se pudo reasignar el rango.')
  revalidatePath('/admin')
  return { count: data?.length ?? 0 }
}

// ---------------------------------------------------------------------------
// Moderación
// ---------------------------------------------------------------------------

interface ModerationPhoto {
  id: string
  storage_path: string
  thumb_path: string
  caption: string | null
  status: string
  is_featured: boolean
  taken_at: string
  guest_name: string | null
}

export async function getRecentPhotosForModerationAction(): Promise<ModerationPhoto[]> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()

  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, thumb_path, caption, status, is_featured, taken_at, guest_id')
    .neq('status', 'deleted')
    .order('taken_at', { ascending: false })
    .limit(60)

  if (error || !data) throw new Error('No se pudieron cargar las fotos.')

  const guestIds = Array.from(new Set(data.map((p) => p.guest_id).filter((id): id is string => !!id)))
  const { data: guests } = await supabase.from('guests').select('id, name').in('id', guestIds)
  const namesById = new Map((guests ?? []).map((g) => [g.id, g.name]))

  return data.map((photo) => ({
    id: photo.id,
    storage_path: photo.storage_path,
    thumb_path: photo.thumb_path,
    caption: photo.caption,
    status: photo.status,
    is_featured: photo.is_featured,
    taken_at: photo.taken_at,
    guest_name: photo.guest_id ? (namesById.get(photo.guest_id) ?? null) : null,
  }))
}

export async function setPhotoHiddenAction(photoId: string, hidden: boolean): Promise<void> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { error } = await supabase
    .from('photos')
    .update({ status: hidden ? 'hidden' : 'visible' })
    .eq('id', photoId)
  if (error) throw new Error('No se pudo cambiar la visibilidad.')
  revalidatePath('/admin')
}

export async function setPhotoFeaturedAction(photoId: string, featured: boolean): Promise<void> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { error } = await supabase.from('photos').update({ is_featured: featured }).eq('id', photoId)
  if (error) throw new Error('No se pudo destacar la foto.')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------------------
// Misiones
// ---------------------------------------------------------------------------

export async function getMissionsAction(): Promise<Mission[]> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { data, error } = await supabase.from('missions').select('*').order('sort_order')
  if (error || !data) throw new Error('No se pudieron cargar las misiones.')
  return data
}

export async function createMissionAction(input: {
  title: string
  emoji: string | null
  sortOrder: number
}): Promise<void> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { error } = await supabase
    .from('missions')
    .insert({ title: input.title, emoji: input.emoji, sort_order: input.sortOrder })
  if (error) throw new Error('No se pudo crear la misión (¿título repetido?).')
  revalidatePath('/admin')
}

export async function setMissionActiveAction(missionId: string, active: boolean): Promise<void> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { error } = await supabase.from('missions').update({ active }).eq('id', missionId)
  if (error) throw new Error('No se pudo actualizar la misión.')
  revalidatePath('/admin')
}

export async function deleteMissionAction(missionId: string): Promise<void> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { error } = await supabase.from('missions').delete().eq('id', missionId)
  if (error) throw new Error('No se pudo borrar la misión.')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------------------
// Mesas
// ---------------------------------------------------------------------------

export async function getTablesAction(): Promise<PartyTable[]> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { data, error } = await supabase.from('party_tables').select('*').order('sort_order')
  if (error || !data) throw new Error('No se pudieron cargar las mesas.')
  return data
}

export async function createTableAction(input: {
  code: string
  label: string | null
  sortOrder: number
}): Promise<void> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { error } = await supabase
    .from('party_tables')
    .insert({ code: input.code, label: input.label, sort_order: input.sortOrder })
  if (error) throw new Error('No se pudo crear la mesa (¿código repetido?).')
  revalidatePath('/admin')
}

export async function deleteTableAction(tableId: string): Promise<void> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()
  const { error } = await supabase.from('party_tables').delete().eq('id', tableId)
  if (error) {
    throw new Error('No se pudo borrar la mesa (¿todavía tiene invitados asignados?).')
  }
  revalidatePath('/admin')
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface AdminStats {
  totalPhotos: number
  photosByHour: { hour: string; count: number }[]
  topUploaders: { name: string; count: number }[]
  topVoted: { id: string; thumb_path: string; hearts: number }[]
}

export async function getStatsAction(): Promise<AdminStats> {
  await requireAdmin()
  const supabase = getAdminSupabaseClient()

  const { count: totalPhotos } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'deleted')

  const { data: allPhotos } = await supabase
    .from('photos')
    .select('taken_at, guest_id, hearts, id, thumb_path')
    .neq('status', 'deleted')

  const hourCounts = new Map<string, number>()
  const uploaderCounts = new Map<string, number>()

  for (const photo of allPhotos ?? []) {
    const hour = new Date(photo.taken_at).toISOString().slice(0, 13) + ':00'
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)

    if (photo.guest_id) {
      uploaderCounts.set(photo.guest_id, (uploaderCounts.get(photo.guest_id) ?? 0) + 1)
    }
  }

  const topUploaderIds = Array.from(uploaderCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const { data: guestRows } = await supabase
    .from('guests')
    .select('id, name')
    .in(
      'id',
      topUploaderIds.map(([id]) => id),
    )
  const namesById = new Map((guestRows ?? []).map((g) => [g.id, g.name]))

  const topVoted = [...(allPhotos ?? [])]
    .sort((a, b) => b.hearts - a.hearts)
    .slice(0, 6)
    .map((p) => ({ id: p.id, thumb_path: p.thumb_path, hearts: p.hearts }))

  return {
    totalPhotos: totalPhotos ?? 0,
    photosByHour: Array.from(hourCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, count]) => ({ hour, count })),
    topUploaders: topUploaderIds.map(([id, count]) => ({
      name: namesById.get(id) ?? 'Invitado',
      count,
    })),
    topVoted,
  }
}
