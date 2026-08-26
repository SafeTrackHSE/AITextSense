import type { FootprintTransform, FootprintRemovalResult } from './types';
import { analyzeFootprint } from './analysis';
import { getSynonyms } from '../watermark/synonyms';

export function removeFootprint(text: string, intensity: 'light' | 'moderate' | 'heavy' = 'moderate'): FootprintRemovalResult {
  const start = performance.now();
  const beforeAnalysis = analyzeFootprint(text);
  const beforeScore = beforeAnalysis.overallScore;

  const transforms: FootprintTransform[] = [];
  let result = text;

  result = rotateSynonyms(result, beforeAnalysis.vocabulary.llmFavoredWords, intensity, transforms);
  result = removeHedging(result, beforeAnalysis.repetition.hedgingPhrases, intensity, transforms);
  result = removeTemplates(result, beforeAnalysis.repetition.templatePhrases, intensity, transforms);
  result = varySentenceStructure(result, intensity, transforms);

  const afterAnalysis = analyzeFootprint(result);

  return {
    original: text,
    modified: result,
    transforms,
    beforeScore,
    afterScore: afterAnalysis.overallScore,
    durationMs: performance.now() - start,
  };
}

/** Deterministic seeded PRNG (mulberry32) — same input text → same output synonyms. */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function rotateSynonyms(
  text: string,
  llmWords: string[],
  intensity: 'light' | 'moderate' | 'heavy',
  transforms: FootprintTransform[],
): string {
  const targetCount = intensity === 'light' ? 3 : intensity === 'moderate' ? 6 : llmWords.length;
  const seed = text.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const rand = mulberry32(Math.abs(seed));

  let result = text;
  let applied = 0;

  for (const word of llmWords) {
    if (applied >= targetCount) break;

    const synonyms = getSynonyms(word);
    if (synonyms.length === 0) continue;

    const replacement = synonyms[Math.floor(rand() * Math.min(3, synonyms.length))];
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
    const match = regex.exec(result);
    if (!match) continue;

    const original = match[0];
    const idx = match.index;
    const isCapitalized = original[0] === original[0].toUpperCase();
    const finalReplacement = isCapitalized
      ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
      : replacement;

    result = result.slice(0, idx) + finalReplacement + result.slice(idx + original.length);

    transforms.push({
      type: 'synonym-rotate',
      originalSpan: { start: idx, end: idx + original.length, text: original },
      replacement: finalReplacement,
      impact: 0.3,
      reason: `LLM-favored word replaced`,
    });

    applied++;
  }

  return result;
}

function removeHedging(
  text: string,
  hedging: Array<{ pattern: string; occurrences: number; positions: number[] }>,
  intensity: 'light' | 'moderate' | 'heavy',
  transforms: FootprintTransform[],
): string {
  const maxRemove = intensity === 'light' ? 1 : intensity === 'moderate' ? 3 : hedging.length;
  let result = text;
  let removed = 0;

  for (const h of hedging) {
    if (removed >= maxRemove) break;

    const idx = result.toLowerCase().indexOf(h.pattern);
    if (idx === -1) continue;

    const endIdx = idx + h.pattern.length;
    let removeEnd = endIdx;
    if (result[removeEnd] === ',' || result[removeEnd] === ' ') removeEnd++;
    if (result[removeEnd] === ' ') removeEnd++;

    const before = result.slice(0, idx);
    const after = result.slice(removeEnd);
    const firstCharAfter = after.charAt(0);
    const capitalizedAfter = after.length > 0
      ? firstCharAfter.toUpperCase() + after.slice(1)
      : after;

    const needsCapitalize = idx === 0 || result[idx - 1] === '.' || result[idx - 1] === '!' || result[idx - 1] === '?';

    result = before + (needsCapitalize ? capitalizedAfter : after);

    transforms.push({
      type: 'sentence-combine',
      originalSpan: { start: idx, end: removeEnd, text: h.pattern },
      replacement: '',
      impact: 0.4,
      reason: `Hedging phrase removed`,
    });

    removed++;
  }

  return result;
}

