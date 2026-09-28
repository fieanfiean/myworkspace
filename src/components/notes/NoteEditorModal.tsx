import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, LoaderCircle, Pin, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NewNote, Note, NoteUpdate } from '@/types/notes';

interface NoteEditorModalProps {
  note: Note | null;
  onCreate: (input: NewNote) => Promise<Note>;
  onUpdate: (id: string, patch: NoteUpdate) => Promise<Note>;
  onClose: () => void;
}

interface Draft {
  title: string;
  content: string;
  tags: string;
  isPinned: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

function initialDraft(note: Note | null): Draft {
  return {
    title: note?.title ?? '',
    content: note?.content ?? '',
    tags: note?.tags.join(', ') ?? '',
    isPinned: note?.is_pinned ?? false,
  };
}

function normalizedTags(value: string): string[] {
  return [...new Set(value.split(',').map(tag => tag.trim()).filter(Boolean))];
}

function payloadFor(draft: Draft): NewNote {
  return {
    title: draft.title.trim(),
    content: draft.content.trim(),
    tags: normalizedTags(draft.tags),
    is_pinned: draft.isPinned,
  };
}

function fingerprint(input: NewNote): string {
  return JSON.stringify(input);
}

export function NoteEditorModal({ note, onCreate, onUpdate, onClose }: NoteEditorModalProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => initialDraft(note));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const draftRef = useRef(draft);
  const noteIdRef = useRef(note?.id ?? null);
  const lastSavedRef = useRef(note ? fingerprint(payloadFor(initialDraft(note))) : '');
  const saveQueueRef = useRef<Promise<Note | null>>(Promise.resolve(note));
  const valid = Boolean(draft.title.trim() || draft.content.trim());

  useEffect(() => { draftRef.current = draft; }, [draft]);

  const queueSave = useCallback((showValidation: boolean) => {
    const snapshot = payloadFor(draftRef.current);
    const nextFingerprint = fingerprint(snapshot);
    if (!snapshot.title && !snapshot.content) {
      if (showValidation) setError(t('notes.editor.validation'));
      return Promise.resolve<Note | null>(null);
    }
    if (nextFingerprint === lastSavedRef.current) return saveQueueRef.current;

    const operation = saveQueueRef.current.catch(() => null).then(async () => {
      setStatus('saving');
      setError(null);
      try {
        const saved = noteIdRef.current
          ? await onUpdate(noteIdRef.current, snapshot)
          : await onCreate(snapshot);
        noteIdRef.current = saved.id;
        lastSavedRef.current = nextFingerprint;
        setStatus('saved');
        return saved;
      } catch (cause) {
        setStatus('idle');
        setError(cause instanceof Error ? cause.message : t('notes.editor.saveError'));
        throw cause;
      }
    });
    saveQueueRef.current = operation;
    return operation;
  }, [onCreate, onUpdate, t]);

  useEffect(() => {
    if (!valid || fingerprint(payloadFor(draft)) === lastSavedRef.current) return;
    setStatus('idle');
    const timer = window.setTimeout(() => { void queueSave(false).catch(() => undefined); }, 800);
    return () => window.clearTimeout(timer);
  }, [draft, queueSave, valid]);

  const closeAfterFlush = useCallback(async () => {
    if (closing) return;
    setClosing(true);
    try {
      if (draftRef.current.title.trim() || draftRef.current.content.trim()) await queueSave(false);
      await saveQueueRef.current;
      onClose();
    } catch {
      setClosing(false);
    }
  }, [closing, onClose, queueSave]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void closeAfterFlush();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeAfterFlush]);

  const statusLabel = useMemo(() => {
    if (status === 'saving' || closing) return t('notes.saving');
    if (status === 'saved') return t('notes.saved');
    return '';
  }, [closing, status, t]);

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) void closeAfterFlush(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="note-editor-title" className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4"><div><h2 id="note-editor-title" className="font-bold text-white">{note ? t('notes.editor.editTitle') : t('notes.editor.newTitle')}</h2><p className="mt-1 min-h-4 text-xs text-slate-500">{statusLabel && <span className="inline-flex items-center gap-1.5">{status === 'saving' || closing ? <LoaderCircle size={13} className="animate-spin"/> : <Check size={13} className="text-emerald-400"/>}{statusLabel}</span>}</p></div><button type="button" disabled={closing} onClick={() => void closeAfterFlush()} aria-label={t('common.close')} className="flex size-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"><X size={20}/></button></header>
      <div className="space-y-4 overflow-y-auto p-5">
        {error && <p role="alert" className="rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-300">{error}</p>}
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('notes.editor.titleLabel')}</span><input autoFocus value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder={t('notes.editor.titlePlaceholder')} maxLength={200} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"/></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('notes.editor.contentLabel')}</span><textarea value={draft.content} onChange={event => setDraft(current => ({ ...current, content: event.target.value }))} placeholder={t('notes.editor.contentPlaceholder')} rows={12} className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"/></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('notes.tags')}</span><input value={draft.tags} onChange={event => setDraft(current => ({ ...current, tags: event.target.value }))} placeholder={t('notes.editor.tagsPlaceholder')} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"/></label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/60 px-4 text-sm text-slate-300"><input type="checkbox" checked={draft.isPinned} onChange={event => setDraft(current => ({ ...current, isPinned: event.target.checked }))} className="size-4 accent-indigo-500"/><Pin size={16} className="text-indigo-400"/>{t('notes.pinned')}</label>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-slate-800 px-5 py-4"><span className="text-xs text-slate-500">{t('notes.editor.autosaveHint')}</span><button type="button" disabled={!valid || status === 'saving' || closing} onClick={() => void queueSave(true).catch(() => undefined)} className="flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">{status === 'saving' ? <LoaderCircle size={17} className="animate-spin"/> : <Save size={17}/>} {t('notes.save')}</button></footer>
    </section>
  </div>;
}
