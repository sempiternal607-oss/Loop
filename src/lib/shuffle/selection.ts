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

  if (candidates.length <= count) {
    // Small candidate pool: sort by finalScore descending and return
    return [...candidates].sort((a, b) => b.finalScore - a.finalScore);
  }

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
