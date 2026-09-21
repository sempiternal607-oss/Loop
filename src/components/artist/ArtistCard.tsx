'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArtistSummary } from '@/types/music';
import { Disc, ChevronRight } from 'lucide-react';

interface ArtistCardProps {
  artist: ArtistSummary;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const router = useRouter();

  const handleClick = () => {
    const target = artist.id || encodeURIComponent(artist.name);
    router.push(`/artist/${target}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col items-center text-center p-4 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-emerald-500/30 transition-all duration-300 cursor-pointer shadow-lg shadow-black/20 hover:-translate-y-1"
    >
      {/* Circular Artist Avatar */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-3 border-2 border-white/10 group-hover:border-emerald-400/60 shadow-xl group-hover:shadow-emerald-500/20 transition-all duration-300">
        {artist.thumbnail ? (
          <Image
            src={artist.thumbnail}
            alt={artist.name}
            fill
            sizes="128px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-slate-500">
            <Disc className="w-8 h-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Artist Info */}
      <div className="flex flex-col items-center w-full px-1">
        <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
          {artist.name}
        </span>
        <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 font-medium">
          {artist.subtitle || artist.subscribers || 'Artist'}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-400/80 group-hover:text-emerald-400 transition-colors">
        <span>View Profile</span>
        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
