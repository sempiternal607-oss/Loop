import {
  Song,
  ShuffleContext,
  ShuffleCandidate,
  ScoreBreakdown,
} from './types';
import { extractSongTags, normalizeArtistName } from './tasteProfile';

/**
 * Language and cultural cluster categorization for preventing whiplash
 * (e.g. Coldplay Yellow -> Dangdut Koplo)
 */
export type MusicLanguageCluster = 'dangdut' | 'indonesian_pop' | 'western' | 'kpop' | 'jpop' | 'other';

const DANGDUT_KEYWORDS = [
  'dangdut', 'koplo', 'campursari', 'kendang', 'pantura', 'om adella', 'new pallapa',
  'ageng music', 'monata', 'goyang', 'bojo', 'cidro', 'tresno', 'loro', 'teteg',
  'runtah', 'joko tingkir', 'sambel terasi', 'nunggu', 'kelangan', 'sawer',
  'denny caknan', 'happy asmara', 'guyon waton', 'ndarboy genk', 'vita alvia', 'difarina indra'
];

const INDO_KEYWORDS = [
  'cinta', 'hati', 'kau', 'hilang', 'janji', 'bersama', 'menunggu', 'kembali',
  'selamat', 'luka', 'kenangan', 'rindu', 'mungkin', 'tentang', 'bintang',
  'rumah', 'senja', 'diri', 'hujan', 'kisah', 'rasa', 'terakhir', 'sempurna',
  'tulus', 'hivi', 'sheila on 7', 'dewa 19', 'noah', 'peterpan', 'judika', 'raisa',
  'afgan', 'mahalini', 'tiara andini', 'lyodra', 'ziva magnolya', 'fiersa besari', 'pamungkas',
  'nadin amizah', 'hindia', 'feast', 'fourtwnty', 'payung teduh'
];

const ENGLISH_KEYWORDS = [
  'the', 'and', 'with', 'you', 'love', 'heart', 'night', 'baby', 'don\'t', 'never',
  'again', 'cold', 'sun', 'time', 'world', 'dream', 'life', 'stay', 'alone', 'fall',
  'coldplay', 'ed sheeran', 'taylor swift', 'bruno mars', 'keane', 'adele', 'maroon 5',
  'billie eilish', 'the weeknd', 'dua lipa', 'oasis', 'radiohead', 'snow patrol'
];

export function detectLanguageCluster(song: Song): MusicLanguageCluster {
  const text = `${song.title} ${song.artist} ${song.album || ''}`.toLowerCase();

  // 1. Check Dangdut / Koplo markers first
  for (const kw of DANGDUT_KEYWORDS) {
    if (text.includes(kw)) return 'dangdut';
  }

  // 2. Check K-Pop (Hangul or famous idols)
  if (/[\uac00-\ud7a3]/.test(text) || /\b(bts|blackpink|twice|aespa|newjeans|stray kids|exo|nct|seventeen)\b/i.test(text)) {
    return 'kpop';
  }

  // 3. Check J-Pop / Anime (Hiragana/Katakana or anime tags)
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text) || /\b(anime|yoasobi|radwimps|kenshi yonezu|aimer|lisa)\b/i.test(text)) {
    return 'jpop';
  }

  // 4. Check Indonesian Pop
  for (const kw of INDO_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text)) return 'indonesian_pop';
  }

  // 5. Check Western / English
  for (const kw of ENGLISH_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text)) return 'western';
  }

  return 'other';
}

/**
 * Calculates language and cultural match between current song and candidate
 */
