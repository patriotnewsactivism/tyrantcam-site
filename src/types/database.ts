export type TyrantCategory = 'federal' | 'state' | 'local' | 'law_enforcement';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Tyrant {
  id: string;
  name: string;
  title: string;
  position: string;
  category: TyrantCategory;
  description: string;
  image_url: string | null;
  evidence_urls: string[];
  shame_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TyrantInsert {
  id?: string;
  name: string;
  title: string;
  position: string;
  category: TyrantCategory;
  description: string;
  image_url?: string | null;
  evidence_urls?: string[];
  shame_count?: number;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TyrantUpdate {
  id?: string;
  name?: string;
  title?: string;
  position?: string;
  category?: TyrantCategory;
  description?: string;
  image_url?: string | null;
  evidence_urls?: string[];
  shame_count?: number;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EvidenceFile {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface Submission {
  id: string;
  tyrant_name: string;
  tyrant_title: string;
  category: TyrantCategory;
  description: string;
  evidence_files: EvidenceFile[];
  reporter_contact: string | null;
  status: SubmissionStatus;
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface SubmissionInsert {
  id?: string;
  tyrant_name: string;
  tyrant_title: string;
  category: TyrantCategory;
  description: string;
  evidence_files?: EvidenceFile[];
  reporter_contact?: string | null;
  status?: SubmissionStatus;
  admin_notes?: string | null;
  submitted_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface SubmissionUpdate {
  id?: string;
  tyrant_name?: string;
  tyrant_title?: string;
  category?: TyrantCategory;
  description?: string;
  evidence_files?: EvidenceFile[];
  reporter_contact?: string | null;
  status?: SubmissionStatus;
  admin_notes?: string | null;
  submitted_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface Vote {
  id: string;
  tyrant_id: string;
  ip_hash: string;
  created_at: string;
}

export interface VoteInsert {
  id?: string;
  tyrant_id: string;
  ip_hash: string;
  created_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface AdminUserInsert {
  id?: string;
  email: string;
  password_hash: string;
  created_at?: string;
}

export interface Tables {
  tyrants: Tyrant;
  submissions: Submission;
  votes: Vote;
  admin_users: AdminUser;
}

export interface TablesInsert {
  tyrants: TyrantInsert;
  submissions: SubmissionInsert;
  votes: VoteInsert;
  admin_users: AdminUserInsert;
}

export interface TablesUpdate {
  tyrants: TyrantUpdate;
  submissions: SubmissionUpdate;
  votes: Partial<VoteInsert>;
  admin_users: Partial<AdminUserInsert>;
}

export interface Database {
  public: {
    Tables: Tables;
    TablesInsert: TablesInsert;
    TablesUpdate: TablesUpdate;
    Enums: {
      tyrant_category: TyrantCategory;
      submission_status: SubmissionStatus;
    };
  };
}

export type Schema = Database;
