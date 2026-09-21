'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search as SearchIcon, Music2, Disc, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Song, ArtistSummary } from '@/types/music';
import { SongRow } from '@/components/music/SongRow';
import { SongCard } from '@/components/music/SongCard';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Song[]>([]);
  const [matchedArtist, setMatchedArtist] = useState<ArtistSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'songs'>('songs');

  useEffect(() => {
    setQuery(initialQuery);
    if (initialQuery.trim()) {
      performSearch(initialQuery.trim(), activeFilter);
    } else {
      setResults([]);
      setMatchedArtist(null);
    }
  }, [initialQuery, activeFilter]);

  async function performSearch(searchTerm: string, filter: string) {
    setLoading(true);
    try {
      const filterParam = filter === 'songs' ? '&filter=songs' : '';
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}${filterParam}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.songs || []);
        setMatchedArtist(data.artist || null);
      }
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setLoading(false);
    }
  }

  const topResult = results[0];
  const listResults = results.slice(1, 9);
  const gridResults = results.slice(9);

  const quickSearches = [
    'Acoustic Pop',
    'Chill R&B',
    'Late Night Lofi',
    'Indie Rock',
    'Mellow Piano',
    'Electronic Energy',
    'Trending Hits',
  ];

  const handleChipClick = (chip: string) => {
    setQuery(chip);
    router.push(`/search?q=${encodeURIComponent(chip)}`);
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-36 md:pb-32">
      {/* Header bar: Query Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Search</span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {initialQuery ? `Results for "${initialQuery}"` : 'Browse & Discover'}
          </h1>
          {initialQuery && results.length > 0 && (
            <span className="text-xs text-slate-400 mt-0.5">
              Found {results.length} songs from music catalog
            </span>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] w-fit">
          <button
            type="button"
            onClick={() => setActiveFilter('songs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'songs'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Songs Only
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Results
          </button>
        </div>
      </div>

      {/* Quick Discovery Genre Chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        <span className="text-xs text-slate-500 font-semibold shrink-0">Popular:</span>
        {quickSearches.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/[0.06] transition-all shrink-0 active:scale-95"
          >
            {chip}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Music2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-lg -z-10 animate-pulse" />
          </div>
          <p className="text-sm font-medium tracking-wide">Searching music catalog…</p>
        </div>
      ) : results.length === 0 ? (
        query ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 glass-panel rounded-3xl p-8 max-w-md mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 mb-1">
              <Disc className="w-7 h-7 stroke-1 text-slate-400 animate-spin-slow" />
            </div>
            <p className="text-base font-bold text-white">No results found for &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Try searching with different keywords, artist names, or pick from the recommended genres above.
            </p>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-10 flex flex-col items-center text-center gap-6 max-w-xl mx-auto border border-white/[0.08]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Music2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Explore the Loop Library</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                Search over millions of tracks with real-time synchronized karaoke lyrics, smart contextual shuffle, and high-fidelity audio.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {quickSearches.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setQuery(chip);
                    performSearch(chip, activeFilter);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/[0.08] transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-8">
          {/* Matched Artist Spotlight Card */}
          {matchedArtist && (
            <div
              onClick={() => router.push(`/artist/${matchedArtist.id}`)}
              className="group relative flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-white/[0.04] to-white/[0.02] border border-emerald-500/30 hover:border-emerald-500/50 shadow-xl shadow-emerald-950/20 hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 border-2 border-emerald-400/80 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={matchedArtist.thumbnail}
                    alt={matchedArtist.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Artist Spotlight</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors truncate">
                    {matchedArtist.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {matchedArtist.subtitle || 'Artist on Loop'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/artist/${matchedArtist.id}`);
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <span>View Artist & Discography</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Top Result + Top Songs Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {topResult && (
              <div className="lg:col-span-1 flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Top Result
                </span>
                <div className="h-full">
                  <SongCard song={topResult} playlistContext={results} />
                </div>
              </div>
            )}

            {listResults.length > 0 && (
              <div className="lg:col-span-2 flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Songs</span>
                <div className="glass-panel rounded-3xl p-3 border border-white/[0.08] flex flex-col gap-1">
                  {listResults.map((song, idx) => (
                    <SongRow
                      key={song.videoId}
                      song={song}
                      index={idx}
                      playlistContext={results}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* More Results Grid */}
          {gridResults.length > 0 && (
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">More Results</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {gridResults.map((song) => (
                  <SongCard key={song.videoId} song={song} playlistContext={results} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading search…</div>}>
      <SearchContent />
    </Suspense>
  );
}
