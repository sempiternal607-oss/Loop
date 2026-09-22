import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { PlayerProvider } from '@/context/PlayerContext';
import { PlaylistProvider } from '@/context/PlaylistContext';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BottomPlayerBar } from '@/components/player/BottomPlayerBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { FullScreenNowPlaying } from '@/components/player/FullScreenNowPlaying';
import { SyncedLyricsDrawer } from '@/components/lyrics/SyncedLyricsDrawer';
import { QueueDrawer } from '@/components/queue/QueueDrawer';
import { AddToPlaylistModal } from '@/components/playlist/AddToPlaylistModal';
import { PwaRegister } from '@/components/pwa/PwaRegister';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Loop - Music Streaming with Synced Lyrics & SponsorBlock',
  description: 'Stream music ad-free with real-time synced lyrics, SponsorBlock auto-skip, and continuous radio queues.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Loop',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('loop_theme')||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');document.documentElement.setAttribute('data-theme','light');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="h-full bg-[#07080C] text-slate-100 flex overflow-hidden select-none font-sans relative">
        {/* Subtle Ambient Depth Lighting */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.05] rounded-full blur-[140px]" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-indigo-600/[0.04] rounded-full blur-[140px]" />
          <div className="absolute bottom-0 left-1/3 w-[550px] h-[550px] bg-cyan-500/[0.03] rounded-full blur-[160px]" />
        </div>

        <ThemeProvider>
          <ToastProvider>
            <PlayerProvider>
              <PlaylistProvider>
                <PwaRegister />
                <YouTubePlayer />

              {/* Desktop Sidebar */}
              <Sidebar />

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
                <Header />
                <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
                  {children}
                </main>
              </div>

              {/* Floating Overlays & Drawers */}
              <BottomPlayerBar />
              <MobileNav />
              <FullScreenNowPlaying />
              <SyncedLyricsDrawer />
              <QueueDrawer />
              <AddToPlaylistModal />
            </PlaylistProvider>
          </PlayerProvider>
        </ToastProvider>
      </ThemeProvider>
    </body>
  </html>
  );
}
