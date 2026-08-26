/**
 * Offline "Deparaphrase" pipeline. Restructures sentences to break n-gram
 * similarity to a source while preserving meaning — no LLM required.
 * Attacks: trigram/bigram overlap (clause reorder, sentence split),
 * transitional fingerprints, and vocabulary overlap (aggressive synonym rotation).
 */
import type { RewriteResult, RewriteEdit, RewriteIntensity } from './types';
import { analyzeFootprint } from '../footprint/analysis';
import { getSynonyms } from '../watermark/synonyms';
import { splitLongSentences, swapTransitions, reorderClauses } from './restructure';

function budget(intensity: RewriteIntensity, light: number, moderate: number, heavy: number): number {
  return intensity === 'light' ? light : intensity === 'moderate' ? moderate : heavy;
}

/** Rotate every content word that has a synonym, not just LLM-favored ones — maximizes lexical divergence. */
function rotateBroad(text: string, max: number, edits: RewriteEdit[]): string {
  const wordRe = /\b[a-zA-Z]{4,}\b/g;
  let result = '';
  let last = 0;
  let done = 0;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(text)) !== null) {
    const word = m[0];
    result += text.slice(last, m.index);
    last = m.index + word.length;
    if (done < max) {
      const syns = getSynonyms(word.toLowerCase());
      if (syns.length > 0 && syns[0].toLowerCase() !== word.toLowerCase()) {
        const repl = word[0] === word[0].toUpperCase()
          ? syns[0].charAt(0).toUpperCase() + syns[0].slice(1)
          : syns[0];
        result += repl;
        edits.push({ type: 'synonym', original: word, replacement: repl, position: m.index, reason: 'Word swapped to break lexical overlap' });
        done++;
        continue;
      }
    }
    result += word;
  }
  result += text.slice(last);
  return result;
}

export function deparaphrase(text: string, intensity: RewriteIntensity = 'moderate'): RewriteResult {
  const start = performance.now();
  const before = analyzeFootprint(text);
  const edits: RewriteEdit[] = [];

  let result = text;
  result = reorderClauses(result, budget(intensity, 2, 5, 20), edits);
  result = swapTransitions(result, budget(intensity, 3, 8, 20), edits);
  result = splitLongSentences(result, budget(intensity, 26, 20, 13), budget(intensity, 3, 8, 26), edits);
  result = rotateBroad(result, budget(intensity, 5, 15, 60), edits);

  const after = analyzeFootprint(result);
  return {
    mode: 'deparaphrase',
    engine: 'local',
    original: text,
    rewritten: result,
    edits,
    beforeScore: before.overallScore,
    afterScore: after.overallScore,
    durationMs: performance.now() - start,
  };
}
