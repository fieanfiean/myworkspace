import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Clapperboard, RefreshCw, Search, SlidersHorizontal, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimePlayerModal } from "@/components/AnimePlayerModal";
import { supabase } from "@/lib/supabase";
import type { Anime, AnimeEpisode } from "@/types/anime";

const PAGE_SIZE = 24;
const filterOptions = {
  type: ["all", "anime", "movie", "series", "documentary"],
  region: ["all", "japan", "china", "western", "korea", "hongKongTaiwan", "other"],
  genre: ["all", "hotBlooded", "fantasy", "sciFi", "mystery", "romance", "comedy", "school", "healing", "action"],
  status: ["all", "ongoing", "completed"],
  year: ["all", "2026", "2025", "2024", "2023", "2020s", "2010s"],
} as const;
type FilterKey = keyof typeof filterOptions;
type Filters = { [K in FilterKey]: (typeof filterOptions)[K][number] };
const defaultFilters: Filters = { type: "all", region: "all", genre: "all", status: "all", year: "all" };
const genreAliases: Record<Exclude<FilterKey, "year">, Record<string, string[]>> = {
  type: { anime: ["动漫", "动漫片", "动画", "动画片", "Anime", "日本动漫", "日韩动漫", "国产动漫", "欧美动漫", "港台动漫"], movie: ["电影", "电影片", "Movies", "Movie"], series: ["电视剧", "连续剧", "剧集", "TV Series"], documentary: ["纪录片", "记录片", "Documentaries", "Documentary"] },
  region: { japan: ["日本"], china: ["中国", "大陆", "中国大陆", "国产"], western: ["欧美", "美国", "英国", "法国", "德国", "加拿大", "西班牙", "意大利", "澳大利亚"], korea: ["韩国"], hongKongTaiwan: ["港台", "香港", "台湾", "中国香港", "中国台湾"], other: ["其他", "其它"] },
  genre: { hotBlooded: ["热血"], fantasy: ["奇幻", "Fantasy"], sciFi: ["科幻"], mystery: ["悬疑", "推理"], romance: ["恋爱", "爱情"], comedy: ["搞笑", "喜剧"], school: ["校园"], healing: ["治愈"], action: ["动作", "Action"] },
  status: { ongoing: ["连载", "连载中", "更新中", "Ongoing"], completed: ["完结", "已完结", "Completed"] },
};

function mediaType(item: Anime): Exclude<Filters["type"], "all"> {
  const text = `${item.region_category ?? ""} ${item.genres.join(" ")}`.toLocaleLowerCase();
  if (/纪录|documentary/.test(text)) return "documentary";
  if (/电影|movie/.test(text) || item.episodes.length === 1 && /full movie/i.test(item.episodes[0]?.ep ?? "")) return "movie";
  if (/电视剧|剧集|tv series|连续剧/.test(text)) return "series";
  return "anime";
}

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
    status: row.status === "completed" ? "completed" : "ongoing",
    category: typeof row.region_category === "string" ? row.region_category : null,
    region_category: typeof row.region_category === "string" ? row.region_category : null,
    area: typeof row.area === "string" ? row.area : null,
    release_date: typeof row.release_date === "string" ? row.release_date : null,
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
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
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);
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
        "id,external_id,title,cover_url,description,rating,year,genres,episodes,status,region_category,area,release_date,source_site,updated_at",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false });
    if (searchQuery) request = request.ilike("title", `%${searchQuery}%`);
    if (filters.type !== "all") request = request.in("region_category", genreAliases.type[filters.type]);
    if (filters.region !== "all") request = request.in("area", genreAliases.region[filters.region]);
    if (filters.genre !== "all") request = request.overlaps("genres", genreAliases.genre[filters.genre]);
    if (filters.status !== "all") request = request.eq("status", filters.status);
    if (filters.year !== "all") {
      if (filters.year === "2020s") request = request.gte("year", 2020).lte("year", 2029);
      else if (filters.year === "2010s") request = request.gte("year", 2010).lte("year", 2019);
      else request = request.eq("year", Number(filters.year));
    }
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
  }, [filters, page, searchQuery]);

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

  const changeFilter = <K extends FilterKey>(key: K, value: Filters[K]) => {
    setAnime([]);
    setPage(1);
    setLoading(true);
    setFilters(current => ({ ...current, [key]: value }));
  };

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

      <section className="mb-7 overflow-hidden rounded-2xl border border-slate-800 bg-[#111622]" aria-label={t("anime.filters.title")}>
        <button type="button" onClick={() => setFiltersOpen(value => !value)} aria-expanded={filtersOpen} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm font-semibold text-slate-200 sm:px-5"><span className="flex items-center gap-2"><SlidersHorizontal size={17} className="text-violet-400"/>{t("anime.filters.title")}</span><ChevronDown size={17} className={`transition ${filtersOpen ? "rotate-180" : ""}`}/></button>
        {filtersOpen && <div className="space-y-4 border-t border-slate-800 p-4 sm:p-5">{(Object.keys(filterOptions) as FilterKey[]).map(key => <div key={key} className="grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-start"><h2 className="pt-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t(`anime.filters.dimensions.${key}`)}</h2><div className="flex flex-wrap gap-2">{filterOptions[key].map(value => <button key={value} type="button" onClick={() => changeFilter(key, value)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition sm:text-sm ${filters[key] === value ? "bg-violet-600 text-white shadow-md shadow-violet-950/40" : "bg-[#181F30] text-slate-400 hover:bg-slate-700 hover:text-white"}`}>{t(`anime.filters.options.${key}.${value}`)}</button>)}</div></div>)}</div>}
      </section>

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
            : Object.values(filters).some(value => value !== "all")
              ? t("anime.filters.empty")
              : t("anime.empty")}
        </div>
      ) : (
        <>
          <section>
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
                {anime.map((item) => {
                  const kind = mediaType(item);
                  const badge = kind === "movie" || kind === "documentary"
                    ? `${t("anime.cards.hd")} · ${item.year}`
                    : item.status === "completed"
                      ? t("anime.cards.completed")
                      : item.status === "ongoing"
                        ? item.episodes.length > 0
                          ? t("anime.cards.updatedTo", { count: item.episodes.length })
                          : t("anime.filters.options.status.ongoing")
                        : item.episodes.length > 0
                          ? t("anime.cards.updatedTo", { count: item.episodes.length })
                          : t("anime.play");
                  return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlaying(item)}
                    className="group min-w-0 text-left"
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
                      <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-violet-600/90 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                        {badge}
                      </span>
                    </div>
                    <h3 className="mt-3 truncate text-sm font-semibold text-slate-100 group-hover:text-violet-300">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.year} · {item.category || t(`anime.filters.options.type.${kind}`)}
                    </p>
                  </button>
                  );
                })}
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
