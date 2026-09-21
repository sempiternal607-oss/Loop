import { Song, ShuffleContext } from './types';
import { isNonMusicContent } from '@/lib/ytmusic';

export interface CandidatePoolResult {
  candidates: Song[];
  radioIndexMap: Map<string, number>;
}

/**
 * Fetches radio recommendations for a seed track from the /api/next endpoint
 */
async function fetchRadioEndpoint(videoId: string): Promise<Song[]> {
  try {
    const res = await fetch(`/api/next?videoId=${videoId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.queue)) {
        return data.queue;
      }
    }
  } catch (err) {
    console.warn('[Shuffle Candidates] Failed to fetch radio from /api/next:', err);
  }
  return [];
}

/**
 * Gathers, deduplicates, and filters potential shuffle candidates
 */
export async function getCandidateSongs(
  context: ShuffleContext,
  fetchRadioFn?: (song: Song) => Promise<Song[]>
): Promise<CandidatePoolResult> {
  const { currentSong, currentQueue, session, config } = context;
  const radioIndexMap = new Map<string, number>();

  // 1. Fetch Radio Pool for Current Track (YouTube Music Algorithmic Radio RDAMVM)
  let radioSongs: Song[] = [];
  try {
    if (fetchRadioFn) {
      radioSongs = await fetchRadioFn(currentSong);
    } else if (typeof window !== 'undefined') {
      radioSongs = await fetchRadioEndpoint(currentSong.videoId);
    }
  } catch (err) {
    console.warn('[Shuffle Candidates] Radio fetch error:', err);
  }

  // Record radio index (YouTube Music rank indicates correlation confidence)
  radioSongs.forEach((song, idx) => {
    radioIndexMap.set(song.videoId, idx);
  });

  // 2. Aggregate all candidate sources
  // Source Priority: Radio (contextual similarity) + Current Queue (user intent)
  const combinedRaw: Song[] = [
    ...radioSongs,
    ...currentQueue,
  ];

  // 3. Deduplicate by videoId
  const uniqueMap = new Map<string, Song>();
  for (const song of combinedRaw) {
    if (song && song.videoId && !uniqueMap.has(song.videoId)) {
      uniqueMap.set(song.videoId, song);
    }
  }

  // 4. Basic content filters (Non-music, podcasts, CEO drama, full albums, seed song)
  const validCandidates: Song[] = [];
  for (const song of uniqueMap.values()) {
    // Cannot be the currently playing song
    if (song.videoId === currentSong.videoId) {
      continue;
    }

    // Must have title and artist
    if (!song.title || !song.artist) {
      continue;
    }

    // Filter non-music or long compilation/story audio
    const duration = song.duration || 0;
    if (isNonMusicContent(song.title, song.artist, undefined, duration)) {
      continue;
    }

    // Extra safeguard against long full albums (> 15 mins / 900s)
    if (duration > 900) {
      continue;
    }

    validCandidates.push(song);
  }

  // 5. Cooldown filter against recently played tracks in current shuffle session
  const recentHistoryWindow = session.history
    .slice(-config.recentHistoryCooldown)
    .map((s) => s.videoId);
  const recentHistorySet = new Set(recentHistoryWindow);

  let filtered = validCandidates.filter((s) => !recentHistorySet.has(s.videoId));

  // 6. Graceful degradation for small queues / libraries
  // If cooldown filter left us with fewer than 3 songs, relax cooldown to avoid freezing
  if (filtered.length < 3 && validCandidates.length > 0) {
    // Only exclude the absolute last song played
    const lastPlayedId = session.history[session.history.length - 1]?.videoId;
    filtered = validCandidates.filter((s) => s.videoId !== lastPlayedId);
    if (filtered.length === 0) {
      filtered = validCandidates;
    }
  }

  return {
    candidates: filtered,
    radioIndexMap,
  };
}
