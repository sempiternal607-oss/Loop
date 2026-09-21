'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Music } from 'lucide-react';
import { Playlist } from '@/types/music';
import { usePlayer } from '@/context/PlayerContext';

interface PlaylistCardProps {
  playlist: Playlist;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { playPlaylist, currentSong, isPlaying } = usePlayer();

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playPlaylist(playlist, { shuffle: false });
  };

  const songsWithThumbnails = playlist.songs.filter((s) => Boolean(s.thumbnail));
  const hasMultiple = songsWithThumbnails.length >= 4;

  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="group relative rounded-2xl p-3.5 transition-all duration-300 cursor-pointer flex flex-col gap-3.5 select-none bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-emerald-500/30 hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.7),0_0_20px_-4px_rgba(16,185,129,0.15)] hover:-translate-y-1"
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 shadow-md border border-white/[0.06]">
        {hasMultiple ? (
          /* 2x2 Collage */
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            {songsWithThumbnails.slice(0, 4).map((s, idx) => (
              <div key={`${s.videoId}-${idx}`} className="relative w-full h-full">
                <Image
                  src={s.thumbnail}
                  alt={s.title}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : songsWithThumbnails.length > 0 ? (
          /* Single Image */
          <Image
            src={songsWithThumbnails[0].thumbnail}
            alt={playlist.title}
            fill
            sizes="240px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          /* Empty Gradient */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 via-slate-800 to-indigo-600/20">
            <Music className="w-10 h-10 text-emerald-400/50" />
          </div>
        )}

        {/* Dark Vignette Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Floating Emerald Play Button */}
        {playlist.songs.length > 0 && (
          <div className="absolute bottom-2.5 right-2.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
            <button
              type="button"
              onClick={handlePlayClick}
              className="w-10 h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)] active:scale-90 transition-transform"
              title={`Play ${playlist.title}`}
            >
              <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-col overflow-hidden px-0.5">
        <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate tracking-tight">
          {playlist.title}
        </h4>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {playlist.songs.length} {playlist.songs.length === 1 ? 'track' : 'tracks'}
          {playlist.description ? ` • ${playlist.description}` : ''}
        </p>
      </div>
    </Link>
  );
}
