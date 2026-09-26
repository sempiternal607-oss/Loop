import { ShuffleCandidate } from './types';

/**
 * Samples one item from a pool using weighted probabilities (CDF sampling)
 */
export function sampleOneWeighted(
  pool: Array<{ candidate: ShuffleCandidate; weight: number }>
): { candidate: ShuffleCandidate; index: number } | null {
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    // If all weights are 0, pick uniformly at random
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx] ? { candidate: pool[idx].candidate, index: idx } : null;
  }

  const randomPoint = Math.random() * totalWeight;
  let runningSum = 0;

  for (let i = 0; i < pool.length; i++) {
    runningSum += pool[i].weight;
    if (randomPoint <= runningSum) {
      return { candidate: pool[i].candidate, index: i };
    }
  }

  // Fallback to the last item
  const lastIdx = pool.length - 1;
  return { candidate: pool[lastIdx].candidate, index: lastIdx };
}

/**
 * Selects `count` candidates using power-law / temperature-controlled weighted sampling without replacement.
 *
 * Lower temperature (e.g. 0.5) -> strongly skews toward the absolute top scoring candidates.
 * Higher temperature (e.g. 1.2) -> increases exploration and surprises.
 * Default 0.65 provides high musical coherence while preserving organic diversity.
 */
export function selectWeightedCandidates(
  candidates: ShuffleCandidate[],
  count: number = 5,
  temperature: number = 0.65
): ShuffleCandidate[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  // NOTE: no small-pool shortcut here. When count === pool size (bounded playlist
  // shuffle) a sorted return would be fully deterministic — the same playlist would
  // always shuffle into the exact same order. Weighted sampling below still covers
  // every song exactly once while keeping score-weighted randomness.

  // Quality gate: prune out clashing/low-scoring outliers (< 0.25) when viable candidates are available
  const viable = candidates.filter((c) => c.finalScore >= 0.25);
  const eligibleCandidates = viable.length >= count ? viable : candidates;

  // Build weighted pool
  // Clamp temperature between 0.1 and 3.0 to prevent numerical overflow
  const safeTemp = Math.max(0.1, Math.min(3.0, temperature));
  const pool = eligibleCandidates.map((cand) => {
    // Power weight: weight = (finalScore)^(1 / temp)
    const normalizedScore = Math.max(0.0001, Math.min(1.0, cand.finalScore));
    const weight = Math.pow(normalizedScore, 1 / safeTemp);
    return {
      candidate: cand,
      weight,
    };
  });

  const selected: ShuffleCandidate[] = [];
  const workingPool = [...pool];

  while (selected.length < count && workingPool.length > 0) {
    const sampled = sampleOneWeighted(workingPool);
    if (!sampled) break;

    selected.push(sampled.candidate);
    // Remove selected item from working pool (sampling without replacement)
    workingPool.splice(sampled.index, 1);
  }

  return selected;
}

/**
 * Builds a Spotify-style discovery mix from a scored candidate pool.
 *
 * Radio candidates (YouTube Music recommendations seeded from the currently
 * playing song) form the MAJORITY of the mix, interleaved with a minority of
 * context tracks (queue / search results / playlist leftovers). This mirrors
 * Spotify smart shuffle: the queue is dominated by songs SIMILAR to what is
 * playing (so "Selfless by The Strokes" leads to similar indie rock, not
 * twenty other songs titled "Selfless"), while the user's own songs are
 * still woven in.
 */
export function selectDiscoveryMix(
  radioCandidates: ShuffleCandidate[],
  contextCandidates: ShuffleCandidate[],
  count: number,
  temperature: number = 0.65,
  radioShare: number = 0.75
): ShuffleCandidate[] {
  if (count <= 0) return [];

  // Degenerate pools degrade to plain weighted selection
  if (radioCandidates.length === 0) {
    return selectWeightedCandidates(contextCandidates, count, temperature);
  }
  if (contextCandidates.length === 0) {
    return selectWeightedCandidates(radioCandidates, count, temperature);
  }

  // Quota split. If the radio pool is smaller than its share, the unused
  // quota flows to context, and vice versa via the final fill-up.
  const radioQuota = Math.min(Math.round(count * radioShare), radioCandidates.length);
  const contextQuota = Math.min(count - radioQuota, contextCandidates.length);

  const radioPicks = selectWeightedCandidates(radioCandidates, radioQuota, temperature);
  const contextPicks = selectWeightedCandidates(contextCandidates, contextQuota, temperature);

  // Interleave radio / context so the user's own songs stay evenly woven in
  const mixed: ShuffleCandidate[] = [];
  const maxLen = Math.max(radioPicks.length, contextPicks.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < radioPicks.length) mixed.push(radioPicks[i]);
    if (i < contextPicks.length) mixed.push(contextPicks[i]);
  }

  // If context ran out before count was reached, top up from leftover radio
  if (mixed.length < count) {
    const pickedIds = new Set(mixed.map((c) => c.song.videoId));
    const radioLeftovers = radioCandidates.filter(
      (c) => !pickedIds.has(c.song.videoId)
    );
    const topUp = selectWeightedCandidates(
      radioLeftovers,
      count - mixed.length,
      temperature
    );
    mixed.push(...topUp);
  }

  return mixed;
}
