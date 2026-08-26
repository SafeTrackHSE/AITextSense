/**
 * AI TextSense v2 — Window-Aware Edit Valuation
 *
 * In Kirchenbauer window hashing, token i's green/red status depends on the
 * previous `w` tokens. Substituting token i therefore flips up to w+1 hash
 * evaluations: its own, plus every following token whose context window
 * contains it.
 *
 * This module exploits that: it simulates each candidate substitution against
 * the real hash function and ranks edits by EXACT marginal z-score reduction,
 * so the optimizer spends its edit budget where it destroys the most signal.
 */
import { computeTokenHash, isGreenList } from './detection';
import { getSynonymAlternatives } from './synonyms';
import { simpleTokenize } from './tokenizer';

export interface ValuedEdit {
  tokenIndex: number;
  position: number;
  original: string;
  replacement: string;
  /** Exact z-score delta this edit produces (negative = improvement). */
  deltaZ: number;
  /** How many hash evaluations this single edit flips. */
  flippedEvaluations: number;
}

export interface WindowAwareResult {
  edits: ValuedEdit[];
  beforeZ: number;
  totalGreen: number;
  durationMs: number;
}

interface RawTok { text: string; offset: number; id: number }

function zOf(greenCount: number, n: number, gamma: number): number {
  if (n === 0) return 0;
  const expected = gamma * n;
  const variance = gamma * (1 - gamma) * n;
  if (variance === 0) return 0;
  return (greenCount - expected) / Math.sqrt(variance);
}

/**
 * Rank substitutions by their exact effect on the watermark z-score under a
 * specific (gamma, key, window) configuration.
 */
export function valueWindowAwareEdits(
  text: string,
  gamma: number,
  hashKey: number,
  windowSize: number,
  maxEdits = 40,
): WindowAwareResult {
  const start = performance.now();
  const rawTokens: RawTok[] = simpleTokenize(text).map((t, i) => ({ ...t, id: i }));
  const texts = rawTokens.map(t => t.text);

  // Baseline per-token green status.
  const baseGreen: boolean[] = new Array(rawTokens.length).fill(false);
  for (let i = windowSize; i < rawTokens.length; i++) {
    const ctx = texts.slice(Math.max(0, i - windowSize), i);
    baseGreen[i] = isGreenList(computeTokenHash(texts[i], ctx, hashKey, windowSize), gamma);
  }
  const scoredN = Math.max(0, rawTokens.length - windowSize);
  const beforeZ = zOf(baseGreen.filter(Boolean).length, scoredN, gamma);
  const totalGreen = baseGreen.filter(Boolean).length;

  interface Candidate extends ValuedEdit { index: number }

  const candidates: Candidate[] = [];

  for (let i = windowSize; i < rawTokens.length; i++) {
    if (!baseGreen[i]) continue; // only green tokens carry removable signal
    const originalText = rawTokens[i].text;
    const lower = originalText.toLowerCase();
    if (lower.length < 4) continue;

    const alts = getSynonymAlternatives(lower);
    if (alts.length === 0) continue;

    // Which downstream evaluations does replacing token i affect?
    // Tokens j in (i, i+w] have i inside their context window.
    const affectedUpTo = Math.min(rawTokens.length - 1, i + windowSize);

    for (const alt of alts.slice(0, 4)) {
      let replacement = alt.text;
      if (/^[A-Z]/.test(originalText)) {
        replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }

      // Simulate the substitution across the affected span.
      const simulated = [...texts];
      simulated[i] = replacement.toLowerCase();
      let greenDelta = 0;
      let flipped = 0;

      for (let j = i; j <= affectedUpTo; j++) {
        if (j < windowSize) continue;
        const ctx = simulated.slice(Math.max(0, j - windowSize), j);
        const newGreen = isGreenList(computeTokenHash(simulated[j], ctx, hashKey, windowSize), gamma);
        if (newGreen !== baseGreen[j]) {
          greenDelta += newGreen ? 1 : -1;
          flipped++;
        }
      }

      const deltaZ =
        zOf(baseGreen.filter(Boolean).length + greenDelta, scoredN, gamma) - beforeZ;

      candidates.push({
        index: i,
        tokenIndex: rawTokens[i].id,
        position: rawTokens[i].offset,
        original: originalText,
        replacement,
        deltaZ,
        flippedEvaluations: flipped,
      });
      break; // best alternative per token (alts are quality-ranked)
    }
  }

  candidates.sort((a, b) => a.deltaZ - b.deltaZ || b.flippedEvaluations - a.flippedEvaluations);

  return {
    edits: candidates.slice(0, maxEdits).map(({ index: _i, ...rest }) => rest),
    beforeZ,
    totalGreen,
    durationMs: performance.now() - start,
  };
}

/**
 * Apply valued edits greedily with re-verification after each commit.
 * Stops when the z-score drops below `targetZ` or budget is exhausted.
 */
export function neutralizeWindowAware(
  text: string,
  gamma: number,
  hashKey: number,
  windowSize: number,
  targetZ = 1.5,
  maxEdits = 40,
): { text: string; applied: number; beforeZ: number; afterZ: number } {
  let current = text;
  let valuation = valueWindowAwareEdits(current, gamma, hashKey, windowSize, maxEdits);
  const beforeZ = valuation.beforeZ;
  let applied = 0;
  let lastZ = beforeZ;

  while (applied < maxEdits && valuation.edits.length > 0) {
    const best = valuation.edits[0];
    if (best.deltaZ >= 0) break; // nothing improves anymore

    // Valuation positions are absolute against the CURRENT text — no offset.
    const at = best.position;
    const candidateText =
      current.slice(0, at) +
      best.replacement +
      current.slice(at + best.original.length);

    const newZ = detectZ(candidateText, gamma, hashKey, windowSize);
    if (newZ >= lastZ) {
      // Isolated Δz estimate failed to hold globally — stop rather than regress.
      break;
    }

    current = candidateText;
    lastZ = newZ;
    applied++;

    if (lastZ <= targetZ) break;

    // Re-value remaining candidates against the updated stream.
    valuation = valueWindowAwareEdits(current, gamma, hashKey, windowSize, maxEdits - applied);
  }
  const afterZ = detectZ(current, gamma, hashKey, windowSize);
  return { text: current, applied, beforeZ, afterZ };
}

function detectZ(text: string, gamma: number, hashKey: number, windowSize: number): number {
  const r = detectionProbe(text, gamma, hashKey, windowSize);
  return r;
}

function detectionProbe(text: string, gamma: number, hashKey: number, windowSize: number): number {
  const rawTokens = simpleTokenize(text);
  const texts = rawTokens.map(t => t.text);
  let green = 0;
  for (let i = windowSize; i < texts.length; i++) {
    const ctx = texts.slice(Math.max(0, i - windowSize), i);
    if (isGreenList(computeTokenHash(texts[i], ctx, hashKey, windowSize), gamma)) green++;
  }
  const n = Math.max(0, texts.length - windowSize);
  return zOf(green, n, gamma);
}
