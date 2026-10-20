// Agrupado del timeline del book (funciones puras, con tests en tests/).

interface GroupablePhoto {
  effective_milestone_id: string | null
  guest_id: string | null
  taken_at: string
}

// Agrupa por capítulo usando effective_milestone_id, que la vista ya calcula
// como coalesce(milestone_override_id, milestone_id) — CLAUDE.md. Dentro de
// cada capítulo, orden cronológico por taken_at (aunque la consulta ya lo
// traiga ordenado). Una foto sin capítulo no se muestra.
export function groupByChapter<P extends GroupablePhoto>(
  photos: readonly P[],
  nameById: ReadonlyMap<string, string>,
): Map<string, (P & { guest_name: string | null })[]> {
  const grouped = new Map<string, (P & { guest_name: string | null })[]>()
  for (const photo of photos) {
    const key = photo.effective_milestone_id
    if (!key) continue
    const list = grouped.get(key) ?? []
    list.push({ ...photo, guest_name: photo.guest_id ? (nameById.get(photo.guest_id) ?? null) : null })
    grouped.set(key, list)
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.taken_at.localeCompare(b.taken_at))
  }
  return grouped
}

// Capítulos con al menos una foto, en el orden de los momentos (sort_order).
export function chaptersWithPhotos<M extends { id: string }>(
  milestones: readonly M[],
  grouped: ReadonlyMap<string, readonly unknown[]>,
): M[] {
  return milestones.filter((m) => (grouped.get(m.id)?.length ?? 0) > 0)
}
