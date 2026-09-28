import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { Drawer } from "vaul";
import { Keyboard, ListVideo, Play, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Anime, AnimeEpisode } from "@/types/anime";
import { getAnimeSources } from "@/services/animeService";
import { getProgress } from "@/services/watchProgressService";
import { useWatchProgress } from "@/hooks/useWatchProgress";

interface Props {
  anime: Anime;
  onClose: () => void;
  initialEpisodeIndex?: number;
  initialPositionSeconds?: number;
}

interface AnimeDetailResponse {
  external_id: string;
  title: string;
  description: string | null;
  episodes: AnimeEpisode[];
}

interface PlaybackProgress {
  anime: Anime;
  episode: string;
  episodeIndex: number;
  currentTime: number;
  updatedAt: string;
}

const EPISODES_PER_RANGE = 25;
const PROGRESS_STORAGE_PREFIX = "anime_progress_";
const PROGRESS_SAVE_INTERVAL_SECONDS = 5;

function animeSourceKey(anime: Anime): string {
  return `${anime.source || "ffzy5"}:${anime.external_id || anime.id}`;
}

function readProgress(key: string): PlaybackProgress | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const progress = value as Partial<PlaybackProgress>;
    if (
      typeof progress.episode !== "string" ||
      typeof progress.episodeIndex !== "number" ||
      typeof progress.currentTime !== "number" ||
      !Number.isFinite(progress.currentTime)
    ) return null;
    return {
      anime: (progress as Partial<PlaybackProgress>).anime as Anime,
      episode: progress.episode,
      episodeIndex: progress.episodeIndex,
      currentTime: Math.max(0, progress.currentTime),
      updatedAt: typeof progress.updatedAt === "string" ? progress.updatedAt : "",
    };
  } catch {
    return null;
  }
}

