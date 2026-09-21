'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Play,
  Shuffle,
  Disc,
  Music2,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ArtistProfile, ArtistRelease } from '@/types/music';
import { usePlayer } from '@/context/PlayerContext';
import { SongRow } from '@/components/music/SongRow';
import { ArtistCard } from '@/components/artist/ArtistCard';
import { AlbumModal } from '@/components/artist/AlbumModal';

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

export default function ArtistPage({ params }: ArtistPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const artistId = decodeURIComponent(resolvedParams.id || '');

  const { playSong, toggleShuffle, isShuffle } = usePlayer();

  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showAllTopSongs, setShowAllTopSongs] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<ArtistRelease | null>(null);

  useEffect(() => {
    if (!artistId) return;

    let mounted = true;
    setLoading(true);

    async function loadArtist() {
      try {
        const res = await fetch(`/api/artist?id=${encodeURIComponent(artistId)}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.artist) {
            setArtist(data.artist);
          }
        }
      } catch (err) {
        console.error('Failed to load artist:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadArtist();

    return () => {
      mounted = false;
    };
  }, [artistId]);

  const handlePlayTopSongs = () => {
    if (artist && artist.topSongs.length > 0) {
      playSong(artist.topSongs[0], artist.topSongs, 0);
    }
  };

  const handleShuffleArtist = () => {
    if (artist && artist.topSongs.length > 0) {
      if (!isShuffle) toggleShuffle();
      playSong(artist.topSongs[0], artist.topSongs, 0);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-400">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Music2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-lg -z-10 animate-pulse" />
        </div>
        <p className="text-sm font-medium tracking-wide">Loading artist profile…</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
          <Disc className="w-8 h-8 stroke-1" />
        </div>
        <h2 className="text-xl font-bold text-white">Artist Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          We couldn&apos;t find an artist profile for &ldquo;{artistId}&rdquo;. Try searching for another artist or song.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  const displayedTopSongs = showAllTopSongs ? artist.topSongs : artist.topSongs.slice(0, 5);

  return (
    <div className="flex flex-col gap-10 pb-36 md:pb-32 -mx-4 sm:-mx-6 md:-mx-8">
      {/* Top Back Navigation Bar */}
      <div className="px-4 sm:px-6 md:px-8 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      {/* Artist Hero Header */}
      <div className="relative overflow-hidden border-b border-white/[0.08] pb-10 pt-4 px-4 sm:px-6 md:px-8">
        {/* Blurred Background Banner */}
        {artist.banner && (
          <div className="absolute inset-0 -z-10 overflow-hidden opacity-30 blur-2xl scale-105 pointer-events-none">
            <Image
              src={artist.banner}
              alt={artist.name}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#090B12]/60 via-[#090B12]/90 to-[#090B12]" />
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 max-w-5xl">
          {/* Avatar with glow */}
          <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-full overflow-hidden shadow-2xl shadow-emerald-500/10 border-4 border-white/10 shrink-0">
            <Image
              src={artist.thumbnail}
              alt={artist.name}
              fill
              priority
              sizes="(max-width: 640px) 144px, 192px"
              className="object-cover"
            />
          </div>

          {/* Details */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
              <span>Verified Artist</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
              {artist.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {artist.subtitle || (artist.subscribers ? `${artist.subscribers} listeners` : 'Artist')}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={handlePlayTopSongs}
                disabled={artist.topSongs.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm transition-all shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-black translate-x-0.5" />
                <span>Play Top Songs</span>
              </button>

              <button
                type="button"
                onClick={handleShuffleArtist}
                disabled={artist.topSongs.length === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-10 px-4 sm:px-6 md:px-8">
        {/* Artist Bio / About */}
        {artist.description && (
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/[0.08] max-w-4xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">About Artist</h3>
            <p className={`text-xs sm:text-sm text-slate-300 leading-relaxed ${bioExpanded ? '' : 'line-clamp-3'}`}>
              {artist.description}
            </p>
            {artist.description.length > 200 && (
              <button
                type="button"
                onClick={() => setBioExpanded(!bioExpanded)}
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-emerald-400 hover:underline"
              >
                {bioExpanded ? (
                  <>
                    <span>Show less</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Read more</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Popular Tracks (Top Songs) */}
        {artist.topSongs.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Popular Tracks</h2>
              {artist.topSongs.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllTopSongs(!showAllTopSongs)}
                  className="text-xs font-bold text-emerald-400 hover:underline"
                >
                  {showAllTopSongs ? 'Show Less' : `See All (${artist.topSongs.length})`}
                </button>
              )}
            </div>

            <div className="glass-panel rounded-3xl p-2 sm:p-3 border border-white/[0.08] flex flex-col gap-1">
              {displayedTopSongs.map((song, idx) => (
                <SongRow
                  key={song.videoId || idx}
                  song={song}
                  index={idx}
                  playlistContext={artist.topSongs}
                />
              ))}
            </div>
          </div>
        )}

        {/* Albums Section */}
        {artist.albums && artist.albums.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Albums</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {artist.albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbum(album)}
                  className="group relative flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-emerald-500/30 transition-all cursor-pointer shadow-lg hover:-translate-y-1"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-neutral-900 border border-white/[0.08] shadow-md">
                    <Image
                      src={album.thumbnail}
                      alt={album.title}
                      fill
                      sizes="200px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-black translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                    {album.title}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    {album.year || 'Album'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Singles & EPs Section */}
        {artist.singles && artist.singles.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Singles & EPs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {artist.singles.map((single) => (
                <div
                  key={single.id}
                  onClick={() => setSelectedAlbum(single)}
                  className="group relative flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-emerald-500/30 transition-all cursor-pointer shadow-lg hover:-translate-y-1"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-neutral-900 border border-white/[0.08] shadow-md">
                    <Image
                      src={single.thumbnail}
                      alt={single.title}
                      fill
                      sizes="200px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-black translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                    {single.title}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    {single.year || 'Single'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fans Also Like / Similar Artists */}
        {artist.relatedArtists && artist.relatedArtists.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Fans Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {artist.relatedArtists.map((rel) => (
                <ArtistCard key={rel.id} artist={rel} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Album / Release Modal */}
      {selectedAlbum && (
        <AlbumModal
          albumId={selectedAlbum.id}
          initialTitle={selectedAlbum.title}
          initialThumbnail={selectedAlbum.thumbnail}
          onClose={() => setSelectedAlbum(null)}
        />
      )}
    </div>
  );
}
