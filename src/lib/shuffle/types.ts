import { Song, Artist } from '@/types/music';

export type { Song, Artist };

export interface ExtendedSongMetadata {
  genre?: string | string[];
  subgenre?: string;
  mood?: string | string[];
  tags?: string[];
  language?: string;
  releaseYear?: number;
  bpm?: number;
  energy?: number;
  danceability?: number;
  acousticness?: number;
  popularity?: number;
}

export interface SkipRecord {
  videoId: string;
  artist: string;
  skippedAt: number;
  playDuration: number;
}

export interface ArtistAffinity {
  name: string;
  weight: number; // 0.0 - 1.0
  count: number;
}

export interface TagAffinity {
  name: string;
  weight: number; // 0.0 - 1.0
}

export interface UserTasteProfile {
  userId?: string;
  topArtists: ArtistAffinity[];
  preferredGenres: TagAffinity[];
  preferredMoods: TagAffinity[];
  likedSongIds: Set<string>;
  recentlyPlayedSongIds: string[];
  skipHistory: SkipRecord[];
  lastUpdated: number;
}

export interface ScoreBreakdown {
  artistSimilarity: number;
  genreSimilarity: number;
  moodSimilarity: number;
  languageMatch: number;
  acousticMatch: number;
  radioCloseness: number;
  userLikedBoost: number;
  frequentArtistBoost: number;
  skipPenalty: number;
  artistFatiguePenalty: number;
  albumFatiguePenalty: number;
  recencyPenalty: number;
}

export interface ShuffleCandidate {
  song: Song;
  similarityScore: number;
  personalizationScore: number;
  diversityScore: number;
  transitionScore: number;
  historyPenalty: number;
  finalScore: number;
  breakdown: ScoreBreakdown;
  radioIndex?: number;
}

export interface ShuffleConfig {
  similarityWeight: number;      // default: 0.40
  personalizationWeight: number;  // default: 0.25
  diversityWeight: number;        // default: 0.20
  transitionWeight: number;       // default: 0.15
  temperature: number;            // default: 0.65 (sampling temperature)
  prefetchCount: number;          // default: 5 (pre-buffered tracks)
  artistFatigueThreshold: number; // default: 2 (penalize if artist played >= 2 times in recent window)
  recentHistoryCooldown: number;  // default: 10 (cooldown window in session history)
}

export const DEFAULT_SHUFFLE_CONFIG: ShuffleConfig = {
  similarityWeight: 0.40,
  personalizationWeight: 0.25,
  diversityWeight: 0.20,
  transitionWeight: 0.15,
  temperature: 0.65,
  prefetchCount: 5,
  artistFatigueThreshold: 2,
  recentHistoryCooldown: 10,
};

export interface ShuffleSession {
  id: string;
  currentSong: Song | null;
  history: Song[];                // Backward trajectory for Back button: [A, B, C, D]
  historyIndex: number;           // Pointer to current song in history
  futureQueue: Song[];            // Pre-computed smart queue
  originalQueue: Song[];          // Snapshot of un-shuffled queue before shuffle was turned ON
  playedArtistCounts: Record<string, number>;
  recentArtists: string[];        // Rolling window of last 6 artists
  lastPlayedTimestamp: number;
}

export interface ShuffleContext {
  currentSong: Song;
  session: ShuffleSession;
  userProfile: UserTasteProfile;
  currentQueue: Song[];
  sourceContext?: 'playlist' | 'album' | 'search' | 'radio' | 'favorites';
  config: ShuffleConfig;
}

export interface BuildShuffleContextInput {
  currentSong: Song;
  session?: ShuffleSession;
  history?: Song[];
  favorites?: Song[];
  skips?: SkipRecord[];
  currentQueue?: Song[];
  config?: Partial<ShuffleConfig>;
}
