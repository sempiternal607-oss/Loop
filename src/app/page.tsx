'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Play, Music, Flame, Disc3 } from 'lucide-react';
import { Song } from '@/types/music';
import { SongCard } from '@/components/music/SongCard';
import { SongRow } from '@/components/music/SongRow';
import { usePlayer } from '@/context/PlayerContext';

interface HomeSection {
  title: string;
  items: Song[];
}

export default function HomePage() {
  const { playSong } = usePlayer();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const res = await fetch('/api/home');
        if (res.ok) {
          const data = await res.json();
          setSections(data.sections || []);
        }
      } catch (e) {
        console.error('Failed to load home sections', e);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  const firstSection = sections[0];
  const remainingSections = sections.slice(1);
  const featuredSong = firstSection?.items?.[0];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 md:gap-12 pb-36 md:pb-32 max-w-7xl mx-auto">
      {/* Premium Hero Banner with Vinyl Peek - Compact & Responsive on Mobile */}
      {featuredSong && (
        <div className="featured-banner relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950/40 via-[#0F121D]/90 to-indigo-950/40 border border-white/[0.1] p-4 sm:p-6 md:p-10 flex flex-row items-center justify-between gap-4 md:gap-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          {/* Ambient Lighting Gradients inside Hero */}
          <div className="featured-ambient-1 absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/[0.15] rounded-full blur-[90px] pointer-events-none" />
          <div className="featured-ambient-2 absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-500/[0.12] rounded-full blur-[90px] pointer-events-none" />

          {/* Left: Metadata & Play CTA */}
          <div className="flex flex-col gap-1.5 sm:gap-3 md:gap-4 max-w-xl z-10 text-left items-start flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="featured-badge flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> Featured Spotlight
              </span>
            </div>

            <h1 className="text-base sm:text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md line-clamp-2 w-full">
              {featuredSong.title}
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-zinc-300 font-medium truncate w-full">
              Trending track by <span className="text-white font-bold underline decoration-emerald-500/50 decoration-2 underline-offset-4">{featuredSong.artist}</span>
            </p>

            <div className="pt-1 sm:pt-2 md:pt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => playSong(featuredSong, firstSection.items)}
                className="featured-cta inline-flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-slate-950 translate-x-0.5" /> Play Now
              </button>
            </div>
          </div>

          {/* Right: Album Artwork with Vinyl Record Peek */}
          <div className="relative group shrink-0 z-10 mr-2 sm:mr-3 md:mr-6">
            {/* Spinning Vinyl Record (peeking behind cover) */}
            <div className="absolute -right-3 sm:-right-4 md:-right-6 top-1.5 sm:top-2 md:top-3 w-20 h-20 sm:w-28 sm:h-28 md:w-48 md:h-48 rounded-full bg-[#0a0a0a] border-2 md:border-[3px] border-[#222] shadow-xl flex items-center justify-center animate-spin-slow transition-transform group-hover:translate-x-3 md:group-hover:translate-x-4 duration-500">
              <div className="featured-vinyl-center w-7 h-7 sm:w-9 sm:h-9 md:w-14 md:h-14 rounded-full border border-zinc-700 bg-emerald-950 flex items-center justify-center">
                <Disc3 className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 text-emerald-400" />
              </div>
            </div>

            {/* Front Album Artwork */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-52 md:h-52 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.8)] border border-white/[0.15] group-hover:scale-[1.02] transition-transform duration-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredSong.thumbnail}
                alt={featuredSong.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-zinc-500">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <Music className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Loading top music charts & recommendations…</p>
        </div>
      ) : (
        <>
          {/* Top Charts Shelf */}
          {firstSection && (
            <section className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">{firstSection.title}</h2>
                    <span className="text-xs text-zinc-400 font-medium">Most streamed songs right now</span>
                  </div>
                </div>
              </div>

              {/* Grid cards for top songs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                {firstSection.items.slice(0, 12).map((song) => (
                  <SongCard key={song.videoId} song={song} playlistContext={firstSection.items} />
                ))}
              </div>
            </section>
          )}

          {/* Subsequent Shelves */}
          {remainingSections.map((sec, idx) => (
            <section key={idx} className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">{sec.title}</h3>
                    <span className="text-xs text-zinc-400 font-medium">Handpicked collection</span>
                  </div>
                </div>
              </div>

              {/* Alternate between grid cards and sleek list rows */}
              {idx % 2 === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                  {sec.items.map((song) => (
                    <SongCard key={song.videoId} song={song} playlistContext={sec.items} />
                  ))}
                </div>
              ) : (
                <div className="bg-[#10131E]/60 border border-white/[0.07] backdrop-blur-xl rounded-3xl p-3 sm:p-5 flex flex-col gap-1 shadow-lg">
                  {sec.items.slice(0, 8).map((song, rowIdx) => (
                    <SongRow
                      key={song.videoId}
                      song={song}
                      index={rowIdx}
                      playlistContext={sec.items}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
