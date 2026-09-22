'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Mic2,
  ListMusic,
  ListPlus,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { usePlaylist } from '@/context/PlaylistContext';
import { formatDuration } from '@/lib/ytmusic';

export function FullScreenNowPlaying() {
  const router = useRouter();
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    repeatMode,
    isShuffle,
    lyrics,
    lyricsOffset,
    isFullScreenPlayerOpen,
    closeFullScreen,
    togglePlay,
    next,
    prev,
    seek,
    toggleRepeat,
    toggleShuffle,
    toggleFavorite,
    isFavorite,
    openLyrics,
    openQueue,
  } = usePlayer();
  const { openAddToPlaylistModal } = usePlaylist();

  const [shouldRender, setShouldRender] = useState(isFullScreenPlayerOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isFullScreenPlayerOpen) {
      setShouldRender(true);
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        document.body.style.overflow = '';
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [isFullScreenPlayerOpen, shouldRender]);

  // Clean up body overflow when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!shouldRender || !currentSong) return null;

  const handleClose = () => {
    setIsClosing(true);
    closeFullScreen();
  };

  const isLiked = isFavorite(currentSong.videoId);

  // Find currently active lyric line for preview with offset applied
  const effectiveProgress = progress + lyricsOffset;
  const currentLine = lyrics?.synced
    ? [...lyrics.lines].reverse().find((line) => effectiveProgress >= line.time)
    : null;

  return (
    <div
      className={`fullscreen-player-modal fixed inset-0 z-50 w-full h-[100dvh] max-h-[100dvh] bg-[#07080C]/95 backdrop-blur-3xl flex flex-col justify-between px-5 py-4 sm:p-10 overflow-hidden select-none overscroll-none touch-manipulation ${
        isClosing ? 'animate-modal-out' : 'animate-modal-in'
      }`}
    >
      {/* Ambient Gradient Backdrop clipped inside overflow-hidden */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
        <div
          className="fullscreen-ambient-bg absolute inset-0 opacity-25 blur-[100px] scale-125 transition-all duration-700"
          style={{
            backgroundImage: `url(${currentSong.thumbnail})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
        <div className="fullscreen-vignette-overlay absolute inset-0 bg-gradient-to-b from-[#07080C]/60 via-transparent to-[#07080C]/90" />
      </div>

      {/* Top Bar: Minimize button & Header */}
      <div className="relative flex items-center justify-between z-10 w-full max-w-xl mx-auto shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="fullscreen-minimize-btn w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-90"
          title="Minimize player"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="fullscreen-header-meta flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Playing from Loop</span>
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">
            {currentSong.album || 'Now Playing'}
          </span>
        </div>

        {/* Balance spacer */}
        <div className="w-10 h-10" />
      </div>

      {/* Center: Large Artwork & Song Info */}
      <div className="relative flex flex-col items-center justify-center my-auto py-1 sm:py-3 z-10 w-full max-w-sm mx-auto flex-1 min-h-0">
        <div
          className={`relative w-[min(65vw,260px)] h-[min(65vw,260px)] sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border border-white/[0.1] mb-3 sm:mb-6 shrink group transition-all duration-500 ease-out ${
            isPlaying
              ? 'scale-100 shadow-emerald-500/20'
              : 'scale-[0.95] opacity-90 shadow-black/60'
          }`}
        >
          <Image
            src={currentSong.thumbnail}
            alt={currentSong.title}
            fill
            sizes="(max-width: 640px) 260px, 320px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="flex items-center justify-between w-full px-2">
          <div className="flex flex-col overflow-hidden pr-3 min-w-0">
            <h2 className="fullscreen-song-title text-lg sm:text-2xl font-black text-white truncate leading-tight tracking-tight">
              {currentSong.title}
            </h2>
            <p
              onClick={() => {
                handleClose();
                const target = currentSong.artists?.[0]?.browseId || encodeURIComponent(currentSong.artist);
                router.push(`/artist/${target}`);
              }}
              className="fullscreen-song-artist text-xs sm:text-base text-slate-400 font-medium truncate mt-0.5 hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
            >
              {currentSong.artist}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => openAddToPlaylistModal(currentSong)}
              className="p-2.5 text-slate-400 hover:text-emerald-400 transition-all active:scale-90"
              title="Add to playlist"
            >
              <ListPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(currentSong)}
              className="p-2.5 text-slate-400 hover:text-white transition-all active:scale-90"
              title="Favorite"
            >
              <Heart className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${isLiked ? 'text-emerald-400 fill-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Seek Bar & Timestamps */}
        <div className="w-full mt-3 sm:mt-5 px-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={(e) => seek(Number(e.target.value))}
            className="player-slider w-full cursor-pointer"
          />
          <div className="fullscreen-timestamps flex justify-between items-center text-[11px] sm:text-xs text-slate-400 font-mono mt-1.5">
            <span>{formatDuration(progress)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Controls: Shuffle, Prev, Play/Pause, Next, Repeat */}
        <div className="flex items-center justify-between w-full mt-3 sm:mt-5 px-2 sm:px-4">
          <button
            type="button"
            onClick={toggleShuffle}
            className={`fullscreen-ctrl-btn p-2 transition-colors relative ${isShuffle ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            title={isShuffle ? 'Smart Shuffle Enabled' : 'Smart Shuffle Disabled'}
          >
            <Shuffle className="w-5 h-5" />
            {isShuffle && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={prev}
            className="fullscreen-ctrl-btn p-2.5 sm:p-3 text-white hover:text-emerald-400 transition-colors active:scale-95"
          >
            <SkipBack className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="fullscreen-play-btn w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-300 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-slate-950" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-slate-950 translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={next}
            className="fullscreen-ctrl-btn p-2.5 sm:p-3 text-white hover:text-emerald-400 transition-colors active:scale-95"
          >
            <SkipForward className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
          </button>

          <button
            type="button"
            onClick={toggleRepeat}
            className={`fullscreen-ctrl-btn p-2 transition-colors relative ${repeatMode !== 'off' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            {repeatMode !== 'off' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Bottom Actions: Synced Lyrics Card Preview & Queue Button */}
      <div className="relative flex flex-col gap-2.5 w-full max-w-sm mx-auto z-10 mt-auto pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] shrink-0">
        {/* Karaoke Preview Card */}
        <div
          onClick={openLyrics}
          className="fullscreen-lyrics-card glass-card rounded-2xl p-3 sm:p-4 cursor-pointer transition-all border border-white/[0.08] hover:border-emerald-500/40 flex items-center justify-between gap-3 group shadow-lg"
        >
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 border border-emerald-500/20">
              <Mic2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>Synced Lyrics</span>
                {lyricsOffset !== 0 && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 normal-case tracking-normal">
                    {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}
                  </span>
                )}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                {currentLine ? currentLine.text : 'Tap to open full synchronized lyrics'}
              </span>
            </div>
          </div>
        </div>

        {/* Queue quick link */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={openQueue}
            className="fullscreen-queue-btn flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white py-1.5 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all active:scale-95"
          >
            <ListMusic className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open Queue</span>
          </button>
        </div>
      </div>
    </div>
  );
}
