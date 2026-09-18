import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { markEpisodeWatched, upsertProgress } from '@/services/watchProgressService';
import type { Anime } from '@/types/anime';

interface WatchProgressInput {
  anime: Anime;
  episodeIndex: number;
  episodeLabel: string;
  positionSeconds: number;
  durationSeconds: number;
}

interface LocalPlaybackProgress {
  anime: Anime;
  episode: string;
  episodeIndex: number;
  currentTime: number;
  updatedAt: string;
}

const LOCAL_WRITE_INTERVAL_MS = 5_000;
const REMOTE_WRITE_INTERVAL_MS = 20_000;

export function useWatchProgress(input: WatchProgressInput) {
  const { user } = useAuth();
  const latestRef = useRef(input);
  const userRef = useRef(user);
  const lastLocalWriteRef = useRef(0);
  const lastRemoteWriteRef = useRef(0);
  const remoteWriteRef = useRef<Promise<void> | null>(null);
  const watchedMarkerRef = useRef<string | null>(null);

  const writeLocal = useCallback(() => {
    const current = latestRef.current;
    const animeId = current.anime.external_id || current.anime.id;
    if (!animeId || !current.episodeLabel) return;
    const progress: LocalPlaybackProgress = {
      anime: current.anime,
      episode: current.episodeLabel,
      episodeIndex: Math.max(0, current.episodeIndex),
      currentTime: Math.max(0, current.positionSeconds),
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`anime_progress_${animeId}`, JSON.stringify(progress));
      lastLocalWriteRef.current = Date.now();
    } catch {
      // Playback remains available when local storage is disabled or full.
    }
  }, []);

  const writeRemote = useCallback(async () => {
    const current = latestRef.current;
    if (!userRef.current || !current.anime.external_id || !current.episodeLabel) return;
    await upsertProgress({
      animeExternalId: current.anime.external_id,
      animeTitle: current.anime.title,
      animeCoverUrl: current.anime.cover_url,
      episodeIndex: Math.max(0, current.episodeIndex),
      episodeLabel: current.episodeLabel,
      positionSeconds: Math.max(0, current.positionSeconds),
      durationSeconds: Number.isFinite(current.durationSeconds) ? Math.max(0, current.durationSeconds) : undefined,
    });
    lastRemoteWriteRef.current = Date.now();

  }, []);

  const enqueueRemoteWrite = useCallback((force: boolean) => {
    if (!userRef.current) return Promise.resolve();
    if (!force && Date.now() - lastRemoteWriteRef.current < REMOTE_WRITE_INTERVAL_MS) return Promise.resolve();
    if (remoteWriteRef.current) return remoteWriteRef.current;
    const operation = writeRemote().catch(() => {
      // Local progress remains the fallback when the network is unavailable.
    }).finally(() => {
      remoteWriteRef.current = null;
    });
    remoteWriteRef.current = operation;
    return operation;
  }, [writeRemote]);

  const flush = useCallback(async () => {
    writeLocal();
    await enqueueRemoteWrite(true);
  }, [enqueueRemoteWrite, writeLocal]);

  useEffect(() => {
    latestRef.current = input;
    userRef.current = user;
  }, [input, user]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastLocalWriteRef.current >= LOCAL_WRITE_INTERVAL_MS) writeLocal();
    void enqueueRemoteWrite(false);
  }, [input.anime, input.durationSeconds, input.episodeIndex, input.episodeLabel, input.positionSeconds, enqueueRemoteWrite, writeLocal]);

  useEffect(() => {
    const ratio = input.durationSeconds > 0 ? input.positionSeconds / input.durationSeconds : 0;
    const marker = `${input.anime.external_id}:${input.episodeIndex}`;
    if (!user || !input.anime.external_id || ratio < 0.9 || watchedMarkerRef.current === marker) return;
    watchedMarkerRef.current = marker;
    void markEpisodeWatched(input.anime.external_id, input.episodeIndex).catch(() => {
      watchedMarkerRef.current = null;
    });
  }, [input.anime.external_id, input.durationSeconds, input.episodeIndex, input.positionSeconds, user]);

  useEffect(() => () => {
    writeLocal();
    void enqueueRemoteWrite(true);
  }, [enqueueRemoteWrite, writeLocal]);

  return { flush } as const;
}
