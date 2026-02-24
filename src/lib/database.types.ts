export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TyrantCategory = 'federal' | 'state' | 'local' | 'law_enforcement'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface Tyrant {
  id: string
  name: string
  title: string
  position: string
  category: TyrantCategory
  description: string
  image_url: string | null
  evidence_urls: string[]
  shame_count: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface TyrantInsert {
  id?: string
  name: string
  title: string
  position: string
  category: TyrantCategory
  description: string
  image_url?: string | null
  evidence_urls?: string[]
  shame_count?: number
  is_published?: boolean
  created_at?: string
  updated_at?: string
}

export interface TyrantUpdate {
  id?: string
  name?: string
  title?: string
  position?: string
  category?: TyrantCategory
  description?: string
  image_url?: string | null
  evidence_urls?: string[]
  shame_count?: number
  is_published?: boolean
  created_at?: string
  updated_at?: string
}

export interface Submission {
  id: number
  created_at: string
  tyrant_name: string
  title_position: string
  category: string
  description: string
  evidence_url: string | null
  reporter_email: string | null
  is_anonymous: boolean
  status: string
}

export interface SubmissionInsert {
  id?: number
  created_at?: string
  tyrant_name: string
  title_position: string
  category: string
  description: string
  evidence_url?: string | null
  reporter_email?: string | null
  is_anonymous?: boolean
  status?: string
}

export interface SubmissionUpdate {
  id?: number
  created_at?: string
  tyrant_name?: string
  title_position?: string
  category?: string
  description?: string
  evidence_url?: string | null
  reporter_email?: string | null
  is_anonymous?: boolean
  status?: string
}

export interface Vote {
  id: string
  tyrant_id: string
  ip_hash: string
  created_at: string
}

export interface VoteInsert {
  id?: string
  tyrant_id: string
  ip_hash: string
  created_at?: string
}

export interface VoteRow {
  id: string
  tyrant_id: string
  ip_hash: string
  created_at: string
}

export interface AdminUser {
  id: string
  email: string
  password_hash: string
  created_at: string
}

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  graphql: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      tyrants: {
        Row: Tyrant
        Insert: TyrantInsert
        Update: TyrantUpdate
        Relationships: []
      }
      submissions: {
        Row: Submission
        Insert: SubmissionInsert
        Update: SubmissionUpdate
        Relationships: []
      }
      votes: {
        Row: VoteRow
        Insert: VoteInsert
        Update: Partial<VoteInsert>
        Relationships: []
      }
      admin_users: {
        Row: AdminUser
        Insert: Omit<AdminUser, 'created_at'>
        Update: Partial<AdminUser>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tyrant_category: TyrantCategory
      submission_status: SubmissionStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