/** Concise replacements for common LLM template boilerplate. */
const TEMPLATE_REWRITES: Record<string, string> = {
  'plays a crucial role in': 'drives',
  'plays an important role in': 'shapes',
  'plays a vital role in': 'is central to',
  'serves as a': 'acts as a',
  "let's delve into": 'examining',
  "let's explore": 'on',
  "let's take a look": 'looking at',
  "in today's world": '',
  'in the modern era': '',
  'in the grand scheme': 'overall',
  'it is essential to': '',
  'it is crucial to': '',
  'it can be argued that': '',
  'this approach allows': 'this allows',
  'this method provides': 'this provides',
  'the key takeaway': 'the conclusion',
  'key takeaways include': 'conclusions:',
  'here are some': 'some',
  'there are several': 'several',
  'there are many': 'many',
  'there are various': 'various',
  'one of the most': 'a',
  'can be achieved by': 'requires',
};

function removeTemplates(
  text: string,
  templates: Array<{ pattern: string; occurrences: number; positions: number[] }>,
  intensity: 'light' | 'moderate' | 'heavy',
  transforms: FootprintTransform[],
): string {
  const maxReplace = intensity === 'light' ? 2 : intensity === 'moderate' ? 5 : templates.length + Object.keys(TEMPLATE_REWRITES).length;
  let result = text;
  let replaced = 0;

  for (const t of templates) {
    if (replaced >= maxReplace) break;

    const rewrite = TEMPLATE_REWRITES[t.pattern.toLowerCase()];
    if (rewrite === undefined) continue;

    const idx = result.toLowerCase().indexOf(t.pattern.toLowerCase());
    if (idx === -1) continue;

    const original = result.slice(idx, idx + t.pattern.length);

    if (rewrite === '') {
      let removeEnd = idx + original.length;
      if (result[removeEnd] === ',') removeEnd++;
      if (result[removeEnd] === ' ') removeEnd++;
      const after = result.slice(removeEnd);
      const capitalized = after.charAt(0).toUpperCase() + after.slice(1);
      result = result.slice(0, idx) + capitalized;
    } else {
      result = result.slice(0, idx) + rewrite + result.slice(idx + original.length);
    }

    transforms.push({
      type: 'sentence-combine',
      originalSpan: { start: idx, end: idx + original.length, text: original },
      replacement: rewrite,
      impact: 0.35,
      reason: `Template phrase replaced`,
    });

    replaced++;
  }

  return result;
}

function varySentenceStructure(
  text: string,
  intensity: 'light' | 'moderate' | 'heavy',
  transforms: FootprintTransform[],
): string {
  if (intensity === 'light') return text;

  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length < 4) return text;

  let result = text;

  for (let i = 0; i < sentences.length - 1; i++) {
    const s1 = sentences[i];
    const s2 = sentences[i + 1];

    if (!s1 || !s2) continue;

    const s1Words = s1.split(/\s+/).length;
    const s2Words = s2.split(/\s+/).length;

    if (s1Words <= 6 && s2Words <= 6 && Math.abs(s1Words - s2Words) <= 2) {
      const combined = s1.replace(/[.!?]$/, '') + ', and ' + s2.charAt(0).toLowerCase() + s2.slice(1);
      const idx = result.indexOf(s1 + ' ' + s2);

      if (idx === -1) { i++; continue; }

      result = result.slice(0, idx) + combined + result.slice(idx + s1.length + 1 + s2.length);

      transforms.push({
        type: 'sentence-combine',
        originalSpan: { start: idx, end: idx + s1.length + 1 + s2.length, text: s1 + ' ' + s2 },
        replacement: combined,
        impact: 0.2,
        reason: 'Short adjacent sentences combined to vary rhythm',
      });

      i++;
    }
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