export function calculateLanguageMatch(currentSong: Song, candidate: Song): number {
  const currCluster = detectLanguageCluster(currentSong);
  const candCluster = detectLanguageCluster(candidate);

  // Exact cluster match
  if (currCluster === candCluster && currCluster !== 'other') {
    return 1.0;
  }

  // Severe mismatch penalty: Dangdut vs Western / Coldplay / Melo
  if (
    (currCluster === 'western' && candCluster === 'dangdut') ||
    (currCluster === 'dangdut' && candCluster === 'western')
  ) {
    return 0.05; // 95% penalty prevents Coldplay -> Dangdut whiplash!
  }

  // Moderate mismatch: Indonesian Pop vs Dangdut
  if (
    (currCluster === 'indonesian_pop' && candCluster === 'dangdut') ||
    (currCluster === 'dangdut' && candCluster === 'indonesian_pop')
  ) {
    return 0.25;
  }

  // Western vs K-Pop / J-Pop (compatible modern pop)
  if (
    (currCluster === 'western' && (candCluster === 'kpop' || candCluster === 'jpop')) ||
    (candCluster === 'western' && (currCluster === 'kpop' || currCluster === 'jpop'))
  ) {
    return 0.65;
  }

  // Indonesian Pop vs Western (common listening pairing)
  if (
    (currCluster === 'indonesian_pop' && candCluster === 'western') ||
    (currCluster === 'western' && candCluster === 'indonesian_pop')
  ) {
    return 0.70;
  }

  return 0.75;
}

/**
 * Evaluates musical similarity between the candidate and current song
 */
export function calculateSimilarityScore(
  candidate: Song,
  currentSong: Song,
  radioIndex?: number
): { score: number; breakdown: Partial<ScoreBreakdown> } {
  const currArtistNorm = normalizeArtistName(currentSong.artist);
  const candArtistNorm = normalizeArtistName(candidate.artist);

  // 1. Artist similarity
  let artistSimilarity = 0.0;
  if (currArtistNorm && candArtistNorm) {
    if (currArtistNorm === candArtistNorm) {
      artistSimilarity = 0.85; // High similarity (diversity filter handles anti-repetition)
    } else if (
      currentSong.artist.toLowerCase().includes(candArtistNorm) ||
      candidate.artist.toLowerCase().includes(currArtistNorm)
    ) {
      artistSimilarity = 0.60;
    }
  }

  // 2. Radio correlation confidence (from YouTube Music's RDAMVM ranking)
  let radioCloseness = 0.35; // Baseline if not in radio
  if (typeof radioIndex === 'number' && radioIndex >= 0) {
    // Top recommendation has radioCloseness = 1.0, decaying gradually
    radioCloseness = Math.max(0.3, 1.0 - (radioIndex / 40) * 0.7);
  }

  // 3. Genre and Mood tag similarity
  const currTags = extractSongTags(currentSong);
  const candTags = extractSongTags(candidate);
  let genreSimilarity = 0.5;
  let moodSimilarity = 0.5;

  if (currTags.length > 0 && candTags.length > 0) {
    const intersection = currTags.filter((t) => candTags.includes(t));
    const union = Array.from(new Set([...currTags, ...candTags]));
    const jaccard = union.length > 0 ? intersection.length / union.length : 0;
    genreSimilarity = Math.min(1.0, 0.4 + jaccard * 0.6);
    moodSimilarity = genreSimilarity;
  }

  // 4. Language / Cultural similarity
  const languageMatch = calculateLanguageMatch(currentSong, candidate);

  // 5. Acoustic / Production match
  let acousticMatch = 0.75;
  const isCurrAcoustic = currTags.some((t) => ['acoustic', 'unplugged', 'cover', 'piano'].includes(t));
  const isCandAcoustic = candTags.some((t) => ['acoustic', 'unplugged', 'cover', 'piano'].includes(t));
  const isCurrEdm = currTags.some((t) => ['remix', 'edm', 'club', 'techno', 'house'].includes(t));
  const isCandEdm = candTags.some((t) => ['remix', 'edm', 'club', 'techno', 'house'].includes(t));

  if (isCurrAcoustic && isCandAcoustic) acousticMatch = 1.0;
  else if (isCurrAcoustic && isCandEdm) acousticMatch = 0.15;
  else if (isCurrEdm && isCandEdm) acousticMatch = 1.0;
  else if (isCurrEdm && isCandAcoustic) acousticMatch = 0.15;

  // Weighted combination for similarity (Sum of weights = 1.0)
  // Weights: radioCloseness (0.35), languageMatch (0.25), artistSimilarity (0.15), genreSimilarity (0.15), acousticMatch (0.10)
  const score =
    radioCloseness * 0.35 +
    languageMatch * 0.25 +
    artistSimilarity * 0.15 +
    genreSimilarity * 0.15 +
    acousticMatch * 0.10;

  return {
    score: Math.min(1.0, Math.max(0.0, score)),
    breakdown: {
      artistSimilarity,
      radioCloseness,
      genreSimilarity,
      moodSimilarity,
      languageMatch,
      acousticMatch,
    },
  };
}

