import {
  Song,
  UserTasteProfile,
  ShuffleSession,
  ShuffleContext,
  BuildShuffleContextInput,
  SkipRecord,
  ArtistAffinity,
  TagAffinity,
  DEFAULT_SHUFFLE_CONFIG,
} from './types';

export const SKIPS_STORAGE_KEY = 'loop_skips';

/**
 * Common music tags, genres, and mood descriptors used for lexical taste detection
 */
const KNOWN_TAGS = [
  'acoustic', 'lofi', 'chill', 'mellow', 'slowed', 'ballad', 'sad', 'galau',
  'pop', 'indie', 'rock', 'alternative', 'metal', 'punk',
  'r&b', 'soul', 'hip hop', 'hiphop', 'rap',
  'jazz', 'blues', 'folk', 'country',
  'dangdut', 'koplo', 'campursari', 'melayu',
  'electronic', 'edm', 'dance', 'house', 'techno',
  'k-pop', 'kpop', 'j-pop', 'jpop', 'anime', 'ost', 'soundtrack',
  'remix', 'live', 'unplugged', 'cover', 'instrumental'
];

/**
 * Extracts recognized mood/genre tags from a song's title, artist, and metadata
 */
export function extractSongTags(song: Song): string[] {
  const text = `${song.title} ${song.artist} ${song.album || ''}`.toLowerCase();
  const tags: string[] = [];
  for (const tag of KNOWN_TAGS) {
    // Word boundary or containment check
    const regex = new RegExp(`\\b${tag.replace('-', '[-\\s]?')}\\b`, 'i');
    if (regex.test(text)) {
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * Normalizes artist name for consistent comparison and aggregation
 */
export function normalizeArtistName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s*(feat\.?|ft\.?|featuring|with|x|&|,|\/)\s*.*$/i, '')
    .trim();
}

/**
 * Retrieves recorded track skips from localStorage (client-side safe)
 */
export function getStoredSkips(): SkipRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SKIPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Keep only skips within the last 14 days
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      return parsed.filter((r: SkipRecord) => r.skippedAt >= twoWeeksAgo);
    }
  } catch (e) {
    console.error('[Shuffle] Failed to read skips from storage', e);
  }
  return [];
}

/**
 * Records a track skip when playback duration was < 25 seconds
 */
export function recordSkip(videoId: string, artist: string, playDuration: number): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredSkips();
    const newRecord: SkipRecord = {
      videoId,
      artist: normalizeArtistName(artist),
      skippedAt: Date.now(),
      playDuration: Math.round(playDuration),
    };
    // Keep max 50 recent skips
    const updated = [newRecord, ...existing.filter((s) => s.videoId !== videoId)].slice(0, 50);
    localStorage.setItem(SKIPS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('[Shuffle] Failed to record skip', e);
  }
}

/**
 * Builds the UserTasteProfile by analyzing history, favorites, and skip patterns
 */
export function buildUserTasteProfile(
  history: Song[] = [],
  favorites: Song[] = [],
  skips: SkipRecord[] = []
): UserTasteProfile {
  const artistCounts = new Map<string, { name: string; count: number; weight: number }>();
  const tagCounts = new Map<string, number>();
  const likedSongIds = new Set<string>();

  // Process favorites (high weight: 3x)
  for (const song of favorites) {
    likedSongIds.add(song.videoId);
    const norm = normalizeArtistName(song.artist);
    if (norm) {
      const cur = artistCounts.get(norm) || { name: song.artist, count: 0, weight: 0 };
      cur.count += 3;
      artistCounts.set(norm, cur);
    }
    const tags = extractSongTags(song);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 3);
    }
  }

  // Process history (standard weight: 1x, recent items count more)
  const historyLen = history.length;
  history.forEach((song, idx) => {
    const recencyMultiplier = 1 + (historyLen - idx) / Math.max(1, historyLen);
    const norm = normalizeArtistName(song.artist);
    if (norm) {
      const cur = artistCounts.get(norm) || { name: song.artist, count: 0, weight: 0 };
      cur.count += 1 * recencyMultiplier;
      artistCounts.set(norm, cur);
    }
    const tags = extractSongTags(song);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1 * recencyMultiplier);
    }
  });

  // Calculate top artists with normalized weights (0.0 - 1.0)
  const sortedArtists = Array.from(artistCounts.values()).sort((a, b) => b.count - a.count);
  const maxArtistCount = sortedArtists[0]?.count || 1;
  const topArtists: ArtistAffinity[] = sortedArtists.slice(0, 30).map((a) => ({
    name: a.name,
    weight: Math.min(1.0, Math.max(0.1, a.count / maxArtistCount)),
    count: Math.round(a.count),
  }));

  // Calculate preferred tags
  const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);
  const maxTagCount = sortedTags[0]?.[1] || 1;
  const preferredGenres: TagAffinity[] = sortedTags.slice(0, 20).map(([tag, count]) => ({
    name: tag,
    weight: Math.min(1.0, count / maxTagCount),
  }));

  return {
    topArtists,
    preferredGenres,
    preferredMoods: preferredGenres,
    likedSongIds,
    recentlyPlayedSongIds: history.map((s) => s.videoId),
    skipHistory: skips,
    lastUpdated: Date.now(),
  };
}

/**
 * Generates or initializes a ShuffleSession
 */
export function createShuffleSession(
  currentSong: Song,
  originalQueue: Song[] = []
): ShuffleSession {
  const normArtist = normalizeArtistName(currentSong.artist);
  return {
    id: `shuffle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    currentSong,
    history: [currentSong],
    historyIndex: 0,
    futureQueue: [],
    originalQueue,
    playedArtistCounts: normArtist ? { [normArtist]: 1 } : {},
    recentArtists: normArtist ? [normArtist] : [],
    lastPlayedTimestamp: Date.now(),
  };
}

/**
 * Builds the comprehensive ShuffleContext required by the scoring and selection engines
 */
export function buildShuffleContext(input: BuildShuffleContextInput): ShuffleContext {
  const history = input.history || [];
  const favorites = input.favorites || [];
  const skips = input.skips || getStoredSkips();

  const userProfile = buildUserTasteProfile(history, favorites, skips);
  const session = input.session || createShuffleSession(input.currentSong, input.currentQueue || []);
  const config = { ...DEFAULT_SHUFFLE_CONFIG, ...(input.config || {}) };

  return {
    currentSong: input.currentSong,
    session,
    userProfile,
    currentQueue: input.currentQueue || [],
    config,
  };
}
