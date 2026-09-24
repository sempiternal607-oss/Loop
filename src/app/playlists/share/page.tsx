'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Music,
  ArrowLeft,
  Sparkles,
  BookmarkPlus,
  Clock,
  ListMusic,
  Share2,
} from 'lucide-react';
import { usePlaylist } from '@/context/PlaylistContext';
import { usePlayer } from '@/context/PlayerContext';
import { decodePlaylist, SharedPlaylistData } from '@/lib/playlistShare';
import { formatDuration } from '@/lib/ytmusic';

function ShareReceiverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { importPlaylist } = usePlaylist();
  const { playPlaylist, playSong } = usePlayer();

  const [isLoading, setIsLoading] = useState(true);
  const [sharedData, setSharedData] = useState<SharedPlaylistData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      // Check hash first (#data=...) then search params (?data=...)
      let encodedData = '';
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashMatch = window.location.hash.match(/data=([^&]+)/);
        if (hashMatch) {
          encodedData = hashMatch[1];
        }
      }

      if (!encodedData) {
        const queryData = searchParams.get('data');
        if (queryData) {
          encodedData = queryData;
        }
      }

      if (!encodedData) {
        setError('Tautan berbagi playlist tidak valid atau data tidak ditemukan.');
        setIsLoading(false);
        return;
      }

      const decoded = await decodePlaylist(encodedData);
      if (!decoded || !decoded.title || !Array.isArray(decoded.songs)) {
        setError('Format data playlist tidak dikenali atau tautan rusak.');
      } else {
        setSharedData(decoded);
      }
      setIsLoading(false);
    }

    loadData();
  }, [searchParams]);

  const handleSaveToLibrary = () => {
    if (!sharedData) return;
    const newPlaylist = importPlaylist({
      title: sharedData.title,
      description: sharedData.description,
      songs: sharedData.songs,
    });
    setIsSaved(true);
    router.push(`/playlist/${newPlaylist.id}`);
  };

  const handlePlayNow = () => {
    if (!sharedData) return;
    const newPlaylist = importPlaylist({
      title: sharedData.title,
      description: sharedData.description,
      songs: sharedData.songs,
    });
    setIsSaved(true);
    playPlaylist(newPlaylist, { shuffle: false });
    router.push(`/playlist/${newPlaylist.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-white">Membaca data playlist bersama…</p>
        <p className="text-xs text-slate-400">Sedang mendekripsi data tanpa database</p>
      </div>
    );
  }

  if (error || !sharedData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <Music className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Playlist Tidak Ditemukan</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {error || 'Tautan ini mungkin tidak lengkap atau rusak.'}
        </p>
        <Link
          href="/playlists"
          className="mt-2 px-6 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs transition"
        >
          Lihat Koleksi Saya
        </Link>
      </div>
    );
  }

  const songsWithThumbnails = sharedData.songs.filter((s) => Boolean(s.thumbnail));
  const hasMultiple = songsWithThumbnails.length >= 4;
  const totalDuration = sharedData.songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const totalMinutes = Math.round(totalDuration / 60);

  return (
    <div className="flex flex-col gap-8 pb-36 md:pb-32 max-w-4xl mx-auto w-full">
      {/* Top back navigation */}
      <Link
        href="/playlists"
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Koleksi Playlist</span>
      </Link>

      {/* Hero Header Card */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/[0.08] shadow-2xl">
        {/* Cover Collage */}
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/[0.1] shrink-0 bg-slate-900">
          {hasMultiple ? (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
              {songsWithThumbnails.slice(0, 4).map((s, idx) => (
                <div key={`${s.videoId}-${idx}`} className="relative w-full h-full">
                  <Image src={s.thumbnail} alt={s.title} fill sizes="100px" className="object-cover" />
                </div>
              ))}
            </div>
          ) : songsWithThumbnails.length > 0 ? (
            <Image
              src={songsWithThumbnails[0].thumbnail}
              alt={sharedData.title}
              fill
              sizes="192px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 via-slate-800 to-indigo-600/20">
              <Music className="w-12 h-12 text-emerald-400/60" />
            </div>
          )}
        </div>

        {/* Info & Action Buttons */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Menerima Playlist
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2 truncate max-w-full">
            {sharedData.title}
          </h1>

          {sharedData.description && (
            <p className="text-xs sm:text-sm text-slate-300 mt-1 line-clamp-2">
              {sharedData.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 font-medium">
            <span>{sharedData.songs.length} lagu</span>
            {totalMinutes > 0 && <span>• {totalMinutes} menit</span>}
            <span>• 100% P2P Client Sync</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-5">
            <button
              type="button"
              onClick={handleSaveToLibrary}
              disabled={isSaved}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs sm:text-sm hover:from-emerald-400 hover:to-teal-300 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>{isSaved ? 'Tersimpan!' : 'Simpan ke Playlist Saya'}</span>
            </button>

            <button
              type="button"
              onClick={handlePlayNow}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.1] font-bold text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white translate-x-0.5" />
              <span>Putar Sekarang</span>
            </button>
          </div>
        </div>
      </div>

      {/* Song List Preview */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-emerald-400" />
            <span>Daftar Lagu ({sharedData.songs.length})</span>
          </h2>
          <span className="text-xs text-slate-500">Klik lagu untuk mendengarkan</span>
        </div>

        <div className="flex flex-col divide-y divide-white/[0.03]">
          {sharedData.songs.map((song, index) => (
            <div
              key={`${song.videoId}-${index}`}
              onClick={() =>
                playSong(song, sharedData.songs, index, {
                  bounded: true,
                  playlistId: 'shared-preview',
                })
              }
              className="flex items-center justify-between py-2.5 px-3 rounded-2xl hover:bg-white/[0.04] transition group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-xs text-slate-500 text-center font-mono">
                  {index + 1}
                </span>
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-white/[0.06]">
                  <Image src={song.thumbnail} alt={song.title} fill sizes="40px" className="object-cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                    {song.title}
                  </span>
                  <span className="text-xs text-slate-400 truncate">{song.artist}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                {song.duration ? formatDuration(song.duration) : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShareReceiverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-white">Memuat tautan playlist…</p>
        </div>
      }
    >
      <ShareReceiverContent />
    </Suspense>
  );
}
