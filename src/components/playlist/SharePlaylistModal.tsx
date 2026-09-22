'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  Download,
  Music,
  FileDown,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { usePlaylist } from '@/context/PlaylistContext';
import { useToast } from '@/components/ui/Toast';
import { generateShareUrl, exportPlaylistJson } from '@/lib/playlistShare';

export function SharePlaylistModal() {
  const { isShareModalOpen, playlistToShare, closeShareModal } = usePlaylist();
  const { showToast } = useToast();

  const [shareUrl, setShareUrl] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr'>('link');

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!isShareModalOpen || !playlistToShare) {
      setShareUrl('');
      setQrCodeDataUrl('');
      setCopied(false);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);

    generateShareUrl(playlistToShare)
      .then(async (url) => {
        if (!isMounted) return;
        setShareUrl(url);

        try {
          const qr = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: {
              dark: '#030712',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
          if (isMounted) {
            setQrCodeDataUrl(qr);
          }
        } catch (e) {
          console.error('Failed to generate QR code', e);
        }
      })
      .catch((err) => {
        console.error('Failed to generate share link', err);
        showToast('Gagal membuat tautan berbagi');
      })
      .finally(() => {
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isShareModalOpen, playlistToShare, showToast]);

  if (!isShareModalOpen || !playlistToShare) return null;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Tautan playlist berhasil disalin!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Gagal menyalin tautan');
    }
  };

  const handleNativeShare = async () => {
    if (!playlistToShare || !shareUrl) return;
    try {
      await navigator.share({
        title: `Playlist: ${playlistToShare.title} | Loop`,
        text: `Dengarkan playlist "${playlistToShare.title}" (${playlistToShare.songs.length} lagu) di Loop!`,
        url: shareUrl,
      });
      showToast('Berbagi playlist dibuka');
    } catch (err: unknown) {
      // Ignore user aborting native share sheet
      if (err instanceof Error && err.name !== 'AbortError') {
        handleCopyLink();
      }
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    const safeTitle = playlistToShare.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    a.download = `loop-qr-${safeTitle}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('QR Code berhasil diunduh');
  };

  const handleExportFile = () => {
    if (!playlistToShare) return;
    exportPlaylistJson(playlistToShare);
    showToast('File backup playlist diunduh');
  };

  const songsWithThumbnails = playlistToShare.songs.filter((s) => Boolean(s.thumbnail));
  const hasMultiple = songsWithThumbnails.length >= 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-7 border border-white/[0.1] shadow-2xl flex flex-col gap-6 relative animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Bagikan Playlist</h3>
              <p className="text-xs text-slate-400">Kirim playlist ke perangkat lain tanpa database</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeShareModal}
            className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playlist Preview Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-white/[0.08]">
            {hasMultiple ? (
              <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                {songsWithThumbnails.slice(0, 4).map((s, idx) => (
                  <div key={`${s.videoId}-${idx}`} className="relative w-full h-full">
                    <Image src={s.thumbnail} alt={s.title} fill sizes="40px" className="object-cover" />
                  </div>
                ))}
              </div>
            ) : songsWithThumbnails.length > 0 ? (
              <Image
                src={songsWithThumbnails[0].thumbnail}
                alt={playlistToShare.title}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                <Music className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Koleksi Playlist
            </span>
            <h4 className="text-base font-bold text-white truncate">{playlistToShare.title}</h4>
            <span className="text-xs text-slate-400">
              {playlistToShare.songs.length} {playlistToShare.songs.length === 1 ? 'lagu' : 'lagu'}
            </span>
          </div>
        </div>

        {/* Tabs: Tautan Link vs QR Code */}
        <div className="flex rounded-2xl bg-white/[0.04] p-1 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'link'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Tautan / Share Link</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Pindai QR Code</span>
          </button>
        </div>

        {/* Tab 1: Share Link */}
        {activeTab === 'link' && (
          <div className="flex flex-col gap-4">
            {/* Native Share button (Mobile / PWA friendly) */}
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm hover:from-emerald-400 hover:to-teal-300 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Smartphone className="w-4 h-4" />
                <span>Kirim via WhatsApp / Aplikasi HP</span>
              </button>
            )}

            {/* URL Copy Box */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">
                Salin Tautan Langsung:
              </label>
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.1] rounded-2xl p-2 pl-3">
                <input
                  type="text"
                  readOnly
                  value={isGenerating ? 'Menyiapkan tautan...' : shareUrl}
                  className="bg-transparent text-xs text-slate-300 flex-1 outline-none font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={isGenerating || !shareUrl}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/[0.08] hover:bg-white/[0.15] text-white'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
              💡 <strong>Tips:</strong> Buka tautan ini di HP atau perangkat mana saja. Playlist akan langsung otomatis terbuka dan tersimpan ke perpustakaan tanpa perlu login ataupun database.
            </p>
          </div>
        )}

        {/* Tab 2: QR Code */}
        {activeTab === 'qr' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative p-4 rounded-3xl bg-white shadow-xl shadow-emerald-500/5">
              {isGenerating || !qrCodeDataUrl ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-slate-600">
                  <Sparkles className="w-8 h-8 animate-pulse text-emerald-500" />
                  <span className="text-xs font-medium">Membuat QR Code…</span>
                </div>
              ) : (
                <Image
                  src={qrCodeDataUrl}
                  alt="QR Code Playlist"
                  width={224}
                  height={224}
                  className="rounded-xl"
                  unoptimized
                />
              )}
            </div>

            <div className="flex flex-col gap-1 max-w-xs">
              <p className="text-xs font-bold text-white">Arahkan Kamera HP ke QR Code</p>
              <p className="text-[11px] text-slate-400">
                Pindai menggunakan kamera bawaan HP / Google Lens untuk langsung membuka dan menyimpan playlist di HP Anda.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-1">
              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrCodeDataUrl}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] transition text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Gambar QR</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!shareUrl}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] transition text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin Tautan'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer actions: Backup JSON file */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span>Opsi cadangan:</span>
          <button
            type="button"
            onClick={handleExportFile}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Ekspor File (.json)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
