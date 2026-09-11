// Tipos manuales que reflejan supabase/migrations/0001_init.sql.
// Cuando exista un proyecto Supabase real, regenerar con:
//   supabase gen types typescript --project-id <id> > lib/database.types.ts
// y revisar que este archivo no haya quedado desincronizado.

export type Database = {
  public: {
    Tables: {
      guests: {
        Row: {
          id: string
          user_id: string
          name: string
          group_tag: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          group_tag?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          group_tag?: string | null
          created_at?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          id: string
          name: string
          emoji: string | null
          sort_order: number
          started_at: string | null
          is_prologue: boolean
        }
        Insert: {
          id?: string
          name: string
          emoji?: string | null
          sort_order: number
          started_at?: string | null
          is_prologue?: boolean
        }
        Update: {
          id?: string
          name?: string
          emoji?: string | null
          sort_order?: number
          started_at?: string | null
          is_prologue?: boolean
        }
        Relationships: []
      }
      missions: {
        Row: {
          id: string
          title: string
          description: string | null
          emoji: string | null
          sort_order: number
          active: boolean
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          emoji?: string | null
          sort_order: number
          active?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          emoji?: string | null
          sort_order?: number
          active?: boolean
        }
        Relationships: []
      }
      photos: {
        Row: {
          id: string
          guest_id: string | null
          mission_id: string | null
          milestone_id: string | null
          milestone_override_id: string | null
          storage_path: string
          thumb_path: string
          width: number | null
          height: number | null
          caption: string | null
          taken_at: string
          created_at: string
          status: string
          is_featured: boolean
          hearts: number
        }
        Insert: {
          id?: string
          guest_id?: string | null
          mission_id?: string | null
          milestone_id?: string | null
          milestone_override_id?: string | null
          storage_path: string
          thumb_path: string
          width?: number | null
          height?: number | null
          caption?: string | null
          taken_at: string
          created_at?: string
          status?: string
          is_featured?: boolean
          hearts?: number
        }
        Update: {
          id?: string
          guest_id?: string | null
          mission_id?: string | null
          milestone_id?: string | null
          milestone_override_id?: string | null
          storage_path?: string
          thumb_path?: string
          width?: number | null
          height?: number | null
          caption?: string | null
          taken_at?: string
          created_at?: string
          status?: string
          is_featured?: boolean
          hearts?: number
        }
        Relationships: []
      }
      hearts: {
        Row: {
          photo_id: string
          guest_id: string
          created_at: string
        }
        Insert: {
          photo_id: string
          guest_id: string
          created_at?: string
        }
        Update: {
          photo_id?: string
          guest_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
