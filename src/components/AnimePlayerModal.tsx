import { useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { ListVideo, Play, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Anime } from "@/types/anime";

interface Props {
  anime: Anime;
  onClose: () => void;
}

interface Episode {
  ep: string;
  url: string;
}

interface AnimeDetailResponse {
  external_id: string;
  title: string;
  description: string | null;
  episodes: Episode[];
}

const EPISODES_PER_RANGE = 25;

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

export function AnimePlayerModal({ anime, onClose }: Props) {
  const { t } = useTranslation();

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedRange, setSelectedRange] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rangeTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedEpisode = episodes[selectedIndex];
  const episodeRanges = useMemo(() => Array.from(
    { length: Math.ceil(episodes.length / EPISODES_PER_RANGE) },
    (_, index) => ({ start: index * EPISODES_PER_RANGE, end: Math.min((index + 1) * EPISODES_PER_RANGE, episodes.length) }),
  ), [episodes.length]);
  const visibleRange = episodeRanges[selectedRange];
  const visibleEpisodes = visibleRange ? episodes.slice(visibleRange.start, visibleRange.end) : [];

  // 1. 从 Cloudflare R2 拉取完整 JSON 详情
  useEffect(() => {
    const id = anime.external_id || anime.id;
    if (!id) return;

    let isMounted = true;

    queueMicrotask(() => {
      if (isMounted) {
        setLoadingDetail(true);
        setDetailError(null);
        setSelectedIndex(0); // 重置剧集选中索引
        setSelectedRange(0);
      }
    });

    const r2PublicUrl = (import.meta.env.VITE_R2_PUBLIC_URL || "").replace(/\/+$/, "");

    fetch(`${r2PublicUrl}/anime-details/${id}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch anime details from R2");
        return res.json() as Promise<AnimeDetailResponse>;
      })
      .then((data) => {
        if (!isMounted) return;
        const safeEpisodes = (data.episodes || [])
          .map((item) => ({ ...item, url: secureStreamUrl(item.url) }))
          .filter((item): item is Episode => item.url !== null);

        setEpisodes(safeEpisodes);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Fetch R2 anime detail error:", err);
        setDetailError("anime.player.loadFailed");
      })
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [anime.external_id, anime.id]);

  useEffect(() => {
    rangeTabRefs.current[selectedRange]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedRange]);

  // 2. 键盘 Esc 关闭与页面 Scroll 锁定
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  // 3. HLS 播放控制逻辑 (解决竞态销毁与 Safari 自动播放问题)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedEpisode) return;

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
          setPlayerLoading(false);
          void video.play().catch(() => undefined);
        });

        hlsInstance.on(HlsPlayer.Events.ERROR, (_event, data) => {
          if (!data.fatal || !hlsInstance || !isMounted) return;
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
  }, [selectedEpisode]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="anime-player-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0B0E17] shadow-2xl shadow-black/70">
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
          <button
            type="button"
            onClick={onClose}
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
                onCanPlay={() => setPlayerLoading(false)}
                onError={() => {
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
          </div>

          {/* 右侧选集列表 */}
          <aside className="flex min-h-0 flex-col border-t border-slate-800 bg-[#101522] lg:border-l lg:border-t-0">
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              <ListVideo size={16} />
              {t("anime.player.selectEpisode")}
              <span className="ml-auto text-slate-600">
                {t("anime.player.episodeCount", { count: episodes.length })}
              </span>
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
                    onClick={() => setSelectedIndex(index)}
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
