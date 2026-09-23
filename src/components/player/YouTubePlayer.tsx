'use client';

import { useEffect, useRef, useCallback } from 'react';
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
    pause,
    resume,
  } = usePlayer();

  const { showToast } = useToast();

  const playerRef = useRef<YTPlayerInstance | null>(null);
  const isReadyRef = useRef<boolean>(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const skippedSegmentsRef = useRef<Set<string>>(new Set());
  const lastTrackIdRef = useRef<string | null>(null);
  const isChangingTrackRef = useRef<boolean>(false);
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  const audioAnchorRef = useRef<HTMLAudioElement | null>(null);

  const syncAudioAnchor = useCallback((play: boolean) => {
    if (!audioAnchorRef.current) return;
    if (play) {
      audioAnchorRef.current.play().catch(() => {});
    } else {
      audioAnchorRef.current.pause();
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (isChangingTrackRef.current) return;
    isChangingTrackRef.current = true;

    if (repeatModeRef.current === 'one') {
      playerRef.current?.seekTo(0, true);
      playerRef.current?.playVideo();
      _setProgress(0);
      _setIsPlaying(true);
      setTimeout(() => {
        isChangingTrackRef.current = false;
      }, 500);
    } else {
      _handleSongEnded();
    }
  }, [_handleSongEnded, _setProgress, _setIsPlaying]);

  const handleEndedRef = useRef(handleEnded);
  handleEndedRef.current = handleEnded;

  const nextRef = useRef(next);
  nextRef.current = next;

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
          autoplay: 1,
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
              syncAudioAnchor(true);
            } else if (e.data === window.YT.PlayerState.PAUSED) {
              const curTime = playerRef.current?.getCurrentTime() || 0;
              const dur = playerRef.current?.getDuration() || 0;

              // If paused near the end of song (common on mobile background play), treat as track ended!
              if (dur > 5 && dur - curTime <= 1.5) {
                handleEndedRef.current();
                return;
              }

              // Ignore transient PAUSED state during track loading transition
              if (isChangingTrackRef.current) {
                playerRef.current?.playVideo();
                syncAudioAnchor(true);
                return;
              }

              // If paused unexpectedly by browser background throttling while user intended to play
              if (document.visibilityState === 'hidden' && isPlayingRef.current) {
                try {
                  playerRef.current?.playVideo();
                  syncAudioAnchor(true);
                } catch (err) {
                  console.warn('[YouTube Player] Background auto-resume failed', err);
                }
                return;
              }

              _setIsPlaying(false);
              syncAudioAnchor(false);
            } else if (e.data === window.YT.PlayerState.CUED) {
              // Video cued, start playing immediately
              playerRef.current?.playVideo();
              syncAudioAnchor(true);
            } else if (e.data === window.YT.PlayerState.ENDED) {
              handleEndedRef.current();
            }
          },
          onError: (e) => {
            console.warn('[YouTube Player] Error occurred:', e.data);
            showToast('Playback error, skipping to next track…');
            isChangingTrackRef.current = true;
            nextRef.current();
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
  }, [_setIsPlaying, volume, showToast, syncAudioAnchor]);

  // 2. Handle Song Change
  useEffect(() => {
    if (!currentSong || !playerRef.current || !isReadyRef.current) return;

    if (lastTrackIdRef.current !== currentSong.videoId) {
      lastTrackIdRef.current = currentSong.videoId;
      skippedSegmentsRef.current.clear();
      isChangingTrackRef.current = true;

      // Ensure mediaSession stays in 'playing' state during transition
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }

      playerRef.current.loadVideoById({
        videoId: currentSong.videoId,
        suggestedQuality: 'small', // Lightest video stream for instant audio playback on mobile
      });

      playerRef.current.playVideo();
      syncAudioAnchor(true);
    }
  }, [currentSong, syncAudioAnchor]);

  // 3. Handle Play / Pause
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
        syncAudioAnchor(true);
      } else {
        playerRef.current.pauseVideo();
        syncAudioAnchor(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [isPlaying, syncAudioAnchor]);

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

  // 6. Time Progress, Watchdog & SponsorBlock Watcher Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current || !isReadyRef.current || !isPlaying) return;

      try {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();

        if (typeof currentTime === 'number' && !isNaN(currentTime)) {
          _setProgress(currentTime);

          // Watchdog: If playback is within 0.5s of song end, trigger track end (prevents stalling on locked screen)
          if (
            typeof duration === 'number' &&
            duration > 5 &&
            currentTime >= duration - 0.5 &&
            !isChangingTrackRef.current
          ) {
            handleEndedRef.current();
            return;
          }

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

          // Update MediaSession with actual song duration and current playback position
          if (
            'mediaSession' in navigator &&
            'setPositionState' in navigator.mediaSession &&
            duration > 0 &&
            !isChangingTrackRef.current
          ) {
            try {
              navigator.mediaSession.setPositionState({
                duration: duration,
                playbackRate: 1,
                position: Math.min(currentTime, duration),
              });
            } catch {
              // Ignore invalid range state
            }
          }
        }
      } catch (e) {
        // Player state not yet accessible
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, sponsorBlockEnabled, activeSegments, _setProgress, _setDuration, showToast]);

  // 7. MediaSession API integration for System Notifications & Lock Screen Controls
  const actionHandlersRef = useRef({ resume, pause, next, prev, _setProgress });
  actionHandlersRef.current = { resume, pause, next, prev, _setProgress };

  // Register action handlers ONCE on mount so Android lock screen notification is never torn down
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      actionHandlersRef.current.resume();
      playerRef.current?.playVideo();
      audioAnchorRef.current?.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      actionHandlersRef.current.pause();
      playerRef.current?.pauseVideo();
      audioAnchorRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      actionHandlersRef.current.next();
      audioAnchorRef.current?.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      actionHandlersRef.current.prev();
      audioAnchorRef.current?.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        playerRef.current?.seekTo(details.seekTime, true);
        actionHandlersRef.current._setProgress(details.seekTime);
        if ('setPositionState' in navigator.mediaSession) {
          try {
            const d = playerRef.current?.getDuration() || 0;
            navigator.mediaSession.setPositionState({
              duration: d,
              playbackRate: 1,
              position: Math.min(details.seekTime, d),
            });
          } catch {}
        }
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, []);

  // Update MediaSession Metadata & Position State on song change
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

    navigator.mediaSession.playbackState = 'playing';

    if ('setPositionState' in navigator.mediaSession && currentSong.duration && currentSong.duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: currentSong.duration,
          playbackRate: 1,
          position: 0,
        });
      } catch {}
    }
  }, [currentSong]);

  // Sync playbackState with navigator.mediaSession
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      if (isChangingTrackRef.current) {
        navigator.mediaSession.playbackState = 'playing';
      } else {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    }
  }, [isPlaying]);

  // 8. User interaction gesture unlocker for background audio anchor
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUserInteraction = () => {
      if (isPlayingRef.current && audioAnchorRef.current && audioAnchorRef.current.paused) {
        audioAnchorRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // 9. Visibility watcher: Re-assert playback on wake/unlock
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlayingRef.current) {
        if (playerRef.current) {
          try {
            const state = playerRef.current.getPlayerState();
            if (state !== window.YT.PlayerState.PLAYING && state !== window.YT.PlayerState.BUFFERING) {
              playerRef.current.playVideo();
            }
          } catch {
            // Ignore
          }
        }
        audioAnchorRef.current?.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      {/* Background Audio Anchor: Plays in the top-level document context so Android/iOS
          OS MediaSession notification bar and lockscreen player stay persistently active
          even when the app is minimized, locked, or running in the background. */}
      <audio
        ref={audioAnchorRef}
        src="/silence.wav"
        loop
        preload="auto"
        playsInline
        className="hidden"
        aria-hidden="true"
      />
      <div
        id="loop-yt-holder"
        className="fixed bottom-0 right-0 w-16 h-16 opacity-[0.005] pointer-events-none overflow-hidden z-[-1]"
        aria-hidden="true"
      >
        <div id="loop-yt-iframe" />
      </div>
    </>
  );
}