/**
 * Evaluates personalization score based on user profile (favorites, top artists, skips)
 */
export function calculatePersonalizationScore(
  candidate: Song,
  context: ShuffleContext
): { score: number; breakdown: Partial<ScoreBreakdown> } {
  const { userProfile } = context;
  const candArtistNorm = normalizeArtistName(candidate.artist);

  // Base neutral score
  let baseScore = 0.50;

  // 1. User Liked / Favorite Boost (+0.35)
  let userLikedBoost = 0;
  if (userProfile.likedSongIds.has(candidate.videoId)) {
    userLikedBoost = 0.35;
  }

  // 2. User Frequent Artist Boost (up to +0.30)
  let frequentArtistBoost = 0;
  if (candArtistNorm) {
    const affinity = userProfile.topArtists.find(
      (a) => normalizeArtistName(a.name) === candArtistNorm
    );
    if (affinity) {
      frequentArtistBoost = affinity.weight * 0.30;
    }
  }

  // 3. Skip Penalty (Penalize songs or artists that user frequently skipped <25s)
  let skipPenalty = 0;
  const isExactSongSkipped = userProfile.skipHistory.some((s) => s.videoId === candidate.videoId);
  if (isExactSongSkipped) {
    skipPenalty += 0.45;
  }
  const isArtistSkipped = userProfile.skipHistory.some(
    (s) => s.artist && s.artist === candArtistNorm
  );
  if (isArtistSkipped) {
    skipPenalty += 0.20;
  }

  const finalScore = Math.min(1.0, Math.max(0.05, baseScore + userLikedBoost + frequentArtistBoost - skipPenalty));

  return {
    score: finalScore,
    breakdown: {
      userLikedBoost,
      frequentArtistBoost,
      skipPenalty,
    },
  };
}

/**
 * Evaluates diversity and anti-fatigue (prevents 5 songs of the same artist or album in a row)
 */
export function calculateDiversityScore(
  candidate: Song,
  context: ShuffleContext
): { score: number; breakdown: Partial<ScoreBreakdown> } {
  const { session, currentSong } = context;
  const candArtistNorm = normalizeArtistName(candidate.artist);
  const currArtistNorm = normalizeArtistName(currentSong.artist);

  let artistFatiguePenalty = 0;
  let albumFatiguePenalty = 0;

  // Consecutive same-artist fatigue
  if (candArtistNorm && currArtistNorm && candArtistNorm === currArtistNorm) {
    artistFatiguePenalty += 0.70; // High penalty for playing same artist back-to-back
  }

  // Check recent artist streak in session
  const recentWindow = session.recentArtists.slice(-4);
  const occurrences = recentWindow.filter((a) => a === candArtistNorm).length;
  if (occurrences >= 2) {
    artistFatiguePenalty += 0.50;
  } else if (occurrences === 1) {
    artistFatiguePenalty += 0.20;
  }

  // Album fatigue: Avoid back-to-back same album unless user is intentionally playing an album
  if (
    candidate.album &&
    currentSong.album &&
    candidate.album.toLowerCase() === currentSong.album.toLowerCase()
  ) {
    albumFatiguePenalty += 0.30;
  }

  const score = Math.max(0.05, 1.0 - (artistFatiguePenalty * 0.75 + albumFatiguePenalty * 0.25));

  return {
    score: Math.min(1.0, score),
    breakdown: {
      artistFatiguePenalty,
      albumFatiguePenalty,
    },
  };
}

/**
 * Evaluates transition smoothness (duration consistency and tempo jump prevention)
 */
