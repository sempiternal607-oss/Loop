export interface Artist {
  name: string;
  browseId?: string;
}

export interface ArtistSummary {
  id: string; // browseId or name identifier
  name: string;
  subtitle?: string; // e.g. "Artis • 5,41 jt audiens bulanan"
  thumbnail: string;
  subscribers?: string;
}

export interface ArtistRelease {
  id: string; // browseId e.g. MPRE...
  title: string;
  year?: string;
  thumbnail: string;
  type?: 'Album' | 'Single' | 'EP';
}

export interface ArtistProfile {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  thumbnail: string;
  banner?: string;
  subscribers?: string;
  topSongs: Song[];
  albums: ArtistRelease[];
  singles: ArtistRelease[];
  relatedArtists: ArtistSummary[];
}

export interface Song {
  videoId: string;
  title: string;
  artist: string;
  artists?: Artist[];
  album?: string;
  thumbnail: string;
  duration?: number; // in seconds
  durationText?: string;
  _userAdded?: boolean;
  isVideo?: boolean;
}

export interface SponsorSegment {
  category: string;
  start: number;
  end: number;
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricLine[];
  plainText?: string;
  source?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  trackCount?: number;
  songs: Song[];
  createdAt: number;
  updatedAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';
