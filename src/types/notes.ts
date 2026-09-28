export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewNote {
  title?: string;
  content?: string;
  tags?: string[];
  is_pinned?: boolean;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  tags?: string[];
  is_pinned?: boolean;
}