function secureStreamUrl(value: string): string | null {
  const upgraded = value.trim().replace(/^http:\/\//i, "https://");
  try {
    const url = new URL(upgraded);
    return url.protocol === "https:" &&
      url.pathname.toLocaleLowerCase().includes(".m3u8")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function AnimePlayerModal({ anime, onClose, initialEpisodeIndex, initialPositionSeconds }: Props) {
  const { t } = useTranslation();

  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [sources, setSources] = useState<Anime[]>([anime]);
  const [activeSource, setActiveSource] = useState<Anime>(anime);
  const [unavailableSources, setUnavailableSources] = useState<Set<string>>(() => new Set());
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedRange, setSelectedRange] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [episodeDrawerOpen, setEpisodeDrawerOpen] = useState(false);
  const [playbackSnapshot, setPlaybackSnapshot] = useState({ positionSeconds: 0, durationSeconds: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const playingIndexRef = useRef(0);
  const resumeTimeRef = useRef(0);
  const sourceResumeRef = useRef<{ episodeIndex: number; positionSeconds: number } | null>(null);
  const lastSavedSecondRef = useRef(-PROGRESS_SAVE_INTERVAL_SECONDS);
  const rangeTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedEpisode = episodes[selectedIndex];
  const episodeRanges = useMemo(() => Array.from(
    { length: Math.ceil(episodes.length / EPISODES_PER_RANGE) },
    (_, index) => ({ start: index * EPISODES_PER_RANGE, end: Math.min((index + 1) * EPISODES_PER_RANGE, episodes.length) }),
  ), [episodes.length]);
  const visibleRange = episodeRanges[selectedRange];
  const visibleEpisodes = visibleRange ? episodes.slice(visibleRange.start, visibleRange.end) : [];
  const animeId = anime.external_id || anime.id;
  const progressStorageKey = `${PROGRESS_STORAGE_PREFIX}${animeId}`;
  const { flush } = useWatchProgress({
    anime,
    episodeIndex: selectedIndex,
    episodeLabel: selectedEpisode?.ep ?? "",
    positionSeconds: playbackSnapshot.positionSeconds,
    durationSeconds: playbackSnapshot.durationSeconds,
  });

  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    const episodeIndex = playingIndexRef.current;
    const episode = episodes[episodeIndex];
    if (!video || !episode || !Number.isFinite(video.currentTime)) return;
    const progress: PlaybackProgress = {
      anime,
      episode: episode.ep,
      episodeIndex,
      currentTime: Math.max(0, video.currentTime),
      updatedAt: new Date().toISOString(),
    };
    setPlaybackSnapshot({
      positionSeconds: progress.currentTime,
      durationSeconds: Number.isFinite(video.duration) ? Math.max(0, video.duration) : 0,
    });
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(progress));
    } catch {
      // Playback remains available when storage is disabled or full.
    }
  }, [anime, episodes, progressStorageKey]);

  const selectEpisode = useCallback((index: number) => {
    if (index < 0 || index >= episodes.length || index === selectedIndex) return;
    saveProgress();
    void flush();
    resumeTimeRef.current = 0;
    lastSavedSecondRef.current = -PROGRESS_SAVE_INTERVAL_SECONDS;
    setSelectedIndex(index);
    setSelectedRange(Math.floor(index / EPISODES_PER_RANGE));
  }, [episodes.length, flush, saveProgress, selectedIndex]);

  const handleClose = useCallback(() => {
    saveProgress();
    void flush();
    onClose();
  }, [flush, onClose, saveProgress]);

  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      if (!isMounted) return;
      setSources([anime]);
      setActiveSource(anime);
      setUnavailableSources(new Set());
    });
    void getAnimeSources(anime.title)
      .then((items) => {
        if (!isMounted || items.length === 0) return;
        setSources(items);
        setActiveSource((current) => animeSourceKey(current) === animeSourceKey(items[0]) ? current : items[0]);
      })
      .catch(() => {
        // The initially selected row remains playable if source discovery fails.
      });
    return () => { isMounted = false; };
  }, [anime]);

  const switchSource = useCallback((sourceKey: string) => {
    const nextSource = sources.find((item) => animeSourceKey(item) === sourceKey);
    if (!nextSource || animeSourceKey(nextSource) === animeSourceKey(activeSource)) return;
    const currentPosition = videoRef.current?.currentTime;
    sourceResumeRef.current = {
      episodeIndex: selectedIndex,
      positionSeconds: Number.isFinite(currentPosition) ? Math.max(0, currentPosition ?? 0) : playbackSnapshot.positionSeconds,
    };
    saveProgress();
    void flush();
    setPlayerError(null);
    setActiveSource(nextSource);
  }, [activeSource, flush, playbackSnapshot.positionSeconds, saveProgress, selectedIndex, sources]);

  // 1. 从 Cloudflare R2 拉取完整 JSON 详情
  useEffect(() => {
    const id = activeSource.external_id || activeSource.id;
    if (!id) return;
    const currentSourceKey = animeSourceKey(activeSource);

    let isMounted = true;

    queueMicrotask(() => {
      if (isMounted) {
        setLoadingDetail(true);
        setDetailError(null);
        setEpisodes([]);
      }
    });

    const r2PublicUrl = (import.meta.env.VITE_R2_PUBLIC_URL || "").replace(/\/+$/, "");

    const localSaved = readProgress(progressStorageKey);
    const remoteProgress = anime.external_id
      ? getProgress(anime.external_id).catch(() => null)
      : Promise.resolve(null);

    Promise.all([
      fetch(`${r2PublicUrl}/anime-details/${encodeURIComponent(activeSource.source || "ffzy5")}/${encodeURIComponent(id)}.json`).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch anime details from R2");
        return res.json() as Promise<AnimeDetailResponse>;
      }),
      remoteProgress,
    ])
      .then(([data, remoteSaved]) => {
        if (!isMounted) return;
        const safeEpisodes = (data.episodes || [])
          .map((item) => ({ ...item, url: secureStreamUrl(item.url) }))
          .filter((item): item is AnimeEpisode => item.url !== null);

        setEpisodes(safeEpisodes);
        setUnavailableSources((current) => {
          if (!current.has(currentSourceKey)) return current;
          const next = new Set(current);
          next.delete(currentSourceKey);
          return next;
        });
        const sourceResume = sourceResumeRef.current;
        sourceResumeRef.current = null;
        if (sourceResume && safeEpisodes.length > 0) {
          const restoredIndex = Math.min(Math.max(0, sourceResume.episodeIndex), safeEpisodes.length - 1);
          resumeTimeRef.current = sourceResume.positionSeconds;
          lastSavedSecondRef.current = Math.floor(sourceResume.positionSeconds);
          setSelectedIndex(restoredIndex);
          setSelectedRange(Math.floor(restoredIndex / EPISODES_PER_RANGE));
          setPlaybackSnapshot((current) => ({ ...current, positionSeconds: sourceResume.positionSeconds }));
          return;
        }
        const localTimestamp = localSaved?.updatedAt ? Date.parse(localSaved.updatedAt) : Number.NEGATIVE_INFINITY;
        const remoteTimestamp = remoteSaved?.last_watched_at ? Date.parse(remoteSaved.last_watched_at) : Number.NEGATIVE_INFINITY;
        const remoteIsNewer = Boolean(remoteSaved) && remoteTimestamp > localTimestamp;
        const saved = remoteIsNewer && remoteSaved ? {
          episode: remoteSaved.current_episode_label ?? "",
          episodeIndex: remoteSaved.current_episode_index,
          currentTime: remoteSaved.position_seconds,
        } : localSaved;
        if (saved && safeEpisodes.length > 0) {
          const savedEpisodeIndex = safeEpisodes.findIndex((episode) => episode.ep === saved.episode);
          const restoredIndex = savedEpisodeIndex >= 0
            ? savedEpisodeIndex
            : Math.min(Math.max(0, saved.episodeIndex), safeEpisodes.length - 1);
          resumeTimeRef.current = saved.currentTime;
          lastSavedSecondRef.current = Math.floor(saved.currentTime);
          setSelectedIndex(restoredIndex);
          setSelectedRange(Math.floor(restoredIndex / EPISODES_PER_RANGE));
          setPlaybackSnapshot({
            positionSeconds: Math.max(0, saved.currentTime),
            durationSeconds: remoteIsNewer && remoteSaved?.duration_seconds ? remoteSaved.duration_seconds : 0,
          });
        } else if (safeEpisodes.length > 0 && initialEpisodeIndex !== undefined) {
          const restoredIndex = Math.min(Math.max(0, initialEpisodeIndex), safeEpisodes.length - 1);
          const restoredTime = Math.max(0, initialPositionSeconds ?? 0);
          resumeTimeRef.current = restoredTime;
          lastSavedSecondRef.current = Math.floor(restoredTime);
          setSelectedIndex(restoredIndex);
          setSelectedRange(Math.floor(restoredIndex / EPISODES_PER_RANGE));
          setPlaybackSnapshot({ positionSeconds: restoredTime, durationSeconds: 0 });
        } else {
          resumeTimeRef.current = 0;
          setSelectedIndex(0);
          setSelectedRange(0);
          setPlaybackSnapshot({ positionSeconds: 0, durationSeconds: 0 });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Fetch R2 anime detail error:", err);
        setEpisodes([]);
        setUnavailableSources((current) => new Set(current).add(currentSourceKey));
        setDetailError("anime.player.loadFailed");
      })
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSource, anime.external_id, initialEpisodeIndex, initialPositionSeconds, progressStorageKey]);

  useEffect(() => {
    rangeTabRefs.current[selectedRange]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedRange]);

  // 2. 键盘 Esc 关闭与页面 Scroll 锁定
  useEffect(() => {
    const handleKeyboard = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) return;

      const video = videoRef.current;
      const key = event.key.toLowerCase();
      if (key === "escape") {
        handleClose();
        return;
      }
      if (!video || !selectedEpisode) return;

      if (key === " " || event.code === "Space") {
        event.preventDefault();
        if (video.paused) void video.play().catch(() => undefined);
        else video.pause();
      } else if (key === "arrowleft" || key === "arrowright") {
        event.preventDefault();
        const offset = key === "arrowleft" ? -5 : 5;
        const maximum = Number.isFinite(video.duration) ? video.duration : Number.MAX_SAFE_INTEGER;
        video.currentTime = Math.min(maximum, Math.max(0, video.currentTime + offset));
      } else if (key === "arrowup" || key === "arrowdown") {
        event.preventDefault();
        video.volume = Math.min(1, Math.max(0, video.volume + (key === "arrowup" ? 0.1 : -0.1)));
      } else if (key === "f") {
        event.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen();
        else void video.requestFullscreen().catch(() => undefined);
      } else if (key === "n") {
        event.preventDefault();
        selectEpisode(selectedIndex + 1);
      } else if (key === "p") {
        event.preventDefault();
        selectEpisode(selectedIndex - 1);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [handleClose, selectEpisode, selectedEpisode, selectedIndex]);

  // 3. HLS 播放控制逻辑 (解决竞态销毁与 Safari 自动播放问题)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedEpisode) return;
    playingIndexRef.current = selectedIndex;

    let isMounted = true;
    let hlsInstance: Hls | null = null;

    queueMicrotask(() => {
      if (isMounted) {
        setPlayerError(null);
        setPlayerLoading(true);
      }
    });

    // iOS / Safari 原生 HLS 支持
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = selectedEpisode.url;
      video.load();
      void video.play().catch(() => undefined);
      return () => {
        isMounted = false;
        video.removeAttribute("src");
        video.load();
      };
    }

    // Chrome / Firefox 等其它浏览器使用 HLS.js
    void import("hls.js")
      .then(({ default: HlsPlayer }) => {
        if (!isMounted) return;

        if (!HlsPlayer.isSupported()) {
          setPlayerError("anime.player.unsupported");
          setPlayerLoading(false);
          return;
        }

        hlsInstance = new HlsPlayer({ enableWorker: true });
        hlsInstance.loadSource(selectedEpisode.url);
        hlsInstance.attachMedia(video);

        hlsInstance.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
          if (!isMounted) return;
          setUnavailableSources((current) => {
            const key = animeSourceKey(activeSource);
            if (!current.has(key)) return current;
            const next = new Set(current);
            next.delete(key);
            return next;
          });
          setPlayerLoading(false);
          void video.play().catch(() => undefined);
        });

        hlsInstance.on(HlsPlayer.Events.ERROR, (_event, data) => {
          if (!data.fatal || !hlsInstance || !isMounted) return;
          setUnavailableSources((current) => new Set(current).add(animeSourceKey(activeSource)));
          if (data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR) {
            hlsInstance.startLoad();
          } else if (data.type === HlsPlayer.ErrorTypes.MEDIA_ERROR) {
            hlsInstance.recoverMediaError();
          } else {
            setPlayerError("anime.player.unavailable");
            setPlayerLoading(false);
          }
        });
      })
      .catch(() => {
        if (isMounted) {
          setPlayerError("anime.player.playerLoadFailed");
          setPlayerLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [activeSource, selectedEpisode, selectedIndex]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.20),rgba(0,0,0,0.94)_68%)] p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="anime-player-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-indigo-500/25 bg-[#0B0E17] shadow-[0_0_60px_rgba(99,102,241,0.25)]">
        <header className="flex min-h-16 items-center gap-4 border-b border-slate-800 px-4 sm:px-6">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
            <Play size={17} fill="currentColor" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="anime-player-title"
              className="truncate font-bold text-white"
            >
              {anime.title}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {loadingDetail
                ? t("anime.player.loading")
                : selectedEpisode
                ? t("anime.player.playingEpisode", {
                    episode: selectedEpisode.ep,
                  })
                : t("anime.player.noEpisodes")}
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="hidden sm:inline">{t("animePlaybackSource")}</span>
            <select
              value={animeSourceKey(activeSource)}
              onChange={(event) => switchSource(event.target.value)}
              aria-label={t("animePlaybackSource")}
              className="min-h-10 max-w-36 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              {sources.map((item) => {
                const key = animeSourceKey(item);
                return <option key={key} value={key}>{item.source || "ffzy5"}{unavailableSources.has(key) ? ` ${t("animeSourceUnavailable")}` : ""}</option>;
              })}
            </select>
          </label>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("common.close")}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={21} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* 视频播放器区域 */}
          <div className="relative flex min-h-[240px] items-center justify-center bg-black lg:min-h-[520px]">
            {loadingDetail ? (
              <p className="text-sm text-slate-400">{t("anime.player.loading")}</p>
            ) : selectedEpisode ? (
              <video
                ref={videoRef}
                controls
                playsInline
                className="max-h-[72vh] size-full bg-black object-contain"
                onLoadedMetadata={(event) => {
                  const resumeTime = resumeTimeRef.current;
                  if (resumeTime > 0) {
                    const duration = event.currentTarget.duration;
                    event.currentTarget.currentTime = Number.isFinite(duration)
                      ? Math.min(resumeTime, Math.max(0, duration - 0.25))
                      : resumeTime;
                    resumeTimeRef.current = 0;
                  }
                }}
                onCanPlay={() => setPlayerLoading(false)}
                onTimeUpdate={(event) => {
                  const currentSecond = Math.floor(event.currentTarget.currentTime);
                  if (Math.abs(currentSecond - lastSavedSecondRef.current) >= PROGRESS_SAVE_INTERVAL_SECONDS) {
                    lastSavedSecondRef.current = currentSecond;
                    saveProgress();
                  }
                }}
                onPause={() => { saveProgress(); void flush(); }}
                onEnded={() => { saveProgress(); void flush(); }}
                onError={() => {
                  setUnavailableSources((current) => new Set(current).add(animeSourceKey(activeSource)));
                  setPlayerError("anime.player.loadFailed");
                  setPlayerLoading(false);
                }}
              />
            ) : (
              <p className="px-6 text-center text-sm text-slate-500">
                {detailError ? t(detailError) : t("anime.player.noSecureEpisodes")}
              </p>
            )}

            {selectedEpisode && playerLoading && !loadingDetail && (
              <p
                className="pointer-events-none absolute rounded-lg bg-black/70 px-4 py-2 text-sm text-slate-300"
                role="status"
              >
                {t("anime.player.loading")}
              </p>
            )}
            {episodes.length > 0 && <button type="button" onClick={() => setEpisodeDrawerOpen(true)} className="absolute bottom-4 right-4 flex min-h-11 items-center gap-2 rounded-xl border border-indigo-400/30 bg-slate-950/80 px-4 text-sm font-semibold text-indigo-200 shadow-lg backdrop-blur-lg lg:hidden"><ListVideo size={17}/>{t("anime.player.selectEpisode")}</button>}
          </div>

          {/* 右侧选集列表 */}
          <aside className="hidden min-h-0 flex-col border-t border-slate-800 bg-[#101522] lg:flex lg:border-l lg:border-t-0">
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              <ListVideo size={16} />
              {t("anime.player.selectEpisode")}
              <span className="ml-auto text-slate-600">
                {t("anime.player.episodeCount", { count: episodes.length })}
              </span>
            </div>
            <div className="flex items-center gap-2 border-b border-slate-800/80 px-4 py-2 text-[11px] text-slate-500">
              <Keyboard size={14} className="shrink-0" aria-hidden="true" />
              <span>{t("animePlayerShortcuts")}</span>
            </div>
            {!loadingDetail && episodeRanges.length > 0 && <div
              className="scrollbar-none flex shrink-0 touch-pan-x gap-2 overflow-x-auto overscroll-x-contain border-b border-slate-800/80 p-3"
              style={{ WebkitOverflowScrolling: "touch" }}
              aria-label={t("anime.player.selectEpisode")}
            >
              {episodeRanges.map((range, index) => <button
                key={`${range.start}-${range.end}`}
                ref={element => { rangeTabRefs.current[index] = element; }}
                type="button"
                onClick={() => setSelectedRange(index)}
                aria-pressed={selectedRange === index}
                className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-semibold transition ${selectedRange === index ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"}`}
              >
                {range.start + 1}-{range.end}
              </button>)}
            </div>}
            <div
              className="grid max-h-52 min-h-0 touch-pan-y grid-cols-4 gap-2 overflow-y-auto overscroll-y-contain p-3 sm:grid-cols-5 lg:max-h-[430px] lg:flex-1 lg:grid-cols-2 lg:content-start"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
            >
              {loadingDetail ? <div className="col-span-full p-3 text-xs text-slate-500">{t("anime.player.loading")}</div> : visibleEpisodes.map((episode, offset) => {
                const index = (visibleRange?.start ?? 0) + offset;
                return (
                  <button
                    key={`${episode.ep}-${episode.url}`}
                    type="button"
                    onClick={() => selectEpisode(index)}
                    aria-current={selectedIndex === index ? "true" : undefined}
                    className={`min-h-11 min-w-0 rounded-lg px-2 py-2 text-center text-sm transition ${
                      selectedIndex === index
                        ? "bg-indigo-600 font-semibold text-white"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="block truncate">
                      {episode.ep}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>

        <Drawer.Root open={episodeDrawerOpen} onOpenChange={setEpisodeDrawerOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-sm lg:hidden" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[121] flex max-h-[82dvh] flex-col rounded-t-3xl border border-slate-700 bg-[#101522] pb-[env(safe-area-inset-bottom)] outline-none lg:hidden">
              <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-600" />
              <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4"><ListVideo size={18} className="text-indigo-400"/><Drawer.Title className="font-bold text-white">{t("anime.player.selectEpisode")}</Drawer.Title><span className="ml-auto text-xs text-slate-500">{t("anime.player.episodeCount", { count: episodes.length })}</span></div>
              <div className="scrollbar-none flex shrink-0 touch-pan-x gap-2 overflow-x-auto border-b border-slate-800 p-3" data-horizontal-scroll>{episodeRanges.map((range, index) => <button key={`${range.start}-${range.end}`} type="button" onClick={() => setSelectedRange(index)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold ${selectedRange === index ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400"}`}>{range.start + 1}-{range.end}</button>)}</div>
              <div className="grid min-h-0 flex-1 touch-pan-y grid-cols-4 gap-2 overflow-y-auto p-4 min-[420px]:grid-cols-5">{visibleEpisodes.map((episode, offset) => { const index = (visibleRange?.start ?? 0) + offset; return <button key={`${episode.ep}-${episode.url}`} type="button" onClick={() => { selectEpisode(index); setEpisodeDrawerOpen(false); }} aria-current={selectedIndex === index ? "true" : undefined} className={`min-h-12 rounded-xl px-2 text-sm font-semibold ${selectedIndex === index ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" : "bg-slate-900 text-slate-400"}`}>{episode.ep}</button>; })}</div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        {(playerError || detailError) && (
          <p
            role="alert"
            className="border-t border-rose-900/60 bg-rose-950/50 px-5 py-3 text-sm text-rose-300"
          >
            {t(playerError || detailError || "")}
          </p>
        )}
      </section>
    </div>
  );
}
