import {
  Song,
  ShuffleSession,
  ShuffleContext,
  ShuffleCandidate,
} from './types';
import { createShuffleSession, normalizeArtistName } from './tasteProfile';
import { isNonMusicContent } from '@/lib/ytmusic';
import { getCandidateSongs } from './candidates';
import { scoreCandidate } from './scoring';
import { selectWeightedCandidates } from './selection';

export class SmartShuffleService {
  private session: ShuffleSession | null = null;
  private candidateCache = new Map<string, ShuffleCandidate[]>();
  private isPrefetching = false;
  private currentRequestId = 0;

  /**
   * Initializes or resets the smart shuffle session
   */
  public initializeSession(currentSong: Song, currentQueue: Song[] = []): ShuffleSession {
    this.session = createShuffleSession(currentSong, currentQueue);
    this.candidateCache.clear();
    this.currentRequestId++;
    return this.session;
  }

  /**
   * Returns the active session if one exists
   */
  public getSession(): ShuffleSession | null {
    return this.session;
  }

  /**
   * Cleans up the active session when shuffle is turned OFF
   */
  public clearSession(): void {
    this.session = null;
    this.candidateCache.clear();
    this.isPrefetching = false;
    this.currentRequestId++;
  }

  /**
   * Generates a batch of scored and weighted smart candidates
   */
  public async generateSmartQueue(
    context: ShuffleContext,
    count: number = 5,
    fetchRadioFn?: (song: Song) => Promise<Song[]>
  ): Promise<ShuffleCandidate[]> {
    const { candidates, radioIndexMap } = await getCandidateSongs(context, fetchRadioFn);

    if (candidates.length === 0) {
      return [];
    }

    // Score all candidates
    const scoredCandidates = candidates.map((cand) =>
      scoreCandidate(cand, context, radioIndexMap.get(cand.videoId))
    );

    // Filter out candidates with near-zero final score (unfit)
    const viableCandidates = scoredCandidates.filter((c) => c.finalScore > 0.01);
    const pool = viableCandidates.length > 0 ? viableCandidates : scoredCandidates;

    // Select candidates using temperature-weighted sampling
    const selected = selectWeightedCandidates(pool, count, context.config.temperature);

    // Cache the candidates for this seed
    this.candidateCache.set(context.currentSong.videoId, selected);

    return selected;
  }

  /**
   * Smartly re-orders a pool of candidate songs (e.g. upcoming queue)
   * using the smart contextual shuffle scoring and weighted selection.
   *
   * Bounded mode (isBounded: true):
   *  - NEVER injects radio tracks: only user's own songs are used
   *  - Long songs (>15min, e.g. mixes/live compilations in a playlist) are kept
   *  - ALL candidate songs are returned — nothing from the user's playlist is dropped
   */
  public async generateSmartQueueFromCandidates(
    context: ShuffleContext,
    candidateSongs: Song[],
    fetchRadioFn?: (song: Song) => Promise<Song[]>,
    options?: { isBounded?: boolean }
  ): Promise<Song[]> {
    const { currentSong } = context;
    const isBounded = options?.isBounded ?? false;
    const uniqueMap = new Map<string, Song>();

    // 1. Add provided candidate songs
    for (const s of candidateSongs) {
      if (s && s.videoId && s.videoId !== currentSong.videoId) {
        uniqueMap.set(s.videoId, s);
      }
    }

    // 2. Radio enrichment — unbounded only, and only when the user's own pool is small
    const radioIndexMap = new Map<string, number>();
    if (!isBounded && uniqueMap.size < 10 && fetchRadioFn) {
      try {
        const radioSongs = await fetchRadioFn(currentSong);
        radioSongs.forEach((s, idx) => {
          if (s && s.videoId && s.videoId !== currentSong.videoId) {
            radioIndexMap.set(s.videoId, idx);
            if (!uniqueMap.has(s.videoId)) {
              uniqueMap.set(s.videoId, s);
            }
          }
        });
      } catch (err) {
        console.warn('[Shuffle] Failed to fetch radio candidates:', err);
      }
    }

    // 3. Content filters
    //    - Bounded: keep every user song, no duration cap
    //    - Unbounded: drop non-music content and >15min compilations
    const validSongs: Song[] = [];
    for (const song of uniqueMap.values()) {
      if (!isBounded) {
        const dur = song.duration || 0;
        if (dur > 900) continue;
        if (
          typeof window !== 'undefined' &&
          isNonMusicContent(song.title, song.artist, undefined, dur)
        ) {
          continue;
        }
      }
      validSongs.push(song);
    }

    if (validSongs.length === 0) {
      return [];
    }

    // 4. Score all candidates against currentSong & user taste profile
    const scoredCandidates = validSongs.map((cand) =>
      scoreCandidate(cand, context, radioIndexMap.get(cand.videoId))
    );

    // 5. Select and order candidates using weighted probabilistic sampling.
    //    Bounded mode must return every user song exactly once (a real shuffle of
    //    the playlist); unbounded mode caps the queue as before.
    const countToSelect = isBounded ? validSongs.length : Math.min(validSongs.length, 50);
    const selected = selectWeightedCandidates(
      scoredCandidates,
      countToSelect,
      context.config.temperature
    );

    return selected.map((c) => c.song);
  }

