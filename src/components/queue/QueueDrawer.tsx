'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ListMusic, Trash2, Radio } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

export function QueueDrawer() {
  const {
    currentSong,
    queue,
    currentIndex,
    isQueueOpen,
    isPlaylistBounded,
    closeQueue,
    playSong,
    removeFromQueue,
  } = usePlayer();

  const [shouldRender, setShouldRender] = useState(isQueueOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isQueueOpen) {
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
  }, [isQueueOpen, shouldRender]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!shouldRender) return null;

  const handleClose = () => {
    setIsClosing(true);
    closeQueue();
  };

  const upcomingQueue = queue.slice(currentIndex + 1);

  return (
    <div
      className={`queue-drawer fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#07080C]/95 border-l border-white/[0.08] backdrop-blur-2xl shadow-2xl flex flex-col p-6 overflow-hidden ${
        isClosing ? 'animate-drawer-out' : 'animate-drawer-in'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ListMusic className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Playback Queue</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 font-semibold border border-white/[0.06]">
            {queue.length}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200 active:scale-90"
          title="Close queue"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Queue Content List */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6 pr-1 scrollbar-none">
        {/* Now Playing section */}
        {currentSong && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Now Playing</span>
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-full bg-emerald-400 rounded-full animate-soundwave-1" />
                <span className="w-0.5 h-2/3 bg-emerald-400 rounded-full animate-soundwave-2" />
                <span className="w-0.5 h-4/5 bg-emerald-400 rounded-full animate-soundwave-3" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-emerald-500/20">
                <Image
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-white truncate">{currentSong.title}</span>
                <span className="text-xs text-slate-400 truncate">{currentSong.artist}</span>
              </div>
            </div>
          </div>
        )}

        {/* Up Next section */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Up Next</span>
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              {isPlaylistBounded ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ListMusic className="w-3.5 h-3.5" /> Bounded to Playlist
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" /> Continuous Radio
                </span>
              )}
            </span>
          </div>

          {upcomingQueue.length === 0 ? (
            <div className="text-xs text-slate-400 py-8 text-center glass-panel rounded-2xl p-4 border border-white/[0.06]">
              Queue is empty. Similar songs will load automatically via smart shuffle!
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {upcomingQueue.map((song, idx) => {
                const absoluteIndex = currentIndex + 1 + idx;
                return (
                  <div
                    key={`${song.videoId}-${idx}`}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group"
                  >
                    <div
                      onClick={() => playSong(song, queue, absoluteIndex)}
                      className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/[0.06]">
                        <Image
                          src={song.thumbnail}
                          alt={song.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                          {song.title}
                        </span>
                        <span className="text-xs text-slate-400 truncate">{song.artist}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromQueue(absoluteIndex)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-400 transition-all rounded-lg hover:bg-white/[0.06]"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