export function calculateTransitionScore(candidate: Song, currentSong: Song): number {
  let score = 0.85; // Baseline high for smooth transitions

  const currDur = currentSong.duration || 0;
  const candDur = candidate.duration || 0;

  // Extreme duration jump penalty (e.g. 2 min interlude to 12 min prog-rock)
  if (currDur > 0 && candDur > 0) {
    const diff = Math.abs(currDur - candDur);
    if (diff > 300) {
      score -= 0.20;
    }
  }

  return Math.min(1.0, Math.max(0.2, score));
}

/**
 * Calculates cooldown penalty for songs recently played in this shuffle session
 */
export function calculateHistoryPenalty(candidate: Song, session: ShuffleContext['session']): { penalty: number; recencyPenalty: number } {
  const history = session.history;
  const histLen = history.length;
  const lastIndex = history.map((s) => s.videoId).lastIndexOf(candidate.videoId);

  if (lastIndex === -1) {
    return { penalty: 1.0, recencyPenalty: 0.0 };
  }

  // Distance from current position (1 = immediately previous)
  const stepsAgo = histLen - lastIndex;

  if (stepsAgo <= 1) {
    return { penalty: 0.01, recencyPenalty: 0.99 }; // Cannot repeat the song that just played
  }
  if (stepsAgo <= 3) {
    return { penalty: 0.10, recencyPenalty: 0.90 };
  }
  if (stepsAgo <= 6) {
    return { penalty: 0.40, recencyPenalty: 0.60 };
  }
  if (stepsAgo <= 10) {
    return { penalty: 0.75, recencyPenalty: 0.25 };
  }

  return { penalty: 0.95, recencyPenalty: 0.05 };
}

/**
 * Computes the composite score and detailed breakdown for a candidate
 */
export function scoreCandidate(
  candidate: Song,
  context: ShuffleContext,
  radioIndex?: number
): ShuffleCandidate {
  const { config } = context;

  const simResult = calculateSimilarityScore(candidate, context.currentSong, radioIndex);
  const persResult = calculatePersonalizationScore(candidate, context);
  const divResult = calculateDiversityScore(candidate, context);
  const transitionScore = calculateTransitionScore(candidate, context.currentSong);
  const { penalty: historyPenalty, recencyPenalty } = calculateHistoryPenalty(candidate, context.session);

  // Normalize configured weights
  const totalWeight =
    config.similarityWeight +
    config.personalizationWeight +
    config.diversityWeight +
    config.transitionWeight;

  const wSim = config.similarityWeight / totalWeight;
  const wPers = config.personalizationWeight / totalWeight;
  const wDiv = config.diversityWeight / totalWeight;
  const wTrans = config.transitionWeight / totalWeight;

  const rawScore =
    simResult.score * wSim +
    persResult.score * wPers +
    divResult.score * wDiv +
    transitionScore * wTrans;

  // Apply history cooldown multiplier
  const finalScore = Math.min(1.0, Math.max(0.001, rawScore * historyPenalty));

  const breakdown: ScoreBreakdown = {
    artistSimilarity: simResult.breakdown.artistSimilarity || 0,
    genreSimilarity: simResult.breakdown.genreSimilarity || 0,
    moodSimilarity: simResult.breakdown.moodSimilarity || 0,
    languageMatch: simResult.breakdown.languageMatch || 0,
    acousticMatch: simResult.breakdown.acousticMatch || 0,
    radioCloseness: simResult.breakdown.radioCloseness || 0,
    userLikedBoost: persResult.breakdown.userLikedBoost || 0,
    frequentArtistBoost: persResult.breakdown.frequentArtistBoost || 0,
    skipPenalty: persResult.breakdown.skipPenalty || 0,
    artistFatiguePenalty: divResult.breakdown.artistFatiguePenalty || 0,
    albumFatiguePenalty: divResult.breakdown.albumFatiguePenalty || 0,
    recencyPenalty,
  };

  return {
    song: candidate,
    similarityScore: simResult.score,
    personalizationScore: persResult.score,
    diversityScore: divResult.score,
    transitionScore,
    historyPenalty,
    finalScore,
    breakdown,
    radioIndex,
  };
}