  /**
   * Generates additional smart recommendations to append to the end of the queue
   */
  public async generateSmartUpcoming(
    context: ShuffleContext,
    fetchRadioFn?: (song: Song) => Promise<Song[]>,
    count: number = 10
  ): Promise<Song[]> {
    const candidates = await this.generateSmartQueue(context, count, fetchRadioFn);
    return candidates.map((c) => c.song);
  }

  /**
   * Retrieves the next song to play.
   * Uses pre-buffered tracks when available, otherwise calculates on demand.
   * Guaranteed concurrency safety via request IDs.
   */
  public async getNextSong(
    context: ShuffleContext,
    fetchRadioFn?: (song: Song) => Promise<Song[]>
  ): Promise<{ song: Song | null; candidate?: ShuffleCandidate }> {
    const requestId = ++this.currentRequestId;

    if (!this.session) {
      this.session = context.session;
    }

    // Check if the user had stepped backward and is now moving forward through existing history
    if (this.session.historyIndex < this.session.history.length - 1) {
      this.session.historyIndex++;
      const replaySong = this.session.history[this.session.historyIndex];
      this.session.currentSong = replaySong;
      this.session.lastPlayedTimestamp = Date.now();
      return { song: replaySong };
    }

    let nextCandidate: ShuffleCandidate | undefined;

    // 1. Check if futureQueue has precomputed tracks
    if (this.session.futureQueue.length > 0) {
      const popped = this.session.futureQueue.shift();
      if (popped) {
        // Find corresponding candidate for score logging
        const cached = this.candidateCache.get(context.currentSong.videoId) || [];
        nextCandidate = cached.find((c) => c.song.videoId === popped.videoId);
        if (!nextCandidate) {
          nextCandidate = scoreCandidate(popped, context);
        }
      }
    }

    // 2. If futureQueue was empty, generate candidates on demand
    if (!nextCandidate) {
      const generated = await this.generateSmartQueue(context, context.config.prefetchCount, fetchRadioFn);

      // Guard against stale requests if user clicked Next multiple times in rapid succession
      if (requestId !== this.currentRequestId) {
        return { song: null };
      }

      if (generated.length > 0) {
        nextCandidate = generated[0];
        // Enqueue remaining generated tracks into futureQueue
        this.session.futureQueue = generated.slice(1).map((c) => c.song);
      }
    }

    if (!nextCandidate) {
      return { song: null };
    }

    const chosenSong = nextCandidate.song;

    // 3. Update session state
    this.session.history.push(chosenSong);
    this.session.historyIndex = this.session.history.length - 1;
    this.session.currentSong = chosenSong;
    this.session.lastPlayedTimestamp = Date.now();

    const artistNorm = normalizeArtistName(chosenSong.artist);
    if (artistNorm) {
      this.session.playedArtistCounts[artistNorm] = (this.session.playedArtistCounts[artistNorm] || 0) + 1;
      this.session.recentArtists = [...this.session.recentArtists, artistNorm].slice(-6);
    }

    // 4. Log decision for transparency and debugging
    this.logShuffleDecision(context.currentSong, chosenSong, nextCandidate);

    // 5. Trigger asynchronous prefetch to replenish futureQueue
    this.triggerPrefetch(
      { ...context, currentSong: chosenSong, session: this.session },
      fetchRadioFn
    );

    return { song: chosenSong, candidate: nextCandidate };
  }

