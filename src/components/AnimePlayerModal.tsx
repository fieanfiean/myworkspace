import { useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { ListVideo, Play, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Anime } from "@/types/anime";

interface Props {
  anime: Anime;
  onClose: () => void;
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

export function AnimePlayerModal({ anime, onClose }: Props) {
  const { t } = useTranslation();
  const episodes = useMemo(
    () =>
      anime.episodes
        .map((item) => ({ ...item, url: secureStreamUrl(item.url) }))
        .filter(
          (item): item is { ep: string; url: string } => item.url !== null,
        ),
    [anime.episodes],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const selectedEpisode = episodes[selectedIndex];

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedEpisode) return;
    let cancelled = false;
    let hls: Hls | null = null;
    queueMicrotask(() => {
      if (!cancelled) {
        setPlayerError(null);
        setPlayerLoading(true);
      }
    });
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = selectedEpisode.url;
      video.load();
      return () => {
        cancelled = true;
        video.removeAttribute("src");
        video.load();
      };
    }
    void import("hls.js")
      .then(({ default: HlsPlayer }) => {
        if (cancelled) return;
        if (!HlsPlayer.isSupported()) {
          setPlayerError("anime.player.unsupported");
          setPlayerLoading(false);
          return;
        }
        hls = new HlsPlayer({ enableWorker: true });
        hls.loadSource(selectedEpisode.url);
        hls.attachMedia(video);
        hls.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
          setPlayerLoading(false);
          void video.play().catch(() => undefined);
        });
        hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
          if (!data.fatal || !hls) return;
          if (data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === HlsPlayer.ErrorTypes.MEDIA_ERROR)
            hls.recoverMediaError();
          else setPlayerError("anime.player.unavailable");
          setPlayerLoading(false);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPlayerError("anime.player.playerLoadFailed");
          setPlayerLoading(false);
        }
      });
    return () => {
      cancelled = true;
      hls?.destroy();
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
              {selectedEpisode
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
          <div className="relative flex min-h-[240px] items-center justify-center bg-black lg:min-h-[520px]">
            {selectedEpisode ? (
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
                {t("anime.player.noSecureEpisodes")}
              </p>
            )}
            {selectedEpisode && playerLoading && (
              <p
                className="pointer-events-none absolute rounded-lg bg-black/70 px-4 py-2 text-sm text-slate-300"
                role="status"
              >
                {t("anime.player.loading")}
              </p>
            )}
          </div>
          <aside className="min-h-0 border-t border-slate-800 bg-[#101522] lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              <ListVideo size={16} />
              {t("anime.player.selectEpisode")}
              <span className="ml-auto text-slate-600">
                {t("anime.player.episodeCount", { count: episodes.length })}
              </span>
            </div>
            <div className="flex max-h-52 gap-2 overflow-auto p-3 lg:max-h-[520px] lg:flex-col">
              {episodes.map((episode, index) => (
                <button
                  key={`${episode.ep}-${episode.url}`}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`min-h-11 shrink-0 rounded-lg px-3 py-2 text-left text-sm transition ${selectedIndex === index ? "bg-indigo-600 font-semibold text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                >
                  <span className="block max-w-40 truncate lg:max-w-none">
                    {episode.ep}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
        {playerError && (
          <p
            role="alert"
            className="border-t border-rose-900/60 bg-rose-950/50 px-5 py-3 text-sm text-rose-300"
          >
            {t(playerError)}
          </p>
        )}
      </section>
    </div>
  );
}
