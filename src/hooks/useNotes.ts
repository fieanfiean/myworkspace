import { useCallback, useEffect, useState } from 'react';
import { createNote, deleteNote, listNotes, updateNote } from '@/services/notesService';
import type { NewNote, Note, NoteUpdate } from '@/types/notes';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextNotes = await listNotes();
      setNotes(nextNotes);
      setError(null);
      return nextNotes;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error('Unable to load notes.');
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void refresh().catch(() => undefined)); }, [refresh]);

  const create = useCallback(async (input: NewNote) => {
    try {
      const note = await createNote(input);
      await refresh();
      return note;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error('Unable to create note.');
      setError(nextError);
      throw nextError;
    }
  }, [refresh]);

  const update = useCallback(async (id: string, patch: NoteUpdate) => {
    try {
      const note = await updateNote(id, patch);
      await refresh();
      return note;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error('Unable to update note.');
      setError(nextError);
      throw nextError;
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteNote(id);
      await refresh();
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error('Unable to delete note.');
      setError(nextError);
      throw nextError;
    }
  }, [refresh]);

  return { notes, loading, error, create, update, remove, refresh } as const;
}
