'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Plus, Check, ListMusic, Music } from 'lucide-react';
import { usePlaylist } from '@/context/PlaylistContext';

export function AddToPlaylistModal() {
  const {
    isAddToPlaylistOpen,
    songToAddToPlaylist,
    closeAddToPlaylistModal,
    playlists,
    addSongToPlaylist,
    removeSongFromPlaylist,
    isSongInPlaylist,
    createPlaylist,
  } = usePlaylist();

  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isAddToPlaylistOpen || !songToAddToPlaylist) return null;

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      const created = createPlaylist(newTitle.trim());
      addSongToPlaylist(created.id, songToAddToPlaylist);
      setNewTitle('');
      setIsCreating(false);
      closeAddToPlaylistModal();
    }
  };

  const togglePlaylistSelection = (playlistId: string) => {
    if (isSongInPlaylist(playlistId, songToAddToPlaylist.videoId)) {
      removeSongFromPlaylist(playlistId, songToAddToPlaylist.videoId);
    } else {
      addSongToPlaylist(playlistId, songToAddToPlaylist);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={closeAddToPlaylistModal}
    >
      <div
        className="playlist-modal glass-panel w-full max-w-md rounded-3xl p-6 border border-white/[0.1] shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200 bg-[#0c0f18]/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ListMusic className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Add to Playlist</h3>
          </div>
          <button
            type="button"
            onClick={closeAddToPlaylistModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Song Preview */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-white/[0.08]">
            <Image
              src={songToAddToPlaylist.thumbnail}
              alt={songToAddToPlaylist.title}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white truncate">{songToAddToPlaylist.title}</span>
            <span className="text-xs text-slate-400 truncate">{songToAddToPlaylist.artist}</span>
          </div>
        </div>

        {/* Playlists List */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-none">
          {playlists.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              You don&apos;t have any playlists yet. Create your first one below!
            </div>
          ) : (
            playlists.map((playlist) => {
              const inPlaylist = isSongInPlaylist(playlist.id, songToAddToPlaylist.videoId);
              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => togglePlaylistSelection(playlist.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                    inPlaylist
                      ? 'bg-emerald-500/[0.12] border-emerald-500/30 text-white'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] shrink-0 flex items-center justify-center">
                      {playlist.thumbnail ? (
                        <Image
                          src={playlist.thumbnail}
                          alt={playlist.title}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-semibold truncate group-hover:text-white">
                        {playlist.title}
                      </span>
                      <span className="text-xs text-slate-400">
                        {playlist.songs.length} {playlist.songs.length === 1 ? 'track' : 'tracks'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      inPlaylist
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'border border-white/20 text-transparent group-hover:border-white/40'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Inline Create New Playlist */}
        {isCreating ? (
          <form onSubmit={handleCreateNew} className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Playlist name…"
              className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-2.5 rounded-2xl bg-white/[0.05] text-slate-400 text-xs hover:text-white"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/20 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/[0.04] transition-all text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>
        )}
      </div>
    </div>
  );
}
