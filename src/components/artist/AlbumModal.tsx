'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Play, Shuffle, Disc, Music2 } from 'lucide-react';
import { Song } from '@/types/music';
import { usePlayer } from '@/context/PlayerContext';
import { SongRow } from '@/components/music/SongRow';

interface AlbumData {
  id: string;
  title: string;
  artist: string;
  year?: string;
  thumbnail: string;
  songs: Song[];
}

interface AlbumModalProps {
  albumId: string | null;
  initialTitle?: string;
  initialThumbnail?: string;
  onClose: () => void;
}

export function AlbumModal({ albumId, initialTitle, initialThumbnail, onClose }: AlbumModalProps) {
  const { playSong, toggleShuffle, isShuffle } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  useEffect(() => {
    if (!albumId) return;

    let mounted = true;
    setLoading(true);

    async function loadAlbum() {
      try {
        const res = await fetch(`/api/album?id=${encodeURIComponent(albumId!)}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.album) {
            setAlbum(data.album);
          }
        }
      } catch (err) {
        console.error('Failed to load album tracks:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAlbum();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      mounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [albumId]);

  if (!albumId) return null;

  const handlePlayAll = () => {
    if (album && album.songs.length > 0) {
      playSong(album.songs[0], album.songs, 0);
    }
  };

  const handleShuffleAll = () => {
    if (album && album.songs.length > 0) {
      if (!isShuffle) toggleShuffle();
      playSong(album.songs[0], album.songs, 0);
    }
  };

  const displayTitle = album?.title || initialTitle || 'Album';
  const displayThumbnail = album?.thumbnail || initialThumbnail;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div
        className={`album-modal relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#0d111a] border border-white/[0.1] rounded-3xl shadow-2xl shadow-black/80 overflow-hidden z-10 ${
          isClosing ? 'animate-scale-out' : 'animate-scale-in'
        }`}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-white/[0.02]">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            <Disc className="w-4 h-4" /> Discography Release
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Album Overview Hero */}
        <div className="flex items-center gap-5 p-5 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/[0.06]">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-xl border border-white/[0.1] shrink-0">
            {displayThumbnail ? (
              <Image
                src={displayThumbnail}
                alt={displayTitle}
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-slate-500">
                <Disc className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0 justify-center">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight line-clamp-2">
              {displayTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              {album?.artist || 'Artist'} {album?.year ? `• ${album.year}` : ''}
            </p>
            {album?.songs && (
              <span className="text-xs text-emerald-400/90 font-semibold mt-1">
                {album.songs.length} Tracks
              </span>
            )}

            {/* Quick Play & Shuffle buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handlePlayAll}
                disabled={loading || !album?.songs?.length}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold transition shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-black translate-x-0.5" />
                Play All
              </button>
              <button
                type="button"
                onClick={handleShuffleAll}
                disabled={loading || !album?.songs?.length}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white text-xs font-semibold transition active:scale-95 disabled:opacity-50"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Shuffle
              </button>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Music2 className="w-7 h-7 animate-spin text-emerald-400" />
              <p className="text-xs font-medium">Loading tracks from album…</p>
            </div>
          ) : !album || album.songs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No tracks found in this release.
            </div>
          ) : (
            album.songs.map((song, idx) => (
              <SongRow
                key={song.videoId || idx}
                song={song}
                index={idx}
                playlistContext={album.songs}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
