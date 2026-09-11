import { useCallback, useEffect, useRef, useState } from "react";
import { Clapperboard, Play, RefreshCw, Search, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimePlayerModal } from "@/components/AnimePlayerModal";
import { supabase } from "@/lib/supabase";
import type { Anime, AnimeEpisode } from "@/types/anime";

const PAGE_SIZE = 24;
const categories = [
  { value: "All", labelKey: "all" },
  { value: "日韩动漫", labelKey: "japaneseKorean" },
  { value: "国产动漫", labelKey: "chinese" },
  { value: "欧美动漫", labelKey: "western" },
  { value: "港台动漫", labelKey: "hongKongTaiwan" },
] as const;
type AnimeCategory = (typeof categories)[number]["value"];

function isEpisode(value: unknown): value is AnimeEpisode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).ep === "string" &&
    typeof (value as Record<string, unknown>).url === "string"
  );
}

function normalizeAnime(value: unknown): Anime | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  return {
    id: row.id,
    external_id: typeof row.external_id === "string" ? row.external_id : row.id,
    title: row.title,
    cover_url:
      typeof row.cover_url === "string"
        ? row.cover_url.replace(/^http:\/\//i, "https://")
        : null,
    description: typeof row.description === "string" ? row.description : null,
    rating: Number.isFinite(Number(row.rating)) ? Number(row.rating) : 8.5,
    year: Number.isFinite(Number(row.year)) ? Number(row.year) : 2026,
    genres: Array.isArray(row.genres)
      ? row.genres.filter((genre): genre is string => typeof genre === "string")
      : [],
    episodes: Array.isArray(row.episodes) ? row.episodes.filter(isEpisode) : [],
    source_site: typeof row.source_site === "string" ? row.source_site : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

function AnimeSkeleton() {
  const { t } = useTranslation();
  return (
    <div
      className="animate-pulse"
      role="status"
      aria-label={t("anime.loading")}
    >
      <div className="h-[390px] rounded-2xl bg-gradient-to-r from-[#131825] via-[#1a2030] to-[#131825] sm:h-[430px]" />
      <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index}>
            <div className="aspect-[3/4] rounded-xl bg-[#181F30]" />
            <div className="mt-3 h-4 rounded bg-[#181F30]" />
            <div className="mt-2 h-3 w-2/3 rounded bg-[#131825]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnimePage() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] =
    useState<AnimeCategory>("All");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Anime | null>(null);
  const requestSequence = useRef(0);

  const loadAnime = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    let request = supabase
      .from("animes")
      .select(
        "id,external_id,title,cover_url,description,rating,year,genres,episodes,source_site,updated_at",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false });
    if (searchQuery) request = request.ilike("title", `%${searchQuery}%`);
    if (selectedCategory !== "All")
      request = request.contains("genres", [selectedCategory]);
    const from = (page - 1) * PAGE_SIZE;
    const {
      data,
      error: queryError,
      count,
    } = await request.range(from, from + PAGE_SIZE - 1);
    if (requestId !== requestSequence.current) return;
    if (queryError) setError(queryError.message);
    else {
      const items = (data ?? [])
        .map(normalizeAnime)
        .filter((item): item is Anime => item !== null);
      const exactTotal = count ?? 0;
      setAnime((current) => (page === 1 ? items : [...current, ...items]));
      setTotal(exactTotal);
      setHasMore(from + items.length < exactTotal);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [page, searchQuery, selectedCategory]);

  useEffect(() => {
    queueMicrotask(() => void loadAnime());
  }, [loadAnime]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = searchInput.trim();
      if (nextQuery === searchQuery) return;
      setAnime([]);
      setPage(1);
      setLoading(true);
      setSearchQuery(nextQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchQuery]);

  const featured =
    anime.find((item) => item.rating >= 9 && item.cover_url) ??
    anime.find((item) => item.cover_url) ??
    anime[0];

  const commitSearch = () => {
    const nextQuery = searchInput.trim();
    if (nextQuery === searchQuery) return;
    setAnime([]);
    setPage(1);
    setLoading(true);
    setSearchQuery(nextQuery);
  };

  return (
    <div className="mx-auto min-h-[calc(100vh-7rem)] max-w-[1600px] rounded-3xl bg-[#0B0E17] p-4 text-slate-100 shadow-2xl shadow-black/20 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 ring-1 ring-violet-400/20">
            <Clapperboard size={21} />
          </span>
          <h1 className="text-xl font-bold tracking-tight">
            Ani<span className="text-violet-400">Stream</span>
          </h1>
        </div>
        <label className="relative min-w-0 flex-1 xl:mx-8 xl:max-w-xl">
          <span className="sr-only">{t("anime.searchLabel")}</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitSearch();
            }}
            placeholder={t("anime.searchPlaceholder")}
            className="min-h-12 w-full rounded-xl border border-slate-800 bg-[#131825] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
          />
        </label>
      </header>

      <div
        className="mb-6 flex max-w-full gap-2 overflow-x-auto border-b border-slate-800 pb-3"
        aria-label={t("anime.categoryLabel")}
      >
        {categories.map((category) => (
          <button
            key={category.value}
            type="button"
            onClick={() => {
              if (category.value === selectedCategory) return;
              setAnime([]);
              setPage(1);
              setLoading(true);
              setSelectedCategory(category.value);
            }}
            className={`min-h-10 shrink-0 rounded-lg px-4 text-sm font-semibold transition ${selectedCategory === category.value ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40" : "bg-[#131825] text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            {t(`anime.categories.${category.labelKey}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <AnimeSkeleton />
      ) : error ? (
        <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-rose-900/50 bg-[#131825] px-6 text-center">
          <p className="text-sm text-rose-300" title={error}>
            {t("anime.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void loadAnime()}
            className="mt-5 flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white"
          >
            <RefreshCw size={16} />
            {t("anime.tryAgain")}
          </button>
        </div>
      ) : anime.length === 0 ? (
        <div className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#131825] px-6 text-sm text-slate-500">
          {searchQuery
            ? t("anime.emptySearch", { query: searchQuery })
            : selectedCategory !== "All"
              ? t("anime.emptyCategory", { category: selectedCategory })
              : t("anime.empty")}
        </div>
      ) : (
        <>
          {featured && (
            <section className="relative isolate min-h-[390px] overflow-hidden rounded-2xl border border-white/5 bg-[#131825] sm:min-h-[430px]">
              <img
                src={featured.cover_url || "/anime/void-empress-hero.png"}
                alt={t("anime.bannerAlt", { title: featured.title })}
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B0E17] via-[#0B0E17]/85 to-[#0B0E17]/5" />
              <div className="relative z-10 flex min-h-[390px] max-w-2xl flex-col items-start justify-center px-6 py-10 sm:min-h-[430px] sm:px-10 lg:px-14">
                <span className="mb-5 rounded-md bg-violet-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">
                  {t("anime.featured")}
                </span>
                <h2 className="text-4xl font-black text-white sm:text-5xl">
                  {featured.title}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                  <span className="flex items-center gap-1 font-bold text-amber-400">
                    <Star size={15} fill="currentColor" />
                    {featured.rating.toFixed(1)}
                  </span>
                  <span>·</span>
                  <span>{featured.year}</span>
                  <span>·</span>
                  <span>
                    {t("anime.player.episodeCount", {
                      count: featured.episodes.length,
                    })}
                  </span>
                </div>
                <p className="mt-5 line-clamp-3 max-w-md text-sm leading-6 text-slate-400 sm:text-base">
                  {featured.description || t("anime.fallbackDescription")}
                </p>
                <button
                  type="button"
                  disabled={!featured.episodes.length}
                  onClick={() => setPlaying(featured)}
                  className="mt-7 flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Play size={17} fill="currentColor" />
                  {t("anime.watchNow")}
                </button>
              </div>
            </section>
          )}
          <section className="mt-9">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("anime.allTitles")}
              </h2>
              <span className="text-xs text-slate-600">
                {t("anime.loadedItems", { loaded: anime.length, total })}
              </span>
            </div>
            {anime.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
                {anime.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.episodes.length}
                    onClick={() => setPlaying(item)}
                    className="group min-w-0 text-left disabled:opacity-60"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#181F30] ring-1 ring-white/5">
                      {item.cover_url ? (
                        <img
                          src={item.cover_url}
                          alt={t("anime.coverAlt", { title: item.title })}
                          loading="lazy"
                          className="size-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-indigo-400">
                          <Clapperboard size={32} />
                        </div>
                      )}
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-bold text-amber-400">
                        <Star size={11} fill="currentColor" />
                        {item.rating.toFixed(1)}
                      </span>
                      <span className="absolute bottom-2 left-2 rounded-md bg-violet-500/80 px-2 py-1 text-[10px] font-bold uppercase text-white opacity-0 group-hover:opacity-100">
                        {t("anime.play")}
                      </span>
                    </div>
                    <h3 className="mt-3 truncate text-sm font-semibold text-slate-100 group-hover:text-violet-300">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.year} ·{" "}
                      {t("anime.player.episodeCount", {
                        count: item.episodes.length,
                      })}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-[#131825] px-6 py-16 text-center text-sm text-slate-500">
                {t("anime.empty")}
              </div>
            )}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => setPage((current) => current + 1)}
                  className="flex min-h-12 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-6 text-sm font-bold text-indigo-300 transition hover:bg-indigo-500/20 disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingMore ? t("anime.loadingMore") : t("anime.loadMore")}
                </button>
              </div>
            )}
          </section>
        </>
      )}
      {playing && (
        <AnimePlayerModal anime={playing} onClose={() => setPlaying(null)} />
      )}
    </div>
  );
}
