import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Camera, Clapperboard, Clock3, FileDown, Plus, TrendingDown, TrendingUp, UserRound } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AnimePlayerModal } from '@/components/anime/AnimePlayerModal';
import type { Tab } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useBudgetTransactions } from '@/hooks/useBudgetTransactions';
import { useProfileData } from '@/hooks/useProfileData';
import { getProfileSummary } from '@/services/profileService';
import { listProgress, type WatchProgress } from '@/services/watchProgressService';
import { mockStocks } from '@/data/mockData';
import type { Anime } from '@/types/anime';
import { initialAboutMeData } from './mockData';
import { useTranslation } from 'react-i18next';

interface HomeProps {
  onNavigate: (tab: Tab, action?: 'budget' | 'resume') => void;
}

interface StoredAnimeProgress {
  anime?: Anime;
  episode?: string;
  episodeIndex?: number;
  currentTime: number;
  durationSeconds?: number;
  updatedAt: string;
}

const cardClass = 'rounded-2xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur-xl transition-all dark:border-slate-800/80 dark:bg-[#131927]/70 dark:hover:border-indigo-500/30';

function latestAnimeProgress(): StoredAnimeProgress | null {
  try {
    return Object.keys(localStorage)
      .filter(key => key.startsWith('anime_progress_'))
      .map(key => JSON.parse(localStorage.getItem(key) || 'null') as StoredAnimeProgress | null)
      .filter((item): item is StoredAnimeProgress => Boolean(item?.anime && item.updatedAt))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null;
  } catch {
    return null;
  }
}

function progressToHomeItem(progress: WatchProgress): StoredAnimeProgress {
  const anime: Anime = {
    id: progress.anime_external_id,
    external_id: progress.anime_external_id,
    title: progress.anime_title ?? progress.anime_external_id,
    cover_url: progress.anime_cover_url,
    description: null,
    rating: 0,
    year: new Date().getFullYear(),
    genres: [],
    episodes: [],
    episode_count: Math.max(progress.watched_episodes, progress.current_episode_index + 1),
    watched_episodes: progress.watched_episodes,
    status: progress.status === 'completed' ? 'completed' : 'ongoing',
    category: null,
    region_category: null,
    area: null,
    release_date: null,
    source_site: null,
    updated_at: progress.updated_at,
  };
  return {
    anime,
    episode: progress.current_episode_label ?? undefined,
    episodeIndex: progress.current_episode_index,
    currentTime: progress.position_seconds,
    durationSeconds: progress.duration_seconds ?? undefined,
    updatedAt: progress.last_watched_at,
  };
}

