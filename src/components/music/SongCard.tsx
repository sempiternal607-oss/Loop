'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Play, Pause, Heart, Plus, ListPlus } from 'lucide-react';
import { Song } from '@/types/music';
import { usePlayer } from '@/context/PlayerContext';
import { usePlaylist } from '@/context/PlaylistContext';

interface SongCardProps {
  song: Song;
  playlistContext?: Song[];
}

export function SongCard({ song, playlistContext }: SongCardProps) {
  const router = useRouter();
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite, isFavorite, addToQueue } = usePlayer();
  const { openAddToPlaylistModal } = usePlaylist();

  const isCurrent = currentSong?.videoId === song.videoId;
  const isLiked = isFavorite(song.videoId);

  const handleCardClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, playlistContext);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl p-3 transition-all duration-300 cursor-pointer flex flex-col gap-3 select-none ${
        isCurrent
          ? 'bg-emerald-500/[0.08] border border-emerald-500/40 shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]'
          : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-emerald-500/30 hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.7),0_0_20px_-4px_rgba(16,185,129,0.15)] hover:-translate-y-1'
      }`}
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-900 shadow-md">
        <Image
          src={song.thumbnail}
          alt={song.title}
          fill
          sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 240px"
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Ambient Dark Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top-Right Quick Action: Like, Add to Playlist & Add to Queue */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openAddToPlaylistModal(song);
            }}
            className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:scale-110 active:scale-95 transition"
            title="Add to playlist"
          >
            <ListPlus className="w-3.5 h-3.5 text-zinc-300 hover:text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(song);
            }}
            className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:scale-110 active:scale-95 transition"
            title="Favorite"
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-emerald-400 fill-emerald-400' : 'text-zinc-300'}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addToQueue(song);
            }}
            className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:scale-110 active:scale-95 transition"
            title="Add to queue"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-300" />
          </button>
        </div>

        {/* Floating Bottom-Right Play Button (Spotify style) */}
        <div className="absolute bottom-2.5 right-2.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="w-10 h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)] active:scale-90 transition-transform"
            title={isCurrent && isPlaying ? 'Pause' : 'Play'}
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Soundwave Equalizer Badge when Active */}
        {isCurrent && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-emerald-500/30 flex items-center gap-1.5 shadow-lg">
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-soundwave-1" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-soundwave-2" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-soundwave-3" />
              </div>
            ) : (
              <Pause className="w-2.5 h-2.5 text-emerald-400" />
            )}
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="flex flex-col overflow-hidden px-0.5">
        <h4 className={`text-sm font-semibold truncate leading-snug tracking-tight ${isCurrent ? 'text-emerald-400 font-bold' : 'text-zinc-100 group-hover:text-white'}`}>
          {song.title}
        </h4>
        <p
          onClick={(e) => {
            e.stopPropagation();
            const target = song.artists?.[0]?.browseId || encodeURIComponent(song.artist);
            router.push(`/artist/${target}`);
          }}
          className="text-xs text-zinc-400 truncate mt-1 hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
        >
          {song.artist}
        </p>
      </div>
    </div>
  );
}
