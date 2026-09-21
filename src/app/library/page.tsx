'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, History, Play, Music, ListMusic, Plus } from 'lucide-react';
import { SongRow } from '@/components/music/SongRow';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { usePlayer } from '@/context/PlayerContext';
import { usePlaylist } from '@/context/PlaylistContext';

export default function LibraryPage() {
  const { favorites, history, playSong } = usePlayer();
  const { playlists, createPlaylist } = usePlaylist();
  const [activeTab, setActiveTab] = useState<'favorites' | 'history' | 'playlists'>('favorites');

  const activeSongs = activeTab === 'favorites' ? favorites : history;

  const handlePlayAll = () => {
    if (activeSongs.length > 0) {
      playSong(activeSongs[0], activeSongs);
    }
  };

  const handleCreatePlaylist = () => {
    const title = prompt('Enter playlist title:');
    if (title && title.trim()) {
      createPlaylist(title.trim());
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-36 md:pb-32">
      {/* Library Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-emerald-500/20 border border-white/20 shrink-0">
            {activeTab === 'favorites' ? (
              <Heart className="w-8 h-8 text-white fill-white" />
            ) : activeTab === 'history' ? (
              <History className="w-8 h-8 text-white" />
            ) : (
              <ListMusic className="w-8 h-8 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Library</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {activeTab === 'favorites'
                ? 'Liked Songs'
                : activeTab === 'history'
                ? 'Listening History'
                : 'Your Playlists'}
            </h1>
            <span className="text-xs text-slate-400 mt-1">
              {activeTab === 'playlists'
                ? `${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'} created`
                : `${activeSongs.length} ${activeSongs.length === 1 ? 'track' : 'tracks'} stored locally`}
            </span>
          </div>
        </div>

        {/* Tab Controls & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'favorites'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? 'text-emerald-400 fill-emerald-400' : ''}`} />
              <span>Favorites</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('playlists')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'playlists'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              <span>Playlists</span>
            </button>
          </div>

          {activeTab !== 'playlists' && activeSongs.length > 0 && (
            <button
              type="button"
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm hover:from-emerald-400 hover:to-emerald-300 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
            >
              <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" /> Play All
            </button>
          )}

          {activeTab === 'playlists' && (
            <button
              type="button"
              onClick={handleCreatePlaylist}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm hover:from-emerald-400 hover:to-emerald-300 active:scale-95 transition-all shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> New Playlist
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'playlists' ? (
        playlists.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto border border-white/[0.08]">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
              <ListMusic className="w-7 h-7 stroke-1 text-slate-400" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-base font-bold text-white">No playlists yet</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Create a playlist to group songs for parties, workouts, or quiet study sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreatePlaylist}
              className="mt-2 px-5 py-2.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
            >
              Create First Playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {playlists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        )
      ) : activeSongs.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto border border-white/[0.08]">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
            <Music className="w-7 h-7 stroke-1 text-slate-400" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-white">
              {activeTab === 'favorites' ? 'No favorite songs yet' : 'No playback history yet'}
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              {activeTab === 'favorites'
                ? 'Tap the heart icon on any song to save it here for instant access.'
                : 'Songs you listen to will automatically appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-3 sm:p-4 border border-white/[0.08] flex flex-col gap-1">
          {activeSongs.map((song, idx) => (
            <SongRow
              key={`${song.videoId}-${idx}`}
              song={song}
              index={idx}
              playlistContext={activeSongs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