  /**
   * Deterministically steps backward through the shuffle session history.
   * [A, B, C, D] -> backwards is D -> C -> B -> A. Never picks a random song.
   */
  public getPreviousSong(): Song | null {
    if (!this.session || this.session.history.length === 0) {
      return null;
    }

    if (this.session.historyIndex > 0) {
      this.session.historyIndex--;
      const prevSong = this.session.history[this.session.historyIndex];
      this.session.currentSong = prevSong;
      this.session.lastPlayedTimestamp = Date.now();
      return prevSong;
    }

    return null;
  }

  /**
   * Background prefetch worker keeping futureQueue topped up with next tracks
   */
  private async triggerPrefetch(
    context: ShuffleContext,
    fetchRadioFn?: (song: Song) => Promise<Song[]>
  ): Promise<void> {
    if (this.isPrefetching || (this.session && this.session.futureQueue.length >= 3)) {
      return;
    }

    this.isPrefetching = true;
    try {
      const candidates = await this.generateSmartQueue(
        context,
        context.config.prefetchCount,
        fetchRadioFn
      );
      if (this.session && candidates.length > 0) {
        const existingIds = new Set(this.session.futureQueue.map((s) => s.videoId));
        const newSongs = candidates
          .map((c) => c.song)
          .filter((s) => !existingIds.has(s.videoId) && s.videoId !== context.currentSong.videoId);
        this.session.futureQueue.push(...newSongs);
      }
    } catch (err) {
      console.warn('[Shuffle Prefetch] Prefetch error:', err);
    } finally {
      this.isPrefetching = false;
    }
  }

  /**
   * Formatted console logger detailing shuffle decision metrics
   */
  private logShuffleDecision(
    seed: Song,
    chosen: Song,
    candidate?: ShuffleCandidate
  ): void {
    const scoreStr = candidate ? candidate.finalScore.toFixed(3) : 'N/A';
    const breakdown = candidate?.breakdown;

    console.log(
      `%c[Loop Smart Shuffle]%c Seed: "${seed.title}" (${seed.artist}) -> Picked: "${chosen.title}" (${chosen.artist}) [Score: ${scoreStr}]`,
      'color: #10b981; font-weight: bold;',
      'color: inherit;'
    );

    if (breakdown) {
      console.log(
        `  ↳ Breakdown: Sim=${candidate.similarityScore.toFixed(2)} (Radio=${breakdown.radioCloseness.toFixed(2)}, LangMatch=${breakdown.languageMatch.toFixed(2)}, TagSim=${breakdown.genreSimilarity.toFixed(2)}) | Pers=${candidate.personalizationScore.toFixed(2)} (FavBoost=${breakdown.userLikedBoost}, SkipPenalty=${breakdown.skipPenalty}) | Div=${candidate.diversityScore.toFixed(2)} (ArtistFatigue=${breakdown.artistFatiguePenalty.toFixed(2)}) | HistPenalty=${candidate.historyPenalty.toFixed(2)}`
      );
    }
  }
}

export const smartShuffleService = new SmartShuffleService();
