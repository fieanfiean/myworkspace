import { useMemo, useState } from 'react';
import { FileText, LoaderCircle, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { NoteEditorModal } from '@/components/notes/NoteEditorModal';
import { useNotes } from '@/hooks/useNotes';
import type { Note } from '@/types/notes';

function noteLabel(note: Note, fallback: string): string {
  return note.title?.trim() || note.content?.split(/\r?\n/).find(line => line.trim())?.trim() || fallback;
}

export function NotesPage() {
  const { t, i18n } = useTranslation();
  const { notes, loading, error, create, update, remove } = useNotes();
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editor, setEditor] = useState<Note | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedNotes = useMemo(() => [...notes].sort((left, right) => {
    if (left.is_pinned !== right.is_pinned) return left.is_pinned ? -1 : 1;
    return Date.parse(right.updated_at) - Date.parse(left.updated_at);
  }), [notes]);
  const tags = useMemo(() => [...new Set(notes.flatMap(note => note.tags))].sort((a, b) => a.localeCompare(b)), [notes]);
  const filteredNotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return sortedNotes.filter(note => {
      const matchesQuery = !query || `${note.title ?? ''}\n${note.content ?? ''}`.toLocaleLowerCase().includes(query);
      const matchesTag = !activeTag || note.tags.includes(activeTag);
      return matchesQuery && matchesTag;
    });
  }, [activeTag, search, sortedNotes]);
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';

  const togglePin = async (note: Note) => {
    setActionError(null);
    try { await update(note.id, { is_pinned: !note.is_pinned }); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : t('notes.editor.saveError')); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : t('notes.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return <div className="dashboard-light-page mx-auto max-w-6xl space-y-5 pb-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">{t('notes.eyebrow')}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{t('notes.title')}</h1><p className="mt-1 text-sm text-slate-400">{t('notes.subtitle')}</p></div><button type="button" onClick={() => setEditor(null)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-500"><Plus size={18}/>{t('notes.new')}</button></header>

    {(error || actionError) && <p role="alert" className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-300">{actionError ?? error?.message}</p>}

    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/10"><label className="relative block"><span className="sr-only">{t('notes.search')}</span><Search size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-500"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('notes.search')} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"/></label>{tags.length > 0 && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setActiveTag(null)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTag === null ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{t('notes.allTags')}</button>{tags.map(tag => <button type="button" key={tag} onClick={() => setActiveTag(current => current === tag ? null : tag)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>#{tag}</button>)}</div>}</section>

    {loading ? <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-sm text-slate-400"><LoaderCircle size={20} className="mr-2 animate-spin"/>{t('common.loadingWorkspace')}</div> : filteredNotes.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center"><FileText size={36} className="text-indigo-400"/><h2 className="mt-4 font-bold text-white">{t('notes.empty')}</h2><p className="mt-2 max-w-md text-sm text-slate-500">{search || activeTag ? t('notes.noMatches') : t('notes.emptyHint')}</p></div> : <section className="grid gap-3 md:grid-cols-2">{filteredNotes.map(note => <article key={note.id} className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/5 transition hover:-translate-y-0.5 hover:border-indigo-500/40"><div className="flex items-start gap-3"><button type="button" onClick={() => setEditor(note)} className="min-w-0 flex-1 text-left"><span className="flex items-center gap-2"><strong className="truncate text-base text-white">{noteLabel(note, t('notes.untitled'))}</strong>{note.is_pinned && <Pin size={14} className="shrink-0 fill-indigo-400 text-indigo-400"/>}</span><p className="mt-2 line-clamp-3 min-h-[3.75rem] whitespace-pre-wrap text-sm leading-5 text-slate-400">{note.content || t('notes.noContent')}</p></button><div className="flex shrink-0 gap-1"><button type="button" onClick={() => void togglePin(note)} className="flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-indigo-500/15 hover:text-indigo-300" aria-label={t(note.is_pinned ? 'notes.unpin' : 'notes.pin')}>{note.is_pinned ? <PinOff size={17}/> : <Pin size={17}/>}</button><button type="button" onClick={() => setDeleteTarget(note)} className="flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-500/15 hover:text-rose-300" aria-label={t('notes.delete')}><Trash2 size={17}/></button></div></div>{note.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{note.tags.map(tag => <button type="button" key={tag} onClick={() => setActiveTag(tag)} className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20">#{tag}</button>)}</div>}<p className="mt-3 text-xs text-slate-600">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.updated_at))}</p></article>)}</section>}

    {editor !== undefined && <NoteEditorModal note={editor} onCreate={create} onUpdate={update} onClose={() => setEditor(undefined)}/>}
    <DeleteConfirmDialog open={deleteTarget !== null} deleting={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} title={t('notes.deleteConfirm')} message={deleteTarget ? noteLabel(deleteTarget, t('notes.untitled')) : ''}/>
  </div>;
}
