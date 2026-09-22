'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Song, SponsorSegment, LyricsData, RepeatMode, Playlist } from '@/types/music';
import { useToast } from '@/components/ui/Toast';
import {
  smartShuffleService,
  buildShuffleContext,
  recordSkip,
} from '@/lib/shuffle';

interface PlayerContextType {

  currentSong: Song | null;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isPlaylistBounded: boolean;
  activePlaylistId: string | null;
  sponsorBlockEnabled: boolean;
  activeSegments: SponsorSegment[];
  lyrics: LyricsData | null;
  isLyricsLoading: boolean;
  isLyricsOpen: boolean;
  lyricsOffset: number;
  isQueueOpen: boolean;
  isFullScreenPlayerOpen: boolean;
  favorites: Song[];
  history: Song[];

  // Actions
  playSong: (song: Song, newQueue?: Song[], startIndex?: number, options?: { bounded?: boolean; playlistId?: string }) => void;
  playPlaylist: (playlist: Playlist, options?: { shuffle?: boolean; startIndex?: number }) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleFavorite: (song: Song) => void;
  isFavorite: (videoId: string) => boolean;
  addToQueue: (song: Song, playNext?: boolean) => void;
  removeFromQueue: (index: number) => void;
  toggleSponsorBlock: () => void;
  toggleLyrics: () => void;
  openLyrics: () => void;
  closeLyrics: () => void;
  setLyricsOffset: (offset: number) => void;
  adjustLyricsOffset: (delta: number) => void;
  resetLyricsOffset: () => void;
  toggleQueue: () => void;
  openQueue: () => void;
  closeQueue: () => void;
  toggleFullScreen: () => void;
  openFullScreen: () => void;
  closeFullScreen: () => void;

