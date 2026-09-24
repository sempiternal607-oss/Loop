'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Play, Pause, Heart, Plus, ListPlus, Trash2 } from 'lucide-react';
import { Song } from '@/types/music';
import { usePlayer } from '@/context/PlayerContext';
import { usePlaylist } from '@/context/PlaylistContext';

interface SongRowProps {
  song: Song;
  index?: number;
  playlistContext?: Song[];
  options?: { bounded?: boolean; playlistId?: string };
  onRemove?: () => void;
}

export function SongRow({ song, index, playlistContext, options, onRemove }: SongRowProps) {
  const router = useRouter();
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite, isFavorite, addToQueue } = usePlayer();
  const { openAddToPlaylistModal } = usePlaylist();

  const isCurrent = currentSong?.videoId === song.videoId;
  const isLiked = isFavorite(song.videoId);

  const handleClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, playlistContext, index, options);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer select-none ${
        isCurrent
          ? 'bg-emerald-500/10 border border-emerald-500/30 text-white shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]'
          : 'hover:bg-white/[0.05] border border-transparent text-zinc-300'
      }`}
    >
      <div className="flex items-center gap-3.5 overflow-hidden flex-1">
        {/* Track Index or Play Icon */}
        <div className="w-6 text-center text-xs text-zinc-500 font-mono shrink-0 flex items-center justify-center">
          {isCurrent ? (
            isPlaying ? (
              <div className="flex items-end gap-0.5 h-3.5">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-soundwave-1" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-soundwave-2" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-soundwave-3" />
              </div>
            ) : (
              <Pause className="w-3.5 h-3.5 text-emerald-400" />
            )
          ) : (
            <>
              <span className="group-hover:hidden">{index !== undefined ? index + 1 : ''}</span>
              <Play className="w-3.5 h-3.5 hidden group-hover:inline-block text-white translate-x-0.5" />
            </>
          )}
        </div>

        {/* Artwork */}
        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-900 shrink-0 shadow-sm border border-white/[0.06]">
          <Image
            src={song.thumbnail}
            alt={song.title}
            fill
            sizes="40px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Title & Artist */}
        <div className="flex flex-col overflow-hidden">
          <span className={`text-sm font-semibold truncate leading-tight ${isCurrent ? 'text-emerald-400 font-bold' : 'text-zinc-100 group-hover:text-white'}`}>
            {song.title}
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              const target = song.artists?.[0]?.browseId || encodeURIComponent(song.artist);
              router.push(`/artist/${target}`);
            }}
            className="text-xs text-zinc-400 truncate mt-0.5 hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
          >
            {song.artist}
          </span>
        </div>
      </div>

      {/* Album name (hidden on small/medium) */}
      {song.album && (
        <span className="hidden lg:block text-xs text-zinc-400 truncate max-w-[200px] w-1/4">
          {song.album}
        </span>
      )}

      {/* Actions: Duration, Add to playlist, Add to queue, Favorite, Remove */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => openAddToPlaylistModal(song)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.08] transition"
          title="Add to playlist"
        >
          <ListPlus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => addToQueue(song)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
          title="Add to queue"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => toggleFavorite(song)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition"
          title="Favorite"
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'text-emerald-400 fill-emerald-400' : 'hover:text-zinc-200'}`} />
        </button>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Remove from playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {song.durationText && (
          <span className="text-xs text-zinc-500 font-mono w-12 text-right hidden sm:inline-block">
            {song.durationText}
          </span>
        )}
      </div>
    </div>
  );
}
