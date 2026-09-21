'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Mic2,
  Maximize2,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { formatDuration } from '@/lib/ytmusic';

export function BottomPlayerBar() {
  const router = useRouter();
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    isLyricsOpen,
    isQueueOpen,
    queue,
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
    toggleLyrics,
    toggleQueue,
    openFullScreen,
  } = usePlayer();

  if (!currentSong) return null;

  const isLiked = isFavorite(currentSong.videoId);
  const progressPercent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <>
      {/* ---------------- MOBILE FLOATING MINI PLAYER (Screen < md) ---------------- */}
      <div className="md:hidden fixed bottom-14 left-2.5 right-2.5 z-30 mb-1">
        <div
          onClick={openFullScreen}
          className="mobile-player-bar bg-[#0E111C]/90 border border-white/[0.1] backdrop-blur-2xl rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.8)] p-2.5 flex items-center justify-between gap-3 cursor-pointer relative overflow-hidden active:scale-[0.99] transition-transform"
        >
          {/* Progress bar line at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/[0.08]">
            <div
              className="h-full bg-emerald-400 transition-all duration-200 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/[0.08]">
              <Image
                src={currentSong.thumbnail}
                alt={currentSong.title}
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-white truncate">{currentSong.title}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  const target = currentSong.artists?.[0]?.browseId || encodeURIComponent(currentSong.artist);
                  router.push(`/artist/${target}`);
                }}
                className="text-xs text-zinc-400 truncate hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
              >
                {currentSong.artist}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => toggleFavorite(currentSong)}
              className="p-2 text-zinc-400 hover:text-white transition"
              title="Favorite"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'text-emerald-400 fill-emerald-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black translate-x-0.5" />}
            </button>
            <button
              type="button"
              onClick={next}
              className="p-2 text-zinc-400 hover:text-white active:scale-95 transition"
              title="Next"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- DESKTOP PLAYER DOCK BAR (Screen >= md) ---------------- */}
      <div className="desktop-player-bar hidden md:flex fixed bottom-0 left-0 right-0 z-40 h-24 bg-[#090B12]/90 border-t border-white/[0.08] backdrop-blur-2xl px-6 items-center justify-between select-none shadow-[0_-12px_32px_rgba(0,0,0,0.6)]">
        {/* Left: Song Meta */}
        <div className="flex items-center gap-4 w-1/4 min-w-0">
          <div
            onClick={openFullScreen}
            className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-900 shrink-0 shadow-lg cursor-pointer group border border-white/[0.1]"
          >
            <Image
              src={currentSong.thumbnail}
              alt={currentSong.title}
              fill
              sizes="56px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <span
              onClick={openFullScreen}
              className="text-sm font-bold text-white truncate cursor-pointer hover:underline"
            >
              {currentSong.title}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                const target = currentSong.artists?.[0]?.browseId || encodeURIComponent(currentSong.artist);
                router.push(`/artist/${target}`);
              }}
              className="text-xs text-zinc-400 truncate mt-0.5 hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
            >
              {currentSong.artist}
            </span>
          </div>

          <button
            type="button"
            onClick={() => toggleFavorite(currentSong)}
            className="p-2 text-zinc-400 hover:text-white transition shrink-0 ml-1 hover:scale-110 active:scale-95"
            title="Favorite"
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'text-emerald-400 fill-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]' : ''}`} />
          </button>
        </div>

        {/* Center: Controls & Scrubber Seek Bar */}
        <div className="flex flex-col items-center gap-2 max-w-xl w-2/4">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`relative p-2 rounded-full transition-all ${
                isShuffle
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
              title="Smart Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={prev}
              className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.05] rounded-full transition active:scale-95"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.45)] hover:scale-105 active:scale-95 transition-all duration-200"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black translate-x-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={next}
              className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.05] rounded-full transition active:scale-95"
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={toggleRepeat}
              className={`relative p-2 rounded-full transition-all ${
                repeatMode !== 'off'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
              title="Repeat"
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Scrubber Seek Bar */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-xs text-zinc-400 font-mono w-10 text-right">
              {formatDuration(progress)}
            </span>
            <div className="relative flex-1 group py-1 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="player-slider w-full cursor-pointer"
              />
            </div>
            <span className="text-xs text-zinc-400 font-mono w-10">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right: Lyrics, Queue, Volume */}
        <div className="flex items-center justify-end gap-2.5 w-1/4">
          <button
            type="button"
            onClick={toggleLyrics}
            className={`p-2.5 rounded-xl transition ${
              isLyricsOpen
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleQueue}
            className={`relative p-2.5 rounded-xl transition ${
              isQueueOpen
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
            {queue.length > 1 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 text-black text-[9px] font-black rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                {Math.min(99, queue.length - 1)}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/[0.08]">
            <button
              type="button"
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition p-1"
              title="Mute/Unmute"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="player-slider w-20 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </>
  );
}