  // Internal audio player sync
  _seekTarget: number | null;
  _clearSeekTarget: () => void;
  _setProgress: (seconds: number) => void;
  _setDuration: (seconds: number) => void;
  _setIsPlaying: (playing: boolean) => void;
  _handleSongEnded: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const STORAGE_KEYS = {
  FAV: 'loop_favorites',
  HIST: 'loop_history',
  VOL: 'loop_volume',
  SB: 'loop_sponsorblock',
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prevVolume, setPrevVolume] = useState<number>(100);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isPlaylistBounded, setIsPlaylistBounded] = useState<boolean>(false);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [sponsorBlockEnabled, setSponsorBlockEnabled] = useState<boolean>(true);
  const [activeSegments, setActiveSegments] = useState<SponsorSegment[]>([]);

  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [lyricsOffset, setLyricsOffsetState] = useState<number>(0);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState<boolean>(false);

  const [favorites, setFavorites] = useState<Song[]>([]);
  const [history, setHistory] = useState<Song[]>([]);

  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  // References to keep callbacks current without re-binding
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;
  const isPlaylistBoundedRef = useRef(isPlaylistBounded);
  isPlaylistBoundedRef.current = isPlaylistBounded;
  const activePlaylistIdRef = useRef(activePlaylistId);
  activePlaylistIdRef.current = activePlaylistId;
  const radioTracksMapRef = useRef<Map<string, Song[]>>(new Map());
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;
  const historyRef = useRef(history);
  historyRef.current = history;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const originalQueueRef = useRef<Song[]>([]);
  const shuffleLockRef = useRef(false);

  // Initialize from LocalStorage
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem(STORAGE_KEYS.FAV);
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      const savedHist = localStorage.getItem(STORAGE_KEYS.HIST);
      if (savedHist) setHistory(JSON.parse(savedHist));

      const savedVol = localStorage.getItem(STORAGE_KEYS.VOL);
      if (savedVol) setVolumeState(Number(savedVol));

      const savedSb = localStorage.getItem(STORAGE_KEYS.SB);
      if (savedSb !== null) setSponsorBlockEnabled(JSON.parse(savedSb));
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }
  }, []);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    setVolumeState(clamped);
    if (clamped > 0) setIsMuted(false);
    localStorage.setItem(STORAGE_KEYS.VOL, String(clamped));
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolumeState(prevVolume || 100);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolumeState(0);
    }
  }, [isMuted, prevVolume, volume]);

  const toggleSponsorBlock = useCallback(() => {
    setSponsorBlockEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.SB, JSON.stringify(next));
      showToast(next ? 'SponsorBlock enabled' : 'SponsorBlock disabled');
      return next;
    });
  }, [showToast]);

  const toggleFavorite = useCallback((song: Song) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.videoId === song.videoId);
      let updated: Song[];
      if (exists) {
        updated = prev.filter((s) => s.videoId !== song.videoId);
        showToast('Removed from Favorites');
      } else {
        updated = [song, ...prev];
        showToast('Added to Favorites');
      }
      localStorage.setItem(STORAGE_KEYS.FAV, JSON.stringify(updated));
      return updated;
    });
  }, [showToast]);

  const isFavorite = useCallback(
    (videoId: string) => favorites.some((s) => s.videoId === videoId),
    [favorites]
  );

  const pushHistory = useCallback((song: Song) => {
    setHistory((prev) => {
      const filtered = prev.filter((s) => s.videoId !== song.videoId);
      const updated = [song, ...filtered].slice(0, 50); // limit to 50
      localStorage.setItem(STORAGE_KEYS.HIST, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Fetch SponsorBlock segments
  const fetchSponsorSegments = useCallback(async (videoId: string) => {
    try {
      const res = await fetch(`/api/sponsorblock?videoId=${videoId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSegments(data.segments || []);
      } else {
        setActiveSegments([]);
      }
    } catch {
      setActiveSegments([]);
    }
  }, []);

  // Lyrics Offset persistence
  const loadLyricsOffset = useCallback((videoId: string) => {
    try {
      const saved = localStorage.getItem(`loop_lyric_offset_${videoId}`);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) {
          setLyricsOffsetState(parsed);
          return;
        }
      }
    } catch {}
    setLyricsOffsetState(0);
  }, []);

  // Fetch Lyrics
  const fetchLyrics = useCallback(async (song: Song) => {
    setIsLyricsLoading(true);
    setLyrics(null);
    loadLyricsOffset(song.videoId);
    try {
      const query = new URLSearchParams({
        title: song.title,
        artist: song.artist,
        duration: String(song.duration || 0),
      });
      const res = await fetch(`/api/lyrics?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLyrics(data);
      }
    } catch (e) {
      console.error('Failed to load lyrics', e);
    } finally {
      setIsLyricsLoading(false);
    }
  }, [loadLyricsOffset]);

  // Fetch Auto Radio Queue
  const fetchAutoRadioQueue = useCallback(async (song: Song): Promise<Song[]> => {
    try {
      const res = await fetch(`/api/next?videoId=${song.videoId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.queue) && data.queue.length > 0) {
          const songs = data.queue as Song[];
          radioTracksMapRef.current.set(song.videoId, songs);
          setQueue((prevQueue) => {
            const existingIds = new Set(prevQueue.map((s) => s.videoId));
            const newSongs = songs.filter((s: Song) => !existingIds.has(s.videoId));
            return [...prevQueue, ...newSongs];
          });
          return songs;
        }
      }
    } catch (e) {
      console.error('Failed to fetch radio queue', e);
    }
    return [];
  }, []);

  const playSong = useCallback(
    (song: Song, newQueue?: Song[], startIndex?: number, options?: { bounded?: boolean; playlistId?: string }) => {
      // If previous song was skipped early (<25s and >1s), record skip
      const prevSong = currentSongRef.current;
      const prevProg = progressRef.current;
      if (prevSong && prevSong.videoId !== song.videoId && prevProg > 1 && prevProg < 25) {
        recordSkip(prevSong.videoId, prevSong.artist, prevProg);
      }

      if (options?.bounded) {
        setIsPlaylistBounded(true);
        isPlaylistBoundedRef.current = true;
        setActivePlaylistId(options.playlistId || null);
        activePlaylistIdRef.current = options.playlistId || null;
      } else {
        setIsPlaylistBounded(false);
        isPlaylistBoundedRef.current = false;
        setActivePlaylistId(null);
        activePlaylistIdRef.current = null;
      }

      setCurrentSong(song);
      setProgress(0);
      progressRef.current = 0;
      setDuration(song.duration || 0);
      setIsPlaying(true);
      pushHistory(song);

      const targetQueue = newQueue && newQueue.length > 0 ? newQueue : [song];
      const idx = startIndex !== undefined ? startIndex : targetQueue.findIndex((s) => s.videoId === song.videoId);
      const safeIdx = idx >= 0 ? idx : 0;

      // If user specifically clicked a song inside an already active queue, keep queue position
      if (startIndex !== undefined && startIndex > 0) {
        setQueue(targetQueue);
        setCurrentIndex(safeIdx);
      } else if (isShuffleRef.current && targetQueue.length > 1) {
        // Save original un-shuffled queue
        originalQueueRef.current = [...targetQueue];

        // Head contains the selected song
        const head = [song];
        const otherSongs = targetQueue.filter((s) => s.videoId !== song.videoId);

        // Immediate set so Playback Queue is responsive
        setQueue([song, ...otherSongs]);
        setCurrentIndex(0);

        const session = smartShuffleService.initializeSession(song, targetQueue);
        const context = buildShuffleContext({
          currentSong: song,
          session,
          history: historyRef.current,
          favorites: favoritesRef.current,
          currentQueue: targetQueue,
        });

        // Smart-shuffle upcoming queue so Playback Queue shows optimal contextual order
        smartShuffleService
          .generateSmartQueueFromCandidates(context, otherSongs, fetchAutoRadioQueue)
          .then((smartUpcoming) => {
            if (isShuffleRef.current && currentSongRef.current?.videoId === song.videoId && smartUpcoming.length > 0) {
              setQueue([song, ...smartUpcoming]);
              setCurrentIndex(0);
            }
          });
      } else {
        setQueue(targetQueue);
        setCurrentIndex(safeIdx);
      }

      // Always fetch similar radio songs in background for auto-continue & recommendations (only if not bounded)
      if (!options?.bounded) {
        fetchAutoRadioQueue(song);
      }

      // Fetch auxiliary data
      fetchSponsorSegments(song.videoId);
      fetchLyrics(song);
    },
    [pushHistory, fetchAutoRadioQueue, fetchSponsorSegments, fetchLyrics]
  );

  const playPlaylist = useCallback(
    (playlist: Playlist, options?: { shuffle?: boolean; startIndex?: number }) => {
      if (!playlist.songs || playlist.songs.length === 0) {
        showToast(`Playlist "${playlist.title}" is empty`);
        return;
      }

      setIsPlaylistBounded(true);
      isPlaylistBoundedRef.current = true;
      setActivePlaylistId(playlist.id);
      activePlaylistIdRef.current = playlist.id;

      const shouldShuffle = options?.shuffle ?? false;

      if (shouldShuffle) {
        const allSongs = [...playlist.songs];
        const chosenIndex =
          options?.startIndex !== undefined && options.startIndex >= 0 && options.startIndex < allSongs.length
            ? options.startIndex
            : Math.floor(Math.random() * allSongs.length);
        const startSong = allSongs[chosenIndex];
        const otherSongs = allSongs.filter((_, idx) => idx !== chosenIndex);

        // Fisher-Yates shuffle exclusively within playlist songs
        for (let i = otherSongs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
        }

        const shuffledQueue = [startSong, ...otherSongs];
        originalQueueRef.current = [...playlist.songs];

        setQueue(shuffledQueue);
        queueRef.current = shuffledQueue;
        setCurrentIndex(0);
        currentIndexRef.current = 0;
        setIsShuffle(true);
        isShuffleRef.current = true;

        setCurrentSong(startSong);
        currentSongRef.current = startSong;
        setProgress(0);
        progressRef.current = 0;
        setDuration(startSong.duration || 0);
        setIsPlaying(true);
        pushHistory(startSong);
        fetchSponsorSegments(startSong.videoId);
        fetchLyrics(startSong);
        showToast(`Shuffling "${playlist.title}" (${playlist.songs.length} tracks)`);
      } else {
        const startIdx =
          options?.startIndex !== undefined && options.startIndex >= 0 && options.startIndex < playlist.songs.length
            ? options.startIndex
            : 0;
        const startSong = playlist.songs[startIdx];
        originalQueueRef.current = [...playlist.songs];

        setQueue([...playlist.songs]);
        queueRef.current = [...playlist.songs];
        setCurrentIndex(startIdx);
        currentIndexRef.current = startIdx;
        setIsShuffle(false);
        isShuffleRef.current = false;

        setCurrentSong(startSong);
        currentSongRef.current = startSong;
        setProgress(0);
        progressRef.current = 0;
        setDuration(startSong.duration || 0);
        setIsPlaying(true);
        pushHistory(startSong);
        fetchSponsorSegments(startSong.videoId);
        fetchLyrics(startSong);
        showToast(`Playing "${playlist.title}"`);
      }
    },
    [showToast, pushHistory, fetchSponsorSegments, fetchLyrics]
  );

  const pause = useCallback(() => setIsPlaying(false), []);
  const resume = useCallback(() => setIsPlaying(true), []);
  const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);

  const seek = useCallback((seconds: number) => {
    progressRef.current = seconds;
    setSeekTarget(seconds);
    setProgress(seconds);
  }, []);

  const next = useCallback(() => {
    const q = queueRef.current;
    const curIdx = currentIndexRef.current;
    const rMode = repeatModeRef.current;
    const curSong = currentSongRef.current;
    const curProg = progressRef.current;

    if (q.length === 0 && !curSong) return;

    // Record skip penalty if song was skipped early (< 25s)
    if (curSong && curProg > 1 && curProg < 25) {
      recordSkip(curSong.videoId, curSong.artist, curProg);
    }

    // Helper to start playing a specific song and update queue index
    const playAtIndex = (targetIdx: number, targetQueue: Song[]) => {
      const nextSong = targetQueue[targetIdx];
      if (!nextSong) return;

      setCurrentIndex(targetIdx);
      setCurrentSong(nextSong);
      setProgress(0);
      progressRef.current = 0;
      setDuration(nextSong.duration || 0);
      setIsPlaying(true);
      pushHistory(nextSong);
      fetchSponsorSegments(nextSong.videoId);
      fetchLyrics(nextSong);

      // Pre-load more similar recommendations if approaching end of queue (only for unbounded queues)
      if (targetIdx >= targetQueue.length - 4 && !isPlaylistBoundedRef.current) {
        if (isShuffleRef.current) {
          const session = smartShuffleService.getSession() || smartShuffleService.initializeSession(nextSong, targetQueue);
          const context = buildShuffleContext({
            currentSong: nextSong,
            session,
            history: historyRef.current,
            favorites: favoritesRef.current,
            currentQueue: targetQueue,
          });
          smartShuffleService.generateSmartUpcoming(context, fetchAutoRadioQueue).then((moreSongs) => {
            if (moreSongs.length > 0) {
              setQueue((prevQ) => {
                const existingIds = new Set(prevQ.map((s) => s.videoId));
                const fresh = moreSongs.filter((s) => !existingIds.has(s.videoId));
                return [...prevQ, ...fresh];
              });
            }
          });
        } else {
          fetchAutoRadioQueue(nextSong);
        }
      }
    };

    // The next song to play is ALWAYS the next song in the Playback Queue!
    const nextIdx = curIdx + 1;

    if (nextIdx < q.length) {
      // Play the next song directly from the Playback Queue
      playAtIndex(nextIdx, q);
    } else if (rMode === 'all') {
      playAtIndex(0, q);
    } else if (isPlaylistBoundedRef.current) {
      // Reached the end of the bounded playlist! Stop playback cleanly without radio injection
      setIsPlaying(false);
      showToast('Finished playlist');
    } else {
      // Reached the end of the Playback Queue: fetch more smart similar songs and append to queue
      if (curSong) {
        if (isShuffleRef.current) {
          const session = smartShuffleService.getSession() || smartShuffleService.initializeSession(curSong, q);
          const context = buildShuffleContext({
            currentSong: curSong,
            session,
            history: historyRef.current,
            favorites: favoritesRef.current,
            currentQueue: q,
          });
          smartShuffleService.generateSmartUpcoming(context, fetchAutoRadioQueue).then((moreSongs) => {
            if (moreSongs.length > 0) {
              const playedIds = new Set(q.map((s) => s.videoId));
              const fresh = moreSongs.filter((s) => !playedIds.has(s.videoId));
              if (fresh.length > 0) {
                const updatedQ = [...q, ...fresh];
                setQueue(updatedQ);
                playAtIndex(q.length, updatedQ);
                return;
              }
            }
            setIsPlaying(false);
          });
        } else {
          fetchAutoRadioQueue(curSong).then((moreSongs) => {
            if (moreSongs.length > 0) {
              const playedIds = new Set(q.map((s) => s.videoId));
              const fresh = moreSongs.filter((s) => !playedIds.has(s.videoId));
              if (fresh.length > 0) {
                const updatedQ = [...q, ...fresh];
                setQueue(updatedQ);
                playAtIndex(q.length, updatedQ);
                return;
              }
            }
            setIsPlaying(false);
          });
        }
      } else {
        setIsPlaying(false);
      }
    }
  }, [pushHistory, fetchSponsorSegments, fetchLyrics, fetchAutoRadioQueue, showToast]);

  const prev = useCallback(() => {
    if (progressRef.current > 3) {
      seek(0);
      return;
    }

    const q = queueRef.current;
    const curIdx = currentIndexRef.current;

    if (curIdx > 0 && curIdx - 1 < q.length) {
      const prevSong = q[curIdx - 1];
      setCurrentIndex(curIdx - 1);
      setCurrentSong(prevSong);
      setProgress(0);
      progressRef.current = 0;
      setDuration(prevSong.duration || 0);
      setIsPlaying(true);
      pushHistory(prevSong);
      fetchSponsorSegments(prevSong.videoId);
      fetchLyrics(prevSong);
    } else {
      seek(0);
    }
  }, [pushHistory, seek, fetchSponsorSegments, fetchLyrics]);

  const addToQueue = useCallback((song: Song, playNext = false) => {
    setQueue((prevQ) => {
      const curIdx = currentIndexRef.current;
      const copy = [...prevQ];
      if (playNext && curIdx >= 0) {
        copy.splice(curIdx + 1, 0, { ...song, _userAdded: true });
      } else {
        copy.push({ ...song, _userAdded: true });
      }
      return copy;
    });
    showToast(playNext ? 'Playing next' : 'Added to queue');
  }, [showToast]);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prevQ) => {
      if (index === currentIndexRef.current) return prevQ;
      const copy = [...prevQ];
      copy.splice(index, 1);
      return copy;
    });
    showToast('Removed from queue');
  }, [showToast]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      const nextMode: RepeatMode = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      showToast(nextMode === 'one' ? 'Repeat track' : nextMode === 'all' ? 'Repeat queue' : 'Repeat off');
      return nextMode;
    });
  }, [showToast]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const nextVal = !prev;
      showToast(nextVal ? 'Shuffle on' : 'Shuffle off');
      const curSong = currentSongRef.current;
      const curQ = queueRef.current;
      const curIdx = currentIndexRef.current;

      if (nextVal) {
        // Save original un-shuffled queue snapshot
        originalQueueRef.current = [...curQ];

        if (curSong) {
          const head = curQ.slice(0, curIdx + 1);
          const upcoming = curQ.slice(curIdx + 1);

          if (isPlaylistBoundedRef.current) {
            // Strictly Fisher-Yates shuffle the remaining playlist songs
            const shuffledUpcoming = [...upcoming];
            for (let i = shuffledUpcoming.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledUpcoming[i], shuffledUpcoming[j]] = [shuffledUpcoming[j], shuffledUpcoming[i]];
            }
            setQueue([...head, ...shuffledUpcoming]);
          } else {
            const session = smartShuffleService.initializeSession(curSong, curQ);
            const context = buildShuffleContext({
              currentSong: curSong,
              session,
              history: historyRef.current,
              favorites: favoritesRef.current,
              currentQueue: curQ,
            });

            // Smart-shuffle upcoming queue so Playback Queue is immediately optimized
            smartShuffleService
              .generateSmartQueueFromCandidates(context, upcoming, fetchAutoRadioQueue)
              .then((smartUpcoming) => {
                if (smartUpcoming.length > 0 && isShuffleRef.current) {
                  setQueue([...head, ...smartUpcoming]);
                }
              });
          }
        }
      } else {
        // Shuffle turned OFF: restore original queue order
        smartShuffleService.clearSession();
        if (originalQueueRef.current.length > 0 && curSong) {
          const restored = [...originalQueueRef.current];
          const existIdx = restored.findIndex((s) => s.videoId === curSong.videoId);
          if (existIdx !== -1) {
            setQueue(restored);
            setCurrentIndex(existIdx);
          }
        }
      }
      return nextVal;
    });
  }, [showToast, fetchAutoRadioQueue]);

  // Drawer toggles
  const toggleLyrics = useCallback(() => setIsLyricsOpen((p) => !p), []);
  const openLyrics = useCallback(() => setIsLyricsOpen(true), []);
  const closeLyrics = useCallback(() => setIsLyricsOpen(false), []);

  const setLyricsOffset = useCallback((offset: number) => {
    const rounded = Math.round(offset * 10) / 10;
    const clamped = Math.max(-60, Math.min(60, rounded));
    setLyricsOffsetState(clamped);
    if (currentSongRef.current?.videoId) {
      try {
        if (clamped === 0) {
          localStorage.removeItem(`loop_lyric_offset_${currentSongRef.current.videoId}`);
        } else {
          localStorage.setItem(`loop_lyric_offset_${currentSongRef.current.videoId}`, String(clamped));
        }
      } catch {}
    }
  }, []);

  const adjustLyricsOffset = useCallback((delta: number) => {
    setLyricsOffsetState((prev) => {
      const rounded = Math.round((prev + delta) * 10) / 10;
      const clamped = Math.max(-60, Math.min(60, rounded));
      if (currentSongRef.current?.videoId) {
        try {
          if (clamped === 0) {
            localStorage.removeItem(`loop_lyric_offset_${currentSongRef.current.videoId}`);
          } else {
            localStorage.setItem(`loop_lyric_offset_${currentSongRef.current.videoId}`, String(clamped));
          }
        } catch {}
      }
      return clamped;
    });
  }, []);

  const resetLyricsOffset = useCallback(() => {
    setLyricsOffset(0);
  }, [setLyricsOffset]);

  const toggleQueue = useCallback(() => setIsQueueOpen((p) => !p), []);
  const openQueue = useCallback(() => setIsQueueOpen(true), []);
  const closeQueue = useCallback(() => setIsQueueOpen(false), []);

  const toggleFullScreen = useCallback(() => setIsFullScreenPlayerOpen((p) => !p), []);
  const openFullScreen = useCallback(() => setIsFullScreenPlayerOpen(true), []);
  const closeFullScreen = useCallback(() => setIsFullScreenPlayerOpen(false), []);

  // Internal helper methods for YouTube player
  const _clearSeekTarget = useCallback(() => setSeekTarget(null), []);
  const _setProgress = useCallback((s: number) => {
    progressRef.current = s;
    setProgress(s);
  }, []);
  const _setDuration = useCallback((d: number) => setDuration(d), []);
  const _setIsPlaying = useCallback((p: boolean) => setIsPlaying(p), []);
  const _handleSongEnded = useCallback(() => {
    if (repeatModeRef.current === 'one') {
      seek(0);
      setIsPlaying(true);
      return;
    }
    // Completed natural listen - don't penalize as a skip
    progressRef.current = 9999;
    next();
  }, [seek, next]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        queue,
        currentIndex,
        isPlaying,
        progress,
        duration,
        volume: isMuted ? 0 : volume,
        isMuted,
        repeatMode,
        isShuffle,
        isPlaylistBounded,
        activePlaylistId,
        sponsorBlockEnabled,
        activeSegments,
        lyrics,
        isLyricsLoading,
        isLyricsOpen,
        lyricsOffset,
        isQueueOpen,
        isFullScreenPlayerOpen,
        favorites,
        history,

        playSong,
        playPlaylist,
        pause,
        resume,
        togglePlay,
        next,
        prev,
        seek,
        setVolume,
        toggleMute,
        toggleRepeat,
        toggleShuffle,
        toggleFavorite,
        isFavorite,
        addToQueue,
        removeFromQueue,
        toggleSponsorBlock,
        toggleLyrics,
        openLyrics,
        closeLyrics,
        setLyricsOffset,
        adjustLyricsOffset,
        resetLyricsOffset,
        toggleQueue,
        openQueue,
        closeQueue,
        toggleFullScreen,
        openFullScreen,
        closeFullScreen,

        _seekTarget: seekTarget,
        _clearSeekTarget,
        _setProgress,
        _setDuration,
        _setIsPlaying,
        _handleSongEnded,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
