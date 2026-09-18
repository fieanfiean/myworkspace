import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, ChevronDown, Clapperboard, LoaderCircle, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { deleteProgress, listCompleted, listWatching, markCompleted, markEpisodeWatched, upsertProgress, type WatchProgress } from '@/services/watchProgressService';

type PanelStatus = 'watching' | 'completed';
interface AnimeMetadata { external_id: string; title: string; cover_url: string | null; episode_count: number }
interface TrackerItem { externalId: string; title: string; coverUrl: string | null; episodeCount: number; watchedEpisodes: number }

async function joinAnimeMetadata(rows: WatchProgress[]): Promise<TrackerItem[]> {
  const externalIds = [...new Set(rows.map(row => row.anime_external_id))];
  const metadataById = new Map<string, AnimeMetadata>();
  if (externalIds.length > 0) {
    const { data, error } = await supabase.from('animes').select('external_id,title,cover_url,episode_count').in('external_id', externalIds);
    if (error) throw new Error(error.message);
    (data as AnimeMetadata[] | null)?.forEach(item => metadataById.set(item.external_id, item));
  }
  return rows.map(row => {
    const metadata = metadataById.get(row.anime_external_id);
    return {
      externalId: row.anime_external_id,
      title: metadata?.title ?? row.anime_title ?? row.anime_external_id,
      coverUrl: metadata?.cover_url ?? row.anime_cover_url,
      episodeCount: Math.max(0, metadata?.episode_count ?? 0),
      watchedEpisodes: Math.max(0, row.watched_episodes),
    };
  });
}

export function AnimeTrackerPanel() {
  const [status, setStatus] = useState<PanelStatus>('watching');
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const rows = status === 'watching' ? await listWatching() : await listCompleted();
      setItems(await joinAnimeMetadata(rows));
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const addEpisode = async (item: TrackerItem) => {
    setUpdatingId(item.externalId); setError(null);
    try {
      const currentIndex = Math.max(-1, item.watchedEpisodes - 1);
      const nextEpisodeIndex = currentIndex + 1;
      await markEpisodeWatched(item.externalId, nextEpisodeIndex);
      if (item.episodeCount > 0 && nextEpisodeIndex + 1 >= item.episodeCount) await markCompleted(item.externalId);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setUpdatingId(null); }
  };

  return <section className="mb-7 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#131927]/70 sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">My Watchlist</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">个人追剧记录</h2></div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setAddOpen(true)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 sm:flex-none"><Plus size={17} />添加戏剧</button>
        <button type="button" onClick={() => setExpanded(current => !current)} aria-expanded={expanded} aria-controls="anime-tracker-content" className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={expanded ? '收起追剧记录' : '展开追剧记录'} title={expanded ? '收起' : '展开'}><ChevronDown size={18} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} /></button>
      </div>
    </div>

    <div id="anime-tracker-content" hidden={!expanded}>
      <div className="mt-5 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-950/60" role="tablist" aria-label="追剧状态">
        {([['watching', '追剧中'], ['completed', '已看完']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => setStatus(value)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${status === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>{label}</button>)}
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      {loading ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />)}</div> : items.length === 0 ? <div className="mt-5 flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"><Clapperboard className="mb-2 text-indigo-400" size={24} />{status === 'watching' ? '还没有正在追的戏剧。' : '还没有已完成的戏剧。'}</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(item => {
          const watched = Math.min(item.watchedEpisodes, item.episodeCount || item.watchedEpisodes);
          const progress = item.episodeCount > 0 ? Math.min(100, watched / item.episodeCount * 100) : 0;
          return <article key={item.externalId} className="flex min-w-0 gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">{item.coverUrl ? <img src={item.coverUrl} alt="" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-indigo-400"><Clapperboard size={25} /></span>}</div>
            <div className="flex min-w-0 flex-1 flex-col justify-center"><h3 className="truncate font-semibold text-slate-900 dark:text-white" title={item.title}>{item.title}</h3><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">第 {watched} / {item.episodeCount} 集</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-label={`观看进度 ${Math.round(progress)}%`}><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>{status === 'watching' ? <button type="button" disabled={updatingId === item.externalId || item.episodeCount === 0} onClick={() => void addEpisode(item)} className="mt-3 inline-flex min-h-9 items-center justify-center gap-1.5 self-start rounded-lg bg-indigo-500/15 px-3 text-xs font-bold text-indigo-600 transition hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-300">{updatingId === item.externalId ? <LoaderCircle className="animate-spin" size={14} /> : <Plus size={14} />}+1 集</button> : <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={14} />已看完</span>}</div>
          </article>;
        })}
      </div>}
    </div>
    {addOpen && <AddAnimeDialog onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); setStatus('watching'); void load(); }} />}
  </section>;
}

function AddAnimeDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [watched, setWatched] = useState(0);
  const [total, setTotal] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    if (total < 1 || watched < 0 || watched > total) { setError('集数必须有效，且当前集数不能超过总集数。'); return; }
    setSaving(true); setError(null);
    try {
      const { data, error: lookupError } = await supabase.from('animes').select('external_id,title,cover_url,episode_count').ilike('title', title.trim()).limit(1).maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (!data) throw new Error('找不到这部戏，请输入动漫资料库中已有的剧名。');
      await deleteProgress(data.external_id);
      await upsertProgress({ animeExternalId: data.external_id, animeTitle: data.title, animeCoverUrl: data.cover_url, episodeIndex: Math.max(0, watched - 1), positionSeconds: 0, watchedEpisodes: watched });
      if (watched >= Math.min(total, Math.max(1, data.episode_count))) await markCompleted(data.external_id);
      onCreated();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setSaving(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="add-anime-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-[#131927] dark:text-white sm:p-6"><div className="flex items-center justify-between"><h2 id="add-anime-title" className="text-xl font-bold">添加戏剧</h2><button type="button" onClick={onClose} disabled={saving} aria-label="关闭" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button></div><form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-sm font-medium">剧名<input autoFocus required value={title} onChange={event => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">当前看完集数<input type="number" min="0" max={total} required value={watched} onChange={event => setWatched(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label className="block text-sm font-medium">总集数<input type="number" min="1" required value={total} onChange={event => setTotal(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label></div>{error && <p role="alert" className="text-sm text-rose-500">{error}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">取消</button><button type="submit" disabled={saving} className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">{saving && <LoaderCircle className="animate-spin" size={16} />}保存</button></div></form></section></div>;
}
