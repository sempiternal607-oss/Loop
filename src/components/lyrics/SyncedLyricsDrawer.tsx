'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Mic2, Music2, Timer, RotateCcw } from 'lucide-react';
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
    lyricsOffset,
    adjustLyricsOffset,
    resetLyricsOffset,
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

  // Auto-scroll to active lyric with offset considered
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && isLyricsOpen) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [progress, lyricsOffset, isLyricsOpen]);

  if (!shouldRender || !currentSong) return null;

  const handleClose = () => {
    setIsClosing(true);
    closeLyrics();
  };

  // Determine current active lyric line index with sync offset
  const effectiveProgress = progress + lyricsOffset;
  let activeIndex = -1;
  if (lyrics?.synced && lyrics.lines.length > 0) {
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (effectiveProgress >= lyrics.lines[i].time) {
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
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between z-10 pb-5 border-b border-white/[0.08] max-w-4xl mx-auto w-full gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10 shrink-0">
              <Mic2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-lg font-black text-white tracking-tight truncate">{currentSong.title}</span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                {lyrics?.synced ? 'Real-time Synced Karaoke' : 'Lyrics'}
              </span>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={handleClose}
            className="sm:hidden w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.1] flex items-center justify-center transition-all duration-200 active:scale-90 shrink-0"
            title="Close lyrics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          {/* Sync Offset Controls (only visible when lyrics are synced) */}
          {lyrics?.synced && (
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] p-1 rounded-2xl shadow-inner backdrop-blur-md">
              <div className="flex items-center gap-1.5 px-2 py-1 text-slate-300">
                <Timer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-400 hidden xs:inline">Sync:</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold ${
                    lyricsOffset === 0
                      ? 'text-slate-400'
                      : lyricsOffset > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                  title={
                    lyricsOffset === 0
                      ? 'No offset'
                      : lyricsOffset > 0
                      ? `Lyrics shifted ${lyricsOffset.toFixed(1)}s earlier`
                      : `Lyrics delayed ${Math.abs(lyricsOffset).toFixed(1)}s`
                  }
                >
                  {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}
                </span>
              </div>

              <div className="h-4 w-px bg-white/[0.08]" />

              <button
                type="button"
                onClick={() => adjustLyricsOffset(-0.5)}
                className="px-2 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.1] text-slate-300 hover:text-white font-medium transition active:scale-90 text-[11px]"
                title="Delay lyrics by 0.5s (if lyrics appear too fast)"
              >
                -0.5s
              </button>

              <button
                type="button"
                onClick={() => adjustLyricsOffset(-0.1)}
                className="px-1.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.1] text-slate-300 hover:text-white font-medium transition active:scale-90 text-[11px]"
                title="Delay lyrics by 0.1s"
              >
                -0.1s
              </button>

              {lyricsOffset !== 0 ? (
                <button
                  type="button"
                  onClick={resetLyricsOffset}
                  className="px-2 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/25 flex items-center gap-1 transition active:scale-90 text-[11px] font-medium"
                  title="Reset offset to 0.0s"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden md:inline">Reset</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => adjustLyricsOffset(0.1)}
                className="px-1.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.1] text-slate-300 hover:text-white font-medium transition active:scale-90 text-[11px]"
                title="Advance lyrics by 0.1s"
              >
                +0.1s
              </button>

              <button
                type="button"
                onClick={() => adjustLyricsOffset(0.5)}
                className="px-2 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.1] text-slate-300 hover:text-white font-medium transition active:scale-90 text-[11px]"
                title="Advance lyrics by 0.5s (if lyrics appear too slow)"
              >
                +0.5s
              </button>
            </div>
          )}

          {/* Desktop close button */}
          <button
            type="button"
            onClick={handleClose}
            className="hidden sm:flex w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.1] items-center justify-center transition-all duration-200 active:scale-90 shrink-0"
            title="Close lyrics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
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
                    seek(Math.max(0, line.time - lyricsOffset));
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

      <div className="relative text-center text-xs text-slate-400 z-10 pt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
          <span>Tap any line to jump directly to that part of the song</span>
        </div>
        {lyrics?.synced && (
          <>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="text-slate-500 text-[11px]">Use +/- buttons above to fine-tune timing</span>
          </>
        )}
      </div>
    </div>
  );
}
