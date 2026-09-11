import { getSupabaseClient } from '@/lib/supabase/client'

const BUCKET = 'photos'

// Única interfaz de storage del proyecto (ver SPEC.md sección 3 y CLAUDE.md).
// Ningún otro archivo importa el SDK de Supabase Storage directamente. Si el
// egress se vuelve un problema, se migra a Cloudflare R2 cambiando solo esto.
export interface Storage {
  upload(path: string, file: Blob): Promise<void>
  getPublicUrl(path: string): string
  delete(path: string): Promise<void>
}

export const storage: Storage = {
  async upload(path, file) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: 'image/jpeg',
      upsert: false,
    })

    if (error) {
      throw new Error('No se pudo subir, lo vamos a reintentar solos.')
    }
  },

  getPublicUrl(path) {
    const supabase = getSupabaseClient()
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  },

  async delete(path) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.storage.from(BUCKET).remove([path])

    if (error) {
      throw new Error('No se pudo borrar el archivo.')
    }
  },
}
