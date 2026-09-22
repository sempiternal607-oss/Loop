'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Heart, Disc3, ListMusic, Plus } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { usePlaylist } from '@/context/PlaylistContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Sidebar() {
  const pathname = usePathname();
  const { favorites, playSong } = usePlayer();
  const { playlists, createPlaylist } = usePlaylist();

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Playlists', href: '/playlists', icon: ListMusic },
    { name: 'Your Library', href: '/library', icon: Library },
  ];

  const handleQuickCreate = () => {
    const name = prompt('Enter new playlist name:');
    if (name && name.trim()) {
      createPlaylist(name.trim());
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#090B12]/80 backdrop-blur-2xl border-r border-white/[0.06] p-5 shrink-0 select-none h-full justify-between z-20">
      <div className="flex flex-col gap-6">
        {/* Modern Logo Branding */}
        <Link href="/" className="flex items-center gap-3 px-1.5 group">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform duration-300 shrink-0">
            <Image
              src="/icon.png"
              alt="Loop Logo"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl text-white tracking-tight leading-none">LOOP</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-[10px] text-emerald-400/90 font-bold tracking-widest uppercase mt-0.5">Stream HQ</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/playlists' && pathname.startsWith('/playlist'));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent text-emerald-300 font-semibold border border-emerald-500/25 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'text-zinc-400 group-hover:text-white'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Playlists Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Playlists</span>
            <button
              type="button"
              onClick={handleQuickCreate}
              className="p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-emerald-400 transition"
              title="Create new playlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto pr-1 scrollbar-none">
            {playlists.length === 0 ? (
              <p className="text-xs text-zinc-500 px-2 py-1.5">No playlists yet.</p>
            ) : (
              playlists.slice(0, 8).map((pl) => {
                const isPlActive = pathname === `/playlist/${pl.id}`;
                return (
                  <Link
                    key={pl.id}
                    href={`/playlist/${pl.id}`}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition truncate ${
                      isPlActive
                        ? 'text-emerald-400 font-semibold bg-white/[0.05]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="truncate">{pl.title}</span>
                    <span className="text-[10px] text-zinc-600 font-mono ml-2 shrink-0">{pl.songs.length}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Favorites List */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Favorites</span>
            <span className="text-[11px] font-semibold text-zinc-500 bg-white/[0.05] px-2 py-0.5 rounded-full">
              {favorites.length}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto pr-1 scrollbar-none">
            {favorites.length === 0 ? (
              <p className="text-xs text-zinc-500 px-2 py-1.5">No favorites saved yet.</p>
            ) : (
              favorites.slice(0, 8).map((song) => (
                <button
                  key={song.videoId}
                  onClick={() => playSong(song, favorites)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/[0.06] text-zinc-300 hover:text-white transition group truncate"
                >
                  <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-xs truncate font-medium text-zinc-300 group-hover:text-white">{song.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-zinc-500 px-1 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
        <div className="flex flex-col">
          <span className="font-medium">Theme Mode</span>
          <span className="text-[10px] text-zinc-500 font-mono">Loop HQ</span>
        </div>
        <ThemeToggle showLabel={false} />
      </div>
    </aside>
  );
}
