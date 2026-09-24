'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Shuffle,
  Music,
  Trash2,
  Edit3,
  Search,
  Plus,
  ArrowLeft,
  Sparkles,
  Share2,
} from 'lucide-react';
import { usePlaylist } from '@/context/PlaylistContext';
import { usePlayer } from '@/context/PlayerContext';
import { SongRow } from '@/components/music/SongRow';
import { Song } from '@/types/music';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params?.id as string;

  const {
    getPlaylist,
    deletePlaylist,
    updatePlaylist,
    removeSongFromPlaylist,
    addSongToPlaylist,
    openShareModal,
  } = usePlaylist();
  const { playPlaylist, playSong, currentSong, isPlaying } = usePlayer();

  const playlist = getPlaylist(playlistId);

  // Search/Filter state
  const [filterQuery, setFilterQuery] = useState('');
  // Edit modal/state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Recommended tracks state
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    if (playlist) {
      setEditTitle(playlist.title);
      setEditDesc(playlist.description || '');
    }
  }, [playlist]);

  // Fetch smart recommendations based on artists in this playlist
  useEffect(() => {
    if (!playlist || playlist.songs.length === 0) return;

    let isMounted = true;
    async function fetchRecommendations() {
      setLoadingRecs(true);
      try {
        const seedSong = playlist?.songs[0];
        if (seedSong) {
          const res = await fetch(`/api/next?videoId=${seedSong.videoId}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.queue) && isMounted) {
              const existingIds = new Set(playlist.songs.map((s) => s.videoId));
              const recs = (data.queue as Song[])
                .filter((s) => !existingIds.has(s.videoId))
                .slice(0, 5);
              setRecommendations(recs);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load playlist recommendations', e);
      } finally {
        if (isMounted) setLoadingRecs(false);
      }
    }

    fetchRecommendations();
    return () => {
      isMounted = false;
    };
  }, [playlist?.songs]);

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
        <Music className="w-12 h-12 text-slate-500" />
        <h2 className="text-xl font-bold text-white">Playlist not found</h2>
        <p className="text-xs text-slate-400">The playlist you are looking for may have been deleted.</p>
        <Link
          href="/playlists"
          className="mt-2 px-5 py-2.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
        >
          Back to Playlists
        </Link>
      </div>
    );
  }

  // Filtered songs
  const filteredSongs = useMemo(() => {
    if (!filterQuery.trim()) return playlist.songs;
    const q = filterQuery.toLowerCase();
    return playlist.songs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }, [playlist.songs, filterQuery]);

  // Total duration in minutes
  const totalDurationSeconds = playlist.songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const totalMinutes = Math.round(totalDurationSeconds / 60);

  const songsWithThumbnails = playlist.songs.filter((s) => Boolean(s.thumbnail));
  const hasMultiple = songsWithThumbnails.length >= 4;

  const handlePlayAll = () => {
    playPlaylist(playlist, { shuffle: false });
  };

  const handleShufflePlaylist = () => {
    playPlaylist(playlist, { shuffle: true });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      updatePlaylist(playlist.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${playlist.title}"?`)) {
      deletePlaylist(playlist.id);
      router.push('/playlists');
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-36 md:pb-32">
      {/* Back button */}
      <Link
        href="/playlists"
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All Playlists</span>
      </Link>

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-white/[0.08]">
        {/* Cover Collage or Single */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-white/[0.1] shrink-0 bg-slate-900">
          {hasMultiple ? (
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
            <Image
              src={songsWithThumbnails[0].thumbnail}
              alt={playlist.title}
              fill
              sizes="208px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 via-slate-800 to-indigo-600/20">
              <Music className="w-16 h-16 text-emerald-400/50" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 overflow-hidden">
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Playlist</span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1 truncate max-w-full">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-lg">
              {playlist.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 font-medium">
            <span>{playlist.songs.length} {playlist.songs.length === 1 ? 'track' : 'tracks'}</span>
            {totalMinutes > 0 && <span>• {totalMinutes} mins</span>}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-5">
            {playlist.songs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handlePlayAll}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm hover:from-emerald-400 hover:to-emerald-300 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                >
                  <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" />
                  <span>Play</span>
                </button>

                <button
                  type="button"
                  onClick={handleShufflePlaylist}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.06] hover:bg-emerald-500/20 text-white hover:text-emerald-400 border border-white/[0.1] hover:border-emerald-500/40 font-bold text-xs sm:text-sm active:scale-95 transition-all shadow-lg"
                  title="Shuffle exclusively within this playlist"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle Playlist</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => openShareModal(playlist)}
              className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/[0.04] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/30 font-bold text-xs sm:text-sm active:scale-95 transition cursor-pointer"
              title="Bagikan playlist via Tautan atau QR Code"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Bagikan</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition"
              title="Edit playlist"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="p-3 rounded-full bg-white/[0.04] hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-white/[0.08] transition"
              title="Delete playlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {isEditing && (
        <form
          onSubmit={handleSaveEdit}
          className="glass-panel rounded-3xl p-6 border border-emerald-500/30 max-w-lg flex flex-col gap-4 animate-scale-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Edit Playlist Details</h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Playlist title"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!editTitle.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Search/Filter within Playlist */}
      {playlist.songs.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter in this playlist…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition"
          />
        </div>
      )}

      {/* Playlist Tracks List */}
      {playlist.songs.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto border border-white/[0.08]">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
            <Music className="w-7 h-7 stroke-1 text-slate-400" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-white">This playlist is empty</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Search for songs, artists, or soundtracks and tap the &ldquo;+&rdquo; icon to add them here.
            </p>
          </div>
          <Link
            href="/search"
            className="mt-2 px-5 py-2.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
          >
            Search Songs to Add
          </Link>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-400">
          No songs matched &ldquo;{filterQuery}&rdquo; in this playlist.
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-3 sm:p-4 border border-white/[0.08] flex flex-col gap-1">
          {filteredSongs.map((song, idx) => {
            const trueIndex = playlist.songs.findIndex((s) => s.videoId === song.videoId);
            return (
              <SongRow
                key={`${song.videoId}-${idx}`}
                song={song}
                index={trueIndex >= 0 ? trueIndex : idx}
                playlistContext={playlist.songs}
                options={{ bounded: true, playlistId: playlist.id }}
                onRemove={() => removeSongFromPlaylist(playlist.id, song.videoId)}
              />
            );
          })}
        </div>
      )}

      {/* Smart Recommendations for this Playlist */}
      {recommendations.length > 0 && (
        <div className="flex flex-col gap-4 mt-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">
              Recommended for this Playlist
            </h3>
          </div>
          <div className="glass-panel rounded-3xl p-3 sm:p-4 border border-white/[0.08] flex flex-col gap-1">
            {recommendations.map((song, idx) => (
              <div
                key={song.videoId}
                className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition group"
              >
                <div
                  onClick={() => playSong(song)}
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
                  onClick={() => addSongToPlaylist(playlist.id, song)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
                  title="Add to this playlist"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
