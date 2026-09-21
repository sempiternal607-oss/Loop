'use client';

import { useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/components/ui/Toast';

// Extend Window interface for YouTube IFrame API
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  loadVideoById: (args: { videoId: string; startSeconds?: number; suggestedQuality?: string }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

export function YouTubePlayer() {
  const {
    currentSong,
    isPlaying,
    volume,
    repeatMode,
    sponsorBlockEnabled,
    activeSegments,
    _seekTarget,
    _clearSeekTarget,
    _setProgress,
    _setDuration,
    _setIsPlaying,
    _handleSongEnded,
    next,
    prev,
    togglePlay,
    pause,
    resume,
  } = usePlayer();

  const { showToast } = useToast();

  const playerRef = useRef<YTPlayerInstance | null>(null);
  const isReadyRef = useRef<boolean>(false);
  const skippedSegmentsRef = useRef<Set<string>>(new Set());
  const lastTrackIdRef = useRef<string | null>(null);
  const isChangingTrackRef = useRef<boolean>(false);
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  // 1. Load YouTube IFrame API Script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player('loop-yt-iframe', {
        height: '100%',
        width: '100%',
        playerVars: {
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          fs: 0,
        },
        events: {
          onReady: (e) => {
            isReadyRef.current = true;
            e.target.setVolume(volume);
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              isChangingTrackRef.current = false;
              _setIsPlaying(true);
            } else if (e.data === window.YT.PlayerState.PAUSED) {
              // Ignore transient PAUSED state during track loading transition
              if (isChangingTrackRef.current) {
                playerRef.current?.playVideo();
                return;
              }
              _setIsPlaying(false);
            } else if (e.data === window.YT.PlayerState.CUED) {
              // Video cued, start playing immediately
              playerRef.current?.playVideo();
            } else if (e.data === window.YT.PlayerState.ENDED) {
              isChangingTrackRef.current = false;
              if (repeatModeRef.current === 'one') {
                playerRef.current?.seekTo(0, true);
                playerRef.current?.playVideo();
                _setProgress(0);
                _setIsPlaying(true);
              } else {
                _handleSongEnded();
              }
            }
          },
          onError: (e) => {
            console.warn('[YouTube Player] Error occurred:', e.data);
            showToast('Playback error, skipping to next track…');
            setTimeout(() => next(), 1000);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      // Keep player alive for background audio
    };
  }, [_setIsPlaying, _handleSongEnded, next, showToast, volume]);

  // 2. Handle Song Change
  useEffect(() => {
    if (!currentSong || !playerRef.current || !isReadyRef.current) return;

    if (lastTrackIdRef.current !== currentSong.videoId) {
      lastTrackIdRef.current = currentSong.videoId;
      skippedSegmentsRef.current.clear();
      isChangingTrackRef.current = true;

      playerRef.current.loadVideoById({
        videoId: currentSong.videoId,
        suggestedQuality: 'hd720',
      });

      playerRef.current.playVideo();
    }
  }, [currentSong]);

  // 3. Handle Play / Pause
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      console.error(e);
    }
  }, [isPlaying]);

  // 4. Handle Volume
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;
    try {
      playerRef.current.setVolume(volume);
    } catch (e) {
      console.error(e);
    }
  }, [volume]);

  // 5. Handle Seek Request
  useEffect(() => {
    if (_seekTarget !== null && playerRef.current && isReadyRef.current) {
      playerRef.current.seekTo(_seekTarget, true);
      _clearSeekTarget();
    }
  }, [_seekTarget, _clearSeekTarget]);

  // 6. Time Progress & SponsorBlock Watcher Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current || !isReadyRef.current || !isPlaying) return;

      try {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();

        if (typeof currentTime === 'number' && !isNaN(currentTime)) {
          _setProgress(currentTime);

          // SponsorBlock auto-skip detection
          if (sponsorBlockEnabled && activeSegments.length > 0) {
            for (const seg of activeSegments) {
              const segKey = `${seg.start}-${seg.end}`;
              if (!skippedSegmentsRef.current.has(segKey)) {
                // If playback is inside this non-music segment
                if (currentTime >= seg.start && currentTime < seg.end - 0.4) {
                  skippedSegmentsRef.current.add(segKey);
                  playerRef.current.seekTo(seg.end + 0.1, true);
                  _setProgress(seg.end + 0.1);
                  const cleanCategory = seg.category.replace(/_/g, ' ');
                  showToast(`⏩ Skipped ${cleanCategory} (SponsorBlock)`);
                  break;
                }
              }
            }
          }
        }

        if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
          _setDuration(duration);
        }
      } catch (e) {
        // Player state not yet accessible
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, sponsorBlockEnabled, activeSegments, _setProgress, _setDuration, showToast]);

  // Helper to detect PWA mode or mobile device
  const isPWAOrMobile = () => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
      document.referrer.includes('android-app://');
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
    return isStandalone || isMobile;
  };

  // 7. MediaSession API integration for System Notifications & Controls
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentSong) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || 'Loop Music',
      artwork: [
        { src: currentSong.thumbnail, sizes: '96x96', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '256x256', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      // Disallow background playback if phone screen is locked or hidden
      if (document.visibilityState === 'hidden' && isPWAOrMobile()) {
        return;
      }
      resume();
    });
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        playerRef.current?.seekTo(details.seekTime, true);
        _setProgress(details.seekTime);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [currentSong, resume, pause, next, prev, _setProgress]);

  // Sync playbackState with navigator.mediaSession
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // 8. PWA / Mobile Lock Screen Watcher: Stop playback when phone screen is locked
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLockOrHide = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        if (isPWAOrMobile()) {
          try {
            playerRef.current?.pauseVideo();
          } catch (e) {
            console.error(e);
          }
          _setIsPlaying(false);
          pause();
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleLockOrHide);
    window.addEventListener('pagehide', handleLockOrHide);

    return () => {
      document.removeEventListener('visibilitychange', handleLockOrHide);
      window.removeEventListener('pagehide', handleLockOrHide);
    };
  }, [pause, _setIsPlaying]);

  return (
    <div
      id="loop-yt-holder"
      className="fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div id="loop-yt-iframe" />
    </div>
  );
}
