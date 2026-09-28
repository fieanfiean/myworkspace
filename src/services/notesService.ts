import { supabase } from '@/lib/supabase';
import type { NewNote, Note, NoteUpdate } from '@/types/notes';

const columns = 'id,user_id,title,content,tags,is_pinned,created_at,updated_at';

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase.from('notes').select(columns)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Note[];
}

export async function createNote(input: NewNote): Promise<Note> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('An authenticated user is required to create a note.');

  const { data, error } = await supabase.from('notes').insert({
    user_id: authData.user.id,
    title: input.title?.trim() || null,
    content: input.content?.trim() || null,
    tags: input.tags ?? [],
    is_pinned: input.is_pinned ?? false,
  }).select(columns).single();
  if (error) throw new Error(error.message);
  return data as Note;
}

export async function updateNote(id: string, patch: NoteUpdate): Promise<Note> {
  const changes = {
    ...(patch.title !== undefined && { title: patch.title.trim() || null }),
    ...(patch.content !== undefined && { content: patch.content.trim() || null }),
    ...(patch.tags !== undefined && { tags: patch.tags }),
    ...(patch.is_pinned !== undefined && { is_pinned: patch.is_pinned }),
  };
  const { data, error } = await supabase.from('notes').update(changes).eq('id', id).select(columns).single();
  if (error) throw new Error(error.message);
  return data as Note;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