export function Home({ onNavigate }: HomeProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { transactions, loading: budgetLoading } = useBudgetTransactions(user?.id);
  const { data: profileData } = useProfileData(user?.id ?? 'default', initialAboutMeData);
  const [profile, setProfile] = useState<{ full_name: string; headline: string } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [continueWatching, setContinueWatching] = useState<StoredAnimeProgress | null>(() => latestAnimeProgress());
  const [playingAnime, setPlayingAnime] = useState<Anime | null>(null);
  const locale = i18n.language.startsWith('zh') ? 'zh-MY' : 'en-MY';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    void getProfileSummary(user.id).then(data => {
      if (data) setProfile(data);
    });
  }, [user]);

  const loadContinueWatching = useCallback(async () => {
    if (!user) {
      setContinueWatching(latestAnimeProgress());
      return;
    }
    try {
      const [latest] = (await listProgress()).slice(0, 1);
      setContinueWatching(latest ? progressToHomeItem(latest) : null);
    } catch {
      setContinueWatching(null);
    }
  }, [user]);

  useEffect(() => { queueMicrotask(() => void loadContinueWatching()); }, [loadContinueWatching]);

  const monthSummary = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daily = new Map<number, { income: number; expense: number }>();
    let income = 0;
    let expense = 0;
    transactions.forEach(item => {
      const date = new Date(`${item.transactionDate}T00:00:00`);
      if (date.getFullYear() !== year || date.getMonth() !== month) return;
      const entry = daily.get(date.getDate()) ?? { income: 0, expense: 0 };
      entry[item.type] += item.amount;
      daily.set(date.getDate(), entry);
      if (item.type === 'income') income += item.amount;
      else expense += item.amount;
    });
    const trend = Array.from({ length: today.getDate() }, (_, index) => ({
      day: index + 1,
      ...(daily.get(index + 1) ?? { income: 0, expense: 0 }),
    }));
    return { income, expense, trend };
  }, [transactions]);

  const currency = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }), [locale]);
  const skills = profileData.skillCategories.flatMap(category => category.skills.map(skill => skill.name)).slice(0, 6);
  const displayName = profile?.full_name || user?.email?.split('@')[0] || t('home.user');
  const stocks = ['AAPL', 'NVDA'].map(ticker => mockStocks[ticker]);

  const resumeAnime = () => {
    if (continueWatching?.anime) setPlayingAnime(continueWatching.anime);
    else onNavigate('anime');
  };

  return <div className="mx-auto max-w-7xl space-y-5 pb-8">
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-sm backdrop-blur-xl transition-all dark:border-slate-800/80 dark:from-[#131927]/75 dark:via-[#131927]/70 dark:to-indigo-950/45 dark:hover:border-indigo-500/30 sm:p-8">
      <div className="absolute -right-16 -top-20 size-64 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div><p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{t('home.eyebrow')}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">{t('home.welcome', { name: displayName })}</h1><p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t('home.subtitle')}</p></div>
        <div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300"><Clock3 size={16} />{new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)} MYT</span><span className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950/50"><kbd className="font-semibold text-slate-700 dark:text-slate-200">Cmd + K</kbd> {t('home.search')}</span></div>
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-12">
      <article className={`${cardClass} p-5 xl:col-span-7`}>
        <div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-slate-900 dark:text-white">{t('home.budget.title')}</h2><p className="text-xs text-slate-500">{t('home.budget.subtitle')}</p></div><button onClick={() => onNavigate('budget')} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400" aria-label={t('home.view')}><ArrowRight size={19}/></button></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-emerald-200/70 bg-emerald-50 p-4 backdrop-blur-xl transition-all dark:border-slate-800/80 dark:bg-[#131927]/70 dark:hover:border-indigo-500/30"><span className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><TrendingUp size={15}/>{t('home.budget.income')}</span><strong className="mt-2 block text-2xl text-slate-950 dark:text-white">{budgetLoading ? '—' : currency.format(monthSummary.income)}</strong></div><div className="rounded-2xl border border-rose-200/70 bg-rose-50 p-4 backdrop-blur-xl transition-all dark:border-slate-800/80 dark:bg-[#131927]/70 dark:hover:border-indigo-500/30"><span className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-400"><TrendingDown size={15}/>{t('home.budget.expense')}</span><strong className="mt-2 block text-2xl text-slate-950 dark:text-white">{budgetLoading ? '—' : currency.format(monthSummary.expense)}</strong></div></div>
        <div className="mt-4 h-28"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthSummary.trend}><Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }}/><Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>
      </article>

      <article className={`${cardClass} overflow-hidden xl:col-span-5`}>
        {continueWatching?.anime ? <div className="grid h-full min-h-72 grid-cols-[8rem_1fr]"><img src={continueWatching.anime.cover_url || ''} alt="" className="h-full w-full object-cover"/><div className="flex flex-col justify-between p-5"><div><span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{t('home.anime.kicker')}</span><h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{continueWatching.anime.title}</h2><p className="mt-2 text-sm text-slate-500">{continueWatching.episode || `第 ${(continueWatching.episodeIndex ?? 0) + 1} 集`} · {t('home.anime.resume', { time: Math.floor(continueWatching.currentTime / 60) })}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${continueWatching.durationSeconds && continueWatching.durationSeconds > 0 ? Math.min(100, continueWatching.currentTime / continueWatching.durationSeconds * 100) : 0}%` }} /></div></div><button onClick={resumeAnime} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500"><Clapperboard size={17}/>{t('home.anime.continue')}</button></div></div> : <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center"><Clapperboard className="mb-3 text-indigo-400" size={32}/><h2 className="font-bold text-slate-900 dark:text-white">{t('home.anime.emptyTitle')}</h2><p className="mt-2 text-sm text-slate-500">{t('home.anime.empty')}</p><button onClick={() => onNavigate('anime')} className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500">{t('home.anime.browse')}</button></div>}
      </article>

      <article className={`${cardClass} p-5 xl:col-span-7`}><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900 dark:text-white">{t('home.stocks.title')}</h2><p className="text-xs text-slate-500">{t('home.stocks.subtitle')}</p></div><button onClick={() => onNavigate('stocks')} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400"><ArrowRight size={19}/></button></div><div className="grid gap-3 sm:grid-cols-2">{stocks.map(stock => <div key={stock.summary.ticker} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 backdrop-blur-xl transition-all dark:border-slate-800/80 dark:bg-[#131927]/70 dark:hover:border-indigo-500/30"><div className="flex items-start justify-between"><div><strong className="text-slate-900 dark:text-white">{stock.summary.ticker}</strong><p className="text-xs text-slate-500">{stock.summary.company}</p></div><span className={`text-sm font-semibold ${stock.summary.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stock.summary.changePercent >= 0 ? '+' : ''}{stock.summary.changePercent}%</span></div><div className="mt-3 flex items-end justify-between"><strong className="text-xl text-slate-950 dark:text-white">${stock.summary.price.toFixed(2)}</strong><div className="h-10 w-28"><ResponsiveContainer width="100%" height="100%"><LineChart data={stock.history.slice(-12)}><Line dataKey="close" stroke={stock.summary.changePercent >= 0 ? '#10b981' : '#ef4444'} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></div></div>)}</div></article>

      <article className={`${cardClass} p-5 xl:col-span-5`}><span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{t('home.profile.kicker')}</span><h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{profile?.headline || profileData.experiences[0]?.title || t('home.profile.fallback')}</h2><div className="mt-4 flex flex-wrap gap-2">{skills.length ? skills.map(skill => <span key={skill} className="rounded-full border border-slate-700/50 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300">{skill}</span>) : <span className="text-sm text-slate-500">{t('home.profile.noSkills')}</span>}</div><button onClick={() => onNavigate('profile', 'resume')} className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500/15 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/25"><FileDown size={17}/>{t('home.profile.export')}</button></article>
    </section>

    <section className={`${cardClass} p-4`}><h2 className="mb-3 px-1 text-sm font-bold text-slate-900 dark:text-white">{t('home.quick.title')}</h2><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      { label: t('home.quick.ocr'), icon: Camera, color: 'bg-indigo-500/15 text-indigo-400', run: () => onNavigate('budget', 'budget') },
      { label: t('home.quick.manual'), icon: Plus, color: 'bg-indigo-500/15 text-indigo-400', run: () => onNavigate('budget', 'budget') },
      { label: t('home.quick.anime'), icon: Clapperboard, color: 'text-rose-500 bg-rose-500/10', run: resumeAnime },
      { label: t('home.quick.profile'), icon: UserRound, color: 'text-emerald-500 bg-emerald-500/10', run: () => onNavigate('profile') },
    ].map(item => <button key={item.label} onClick={item.run} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-left text-sm font-semibold text-slate-700 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:bg-[#131927]/70 dark:text-slate-200 dark:hover:border-indigo-500/30"><span className={`rounded-xl p-2.5 ${item.color}`}><item.icon size={19}/></span>{item.label}</button>)}</div></section>
    {playingAnime && <AnimePlayerModal anime={playingAnime} initialEpisodeIndex={continueWatching?.episodeIndex} initialPositionSeconds={continueWatching?.currentTime} onClose={() => { setPlayingAnime(null); void loadContinueWatching(); }}/>} 
  </div>;
}
