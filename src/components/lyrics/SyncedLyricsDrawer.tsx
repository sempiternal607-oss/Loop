'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Mic2, Music2 } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

export function SyncedLyricsDrawer() {
  const {
    currentSong,
    lyrics,
    isLyricsLoading,
    isLyricsOpen,
    closeLyrics,
    progress,
    seek,
  } = usePlayer();

  const [shouldRender, setShouldRender] = useState(isLyricsOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isLyricsOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [isLyricsOpen, shouldRender]);

  const activeLineRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to active lyric
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && isLyricsOpen) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [progress, isLyricsOpen]);

  if (!shouldRender || !currentSong) return null;

  const handleClose = () => {
    setIsClosing(true);
    closeLyrics();
  };

  // Determine current active lyric line index
  let activeIndex = -1;
  if (lyrics?.synced && lyrics.lines.length > 0) {
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (progress >= lyrics.lines[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  return (
    <div
      className={`lyrics-drawer fixed inset-0 z-50 bg-[#07080C]/95 backdrop-blur-3xl flex flex-col p-6 sm:p-10 ${
        isClosing ? 'animate-modal-out' : 'animate-modal-in'
      }`}
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none blur-[100px] scale-125 transition-all duration-700"
        style={{
          backgroundImage: `url(${currentSong.thumbnail})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />
      <div className="lyrics-vignette-overlay absolute inset-0 bg-gradient-to-b from-[#07080C]/70 via-transparent to-[#07080C]/90 pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between z-10 pb-6 border-b border-white/[0.08] max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
            <Mic2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black text-white tracking-tight">{currentSong.title}</span>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {lyrics?.synced ? 'Real-time Synced Karaoke' : 'Lyrics'} {lyrics?.source ? `• ${lyrics.source}` : ''}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.1] flex items-center justify-center transition-all duration-200 active:scale-90"
          title="Close lyrics"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Lyrics Scrollable Container */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-y-auto py-12 px-2 max-w-2xl mx-auto w-full flex flex-col gap-6 z-10 scrollbar-none"
      >
        {isLyricsLoading ? (
          <div className="flex flex-col items-center justify-center my-auto text-slate-400 gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Mic2 className="w-6 h-6 animate-pulse text-emerald-400" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-lg -z-10 animate-pulse" />
            </div>
            <p className="text-sm font-medium tracking-wide">Loading synchronized lyrics…</p>
          </div>
        ) : !lyrics || lyrics.lines.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 flex flex-col items-center justify-center my-auto text-center gap-4 max-w-md mx-auto border border-white/[0.08]">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
              <Music2 className="w-7 h-7 stroke-1 text-slate-400" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-base font-bold text-white">No lyrics available for this song</p>
              <p className="text-xs text-slate-400">Sit back, relax, and enjoy the music!</p>
            </div>
          </div>
        ) : (
          lyrics.lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <button
                key={idx}
                ref={isActive ? activeLineRef : null}
                type="button"
                onClick={() => {
                  if (lyrics.synced) {
                    seek(line.time);
                  }
                }}
                className={`text-left transition-all duration-300 rounded-2xl px-5 py-3 hover:bg-white/[0.05] cursor-pointer ${
                  isActive
                    ? 'text-white text-2xl sm:text-3xl font-black scale-105 origin-left tracking-tight bg-white/[0.06] border border-white/[0.1] shadow-xl shadow-emerald-500/5'
                    : isPast
                    ? 'text-slate-500 text-lg sm:text-xl font-bold'
                    : 'text-slate-500 text-lg sm:text-xl font-bold hover:text-slate-300'
                }`}
              >
                <span className={isActive ? 'lyric-active-text bg-gradient-to-r from-emerald-300 to-white bg-clip-text text-transparent' : ''}>
                  {line.text || '♪'}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="relative text-center text-xs text-slate-400 z-10 pt-4 flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
        <span>Tap any line to jump directly to that part of the song</span>
      </div>
    </div>
  );
}
