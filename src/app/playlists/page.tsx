'use client';

import React, { useState } from 'react';
import { ListMusic, Plus, Music2, Sparkles } from 'lucide-react';
import { usePlaylist } from '@/context/PlaylistContext';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';

export default function PlaylistsPage() {
  const { playlists, createPlaylist } = usePlaylist();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createPlaylist(title.trim(), description.trim());
      setTitle('');
      setDescription('');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-36 md:pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20 shrink-0">
            <ListMusic className="w-7 h-7 text-slate-950" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Library</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Your Playlists</h1>
            <span className="text-xs text-slate-400 mt-0.5">
              {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'} saved
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm hover:from-emerald-400 hover:to-emerald-300 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 w-fit"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Inline Creation Modal / Card */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="glass-panel rounded-3xl p-6 border border-emerald-500/30 max-w-lg flex flex-col gap-4 animate-in slide-in-from-top-4 duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Create New Playlist
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Playlist title (e.g. Late Night Vibes, Workout Hits)"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
            >
              Create Playlist
            </button>
          </div>
        </form>
      )}

      {/* Playlist Grid */}
      {playlists.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto border border-white/[0.08]">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
            <Music2 className="w-8 h-8 text-slate-400" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-bold text-white">Create your first playlist</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              It&apos;s easy! Group your favorite tracks, soundtracks, and moods, and play or shuffle them anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="mt-2 px-5 py-2.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
          >
            Create Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
