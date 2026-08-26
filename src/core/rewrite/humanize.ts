/**
 * Offline "Humanize" pipeline. Rewrites text to read as more natural and varied
 * using deterministic rule-based transforms — no LLM required.
 * Attacks: formality (contractions), vocabulary fingerprint (synonym rotation),
 * hedging boilerplate, and burstiness (sentence-length variance).
 */
import type { RewriteResult, RewriteEdit, RewriteIntensity } from './types';
import { analyzeFootprint } from '../footprint/analysis';
import { getSynonyms } from '../watermark/synonyms';
import { applyContractions } from './contractions';
import { splitLongSentences, swapTransitions } from './restructure';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Non-global: stripHedges relies on String.match(...).index, which is undefined
// for /g/-flagged patterns. We remove one occurrence per call anyway.
const HEDGE_STRIP = [
  /\bit'?s important to note that\b/i,
  /\bit is important to note that\b/i,
  /\bit should be noted that\b/i,
  /\bit is worth noting that\b/i,
  /\bit is worth mentioning that\b/i,
  /\bneedless to say,?\b/i,
  /\bit goes without saying that\b/i,
  /\bas we all know,?\b/i,
];

function budget(intensity: RewriteIntensity, light: number, moderate: number, heavy: number): number {
  return intensity === 'light' ? light : intensity === 'moderate' ? moderate : heavy;
}

function rotateVocabulary(text: string, llmWords: string[], max: number, edits: RewriteEdit[]): string {
  let result = text;
  let done = 0;
  for (const word of llmWords) {
    if (done >= max) break;
    const syns = getSynonyms(word);
    if (syns.length === 0) continue;
    const replacement = syns[0];
    const re = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    const m = result.match(re);
    if (!m || m.index === undefined) continue;
    const original = m[0];
    const idx = m.index;
    const cased = original[0] === original[0].toUpperCase()
      ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
      : replacement;
    result = result.slice(0, idx) + cased + result.slice(idx + original.length);
    edits.push({ type: 'synonym', original, replacement: cased, position: idx, reason: 'LLM-favored word simplified' });
    done++;
  }
  return result;
}

function stripHedges(text: string, max: number, edits: RewriteEdit[]): string {
  let result = text;
  let done = 0;
  for (const re of HEDGE_STRIP) {
    if (done >= max) break;
    const m = result.match(re);
    if (!m || m.index === undefined) continue;
    const idx = m.index;
    let end = idx + m[0].length;
    if (result[end] === ' ') end++;
    const after = result.slice(end);
    const needCap = idx === 0 || /[.!?]\s*$/.test(result.slice(0, idx));
    const tail = needCap && after ? after.charAt(0).toUpperCase() + after.slice(1) : after;
    result = result.slice(0, idx) + tail;
    edits.push({ type: 'hedge-strip', original: m[0], replacement: '', position: idx, reason: 'Filler hedge removed' });
    done++;
  }
  return result;
}

/** Wraps applyContractions to also record edits into the shared list. */
function applyContractionsTracked(text: string, max: number, edits: RewriteEdit[]): string {
  const { text: out, edits: cEdits } = applyContractions(text, max);
  for (const e of cEdits) {
    edits.push({ type: 'contraction', original: e.original, replacement: e.replacement, position: e.position, reason: 'Expanded form contracted' });
  }
  return out;
}

export function humanize(text: string, intensity: RewriteIntensity = 'moderate'): RewriteResult {
  const start = performance.now();
  const before = analyzeFootprint(text);
  const edits: RewriteEdit[] = [];

  let result = text;
  result = stripHedges(result, budget(intensity, 2, 4, 12), edits);
  result = swapTransitions(result, budget(intensity, 2, 5, 15), edits);
  result = rotateVocabulary(result, before.vocabulary.llmFavoredWords, budget(intensity, 3, 7, 100), edits);
  result = applyContractionsTracked(result, budget(intensity, 4, 10, 100), edits);
  result = splitLongSentences(result, budget(intensity, 28, 22, 14), budget(intensity, 2, 6, 20), edits);

  const after = analyzeFootprint(result);
  return {
    mode: 'humanize',
    engine: 'local',
    original: text,
    rewritten: result,
    edits,
    beforeScore: before.overallScore,
    afterScore: after.overallScore,
    durationMs: performance.now() - start,
  };
}
