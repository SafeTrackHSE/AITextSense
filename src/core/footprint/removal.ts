import type { FootprintTransform, FootprintRemovalResult } from './types';
import { analyzeFootprint } from './analysis';
import { getSynonyms } from '../watermark/synonyms';
import { TEMPLATE_REWRITES } from './patterns';
import {
  detectTypographicTells,
  computeSentenceFingerprintHeatmap,
  type SentenceFingerprintOverlay,
} from './detector';
import { neutralize } from '../watermark/neutralize';

export interface ScrubFingerprintOptions {
  intensity?: 'light' | 'moderate' | 'heavy';
  preserveCodeSpans?: boolean;
  normalizeTypographic?: boolean;
  neutralizeWatermark?: boolean;
}

export interface FingerprintRemovalBreakdown {
  beforeScore: number;
  afterScore: number;
  llmWordsBefore: number;
  llmWordsAfter: number;
  hedgingBefore: number;
  hedgingAfter: number;
  templatesBefore: number;
  templatesAfter: number;
  typographicBefore: number;
  typographicAfter: number;
  burstinessBefore: number;
  burstinessAfter: number;
}

export interface AIFingerprintScrubReport {
  original: string;
  modified: string;
  beforeScore: number;
  afterScore: number;
  reductionPercent: number;
  transforms: FootprintTransform[];
  breakdown: FingerprintRemovalBreakdown;
  heatmapBefore: SentenceFingerprintOverlay;
  heatmapAfter: SentenceFingerprintOverlay;
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Mask protected spans (code blocks, inline code, URLs, and file paths)
 * so mutations do not damage programmatic syntax or external links.
 */
export function maskProtectedSpans(text: string): { maskedText: string; spans: Map<string, string> } {
  const spans = new Map<string, string>();
  let spanId = 0;

  // Patterns to protect:
  // 1. Fenced code blocks ```...``` or ~~~...~~~
  // 2. Inline code `...`
  // 3. URLs
  // 4. File paths
  const pattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`|https?:\/\/[^\s)\]]+|(?:[a-zA-Z]:\\|\/)[a-zA-Z0-9_.\-\\/]+)/g;

  const maskedText = text.replace(pattern, (match) => {
    const placeholder = `\uE000PROTECTED_SPAN_${spanId++}\uE000`;
    spans.set(placeholder, match);
    return placeholder;
  });

  return { maskedText, spans };
}

export function unmaskProtectedSpans(text: string, spans: Map<string, string>): string {
  let restored = text;
  for (const [placeholder, original] of spans.entries()) {
    restored = restored.replaceAll(placeholder, original);
  }
  return restored;
}

export const restoreProtectedSpans = unmaskProtectedSpans;

/**
 * Layer 3: Normalize typographic anomalies characteristic of LLM text.
 * Replaces curly quotes, normalizes excessive em-dashes, fixes NBSP, and strips bold list lead-ins.
 */
export function normalizeTypographicTells(
  text: string,
  transforms?: FootprintTransform[],
): string {
  let res = text;

  // Strip NBSP and narrow NBSP
  const nbspMatches = res.match(/[\u00A0\u202F]/g);
  if (nbspMatches && nbspMatches.length > 0) {
    res = res.replace(/[\u00A0\u202F]/g, ' ');
    transforms?.push({
      type: 'synonym-rotate',
      originalSpan: { start: 0, end: 0, text: 'NBSP' },
      replacement: ' ',
      impact: 0.1,
      reason: `Normalized non-breaking spaces (${nbspMatches.length})`,
    });
  }

  // Normalize smart / curly quotes
  const curlyMatches = res.match(/[“”‘’]/g);
  if (curlyMatches && curlyMatches.length > 0) {
    res = res.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    transforms?.push({
      type: 'synonym-rotate',
      originalSpan: { start: 0, end: 0, text: 'curly-quotes' },
      replacement: 'straight-quotes',
      impact: 0.1,
      reason: `Normalized curly quotes (${curlyMatches.length})`,
    });
  }

  // Ellipsis
  if (/…/.test(res)) {
    res = res.replace(/…/g, '...');
  }

  // Strip robotic bold-colon list lead-ins:
  // e.g. "- **Efficiency**: Increases speed" -> "- Efficiency: Increases speed"
  const boldMatches = res.match(/^(\s*[-*+]\s+)\*\*([^*]+)\*\*:\s*/gm);
  if (boldMatches && boldMatches.length > 0) {
    res = res.replace(/^(\s*[-*+]\s+)\*\*([^*]+)\*\*:\s*/gm, '$1$2: ');
    transforms?.push({
      type: 'sentence-combine',
      originalSpan: { start: 0, end: 0, text: 'bold-colon-lead-in' },
      replacement: 'plain-lead-in',
      impact: 0.2,
      reason: `Stripped robotic bold-colon list lead-ins (${boldMatches.length})`,
    });
  }

  // Excessive em-dashes: replace " — " or " -- " with ", "
  const emDashMatches = res.match(/\s*(?:—|--)\s*/g);
  if (emDashMatches && emDashMatches.length >= 2) {
    res = res.replace(/\s*(?:—|--)\s*/g, ', ');
    transforms?.push({
      type: 'sentence-combine',
      originalSpan: { start: 0, end: 0, text: 'em-dash' },
      replacement: ', ',
      impact: 0.2,
      reason: `Normalized excessive em-dash pauses (${emDashMatches.length})`,
    });
  }

  return res;
}

export function rotateSynonyms(
  text: string,
  llmWords: string[],
  intensity: 'light' | 'moderate' | 'heavy',
  transforms: FootprintTransform[],
): string {
  const targetCount = intensity === 'light' ? 3 : intensity === 'moderate' ? 6 : llmWords.length * 3;
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

    let match: RegExpExecArray | null;
    while ((match = regex.exec(result)) !== null && applied < targetCount) {
      const original = match[0];
      const idx = match.index;
      const isCapitalized = original[0] === original[0].toUpperCase();
      const finalReplacement = isCapitalized
        ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
        : replacement;

      result = result.slice(0, idx) + finalReplacement + result.slice(idx + original.length);
      regex.lastIndex = idx + finalReplacement.length;

      transforms.push({
        type: 'synonym-rotate',
        originalSpan: { start: idx, end: idx + original.length, text: original },
        replacement: finalReplacement,
        impact: 0.3,
        reason: `LLM-favored word replaced`,
      });

      applied++;
    }
  }

  return result;
}

export function removeHedging(
  text: string,
  hedging: Array<{ pattern: string; occurrences: number; positions: number[] }>,
  intensity: 'light' | 'moderate' | 'heavy',
  transforms: FootprintTransform[],
): string {
  const maxRemove = intensity === 'light' ? 1 : intensity === 'moderate' ? 3 : hedging.length * 2;
  let result = text;
  let removed = 0;

  for (const h of hedging) {
    if (removed >= maxRemove) break;

    let searchFrom = 0;
    while (removed < maxRemove) {
      const idx = result.toLowerCase().indexOf(h.pattern.toLowerCase(), searchFrom);
      if (idx === -1) break;

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

      const repl = needsCapitalize ? capitalizedAfter : after;
      result = before + repl;

      transforms.push({
        type: 'sentence-combine',
        originalSpan: { start: idx, end: removeEnd, text: h.pattern },
        replacement: '',
        impact: 0.4,
        reason: `Hedging phrase removed`,
      });

      removed++;
      searchFrom = idx;
    }
  }

  return result;
}

export function removeTemplates(
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

    let searchFrom = 0;
    while (replaced < maxReplace) {
      const idx = result.toLowerCase().indexOf(t.pattern.toLowerCase(), searchFrom);
      if (idx === -1) break;

      const original = result.slice(idx, idx + t.pattern.length);

      if (rewrite === '') {
        let removeEnd = idx + original.length;
        if (result[removeEnd] === ',') removeEnd++;
        if (result[removeEnd] === ' ') removeEnd++;
        const after = result.slice(removeEnd);
        const capitalized = after.charAt(0).toUpperCase() + after.slice(1);
        result = result.slice(0, idx) + capitalized;
        searchFrom = idx;
      } else {
        result = result.slice(0, idx) + rewrite + result.slice(idx + original.length);
        searchFrom = idx + rewrite.length;
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
  }

  return result;
}

export function varySentenceStructure(
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

/**
 * Standard footprint removal pass (backward-compatible API).
 */
export function removeFootprint(
  text: string,
  intensity: 'light' | 'moderate' | 'heavy' = 'moderate',
): FootprintRemovalResult {
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

/**
 * Explicit 4-Layer AI Fingerprint Scrubber.
 * Chains protected span masking, typographic scrubbing, multi-pass lexical rotation,
 * hedging removal, template reduction, sentence variation, and optional watermark suppression.
 */
export function scrubAllAIFingerprints(
  text: string,
  options: ScrubFingerprintOptions = {},
): AIFingerprintScrubReport {
  const intensity = options.intensity ?? 'moderate';
  const preserveCode = options.preserveCodeSpans ?? true;
  const normalizeTypo = options.normalizeTypographic ?? true;
  const neutralizeWm = options.neutralizeWatermark ?? false;

  const beforeAnalysis = analyzeFootprint(text);
  const typoBefore = detectTypographicTells(text);
  const heatmapBefore = computeSentenceFingerprintHeatmap(text);

  let current = text;
  let spans = new Map<string, string>();

  // Layer 0: Mask protected spans
  if (preserveCode) {
    const masked = maskProtectedSpans(current);
    current = masked.maskedText;
    spans = masked.spans;
  }

  const transforms: FootprintTransform[] = [];

  // Layer 3: Typographic tell normalization
  if (normalizeTypo) {
    current = normalizeTypographicTells(current, transforms);
  }

  // Layer 1: Lexical synonym rotation
  const llmWords = beforeAnalysis.vocabulary.llmFavoredWords;
  current = rotateSynonyms(current, llmWords, intensity, transforms);

  // Layer 2: Syntactic repetition (hedging + templates + uniform length)
  current = removeHedging(current, beforeAnalysis.repetition.hedgingPhrases, intensity, transforms);
  current = removeTemplates(current, beforeAnalysis.repetition.templatePhrases, intensity, transforms);
  current = varySentenceStructure(current, intensity, transforms);

  // Optional: Watermark suppression
  if (neutralizeWm) {
    try {
      const neut = neutralize(current);
      if (neut.neutralized && neut.neutralized !== current) {
        current = neut.neutralized;
      }
    } catch {
      // ignore
    }
  }

  // Restore protected spans
  if (preserveCode && spans.size > 0) {
    current = unmaskProtectedSpans(current, spans);
  }

  const afterAnalysis = analyzeFootprint(current);
  const typoAfter = detectTypographicTells(current);
  const heatmapAfter = computeSentenceFingerprintHeatmap(current);

  const beforeScore = beforeAnalysis.overallScore;
  const afterScore = afterAnalysis.overallScore;
  const reductionPercent = beforeScore > 0
    ? Math.max(0, Math.round(((beforeScore - afterScore) / beforeScore) * 100))
    : 0;

  const breakdown: FingerprintRemovalBreakdown = {
    beforeScore,
    afterScore,
    llmWordsBefore: beforeAnalysis.vocabulary.llmFavoredCount,
    llmWordsAfter: afterAnalysis.vocabulary.llmFavoredCount,
    hedgingBefore: beforeAnalysis.repetition.hedgingPhrases.reduce((a, b) => a + b.occurrences, 0),
    hedgingAfter: afterAnalysis.repetition.hedgingPhrases.reduce((a, b) => a + b.occurrences, 0),
    templatesBefore: beforeAnalysis.repetition.templatePhrases.reduce((a, b) => a + b.occurrences, 0),
    templatesAfter: afterAnalysis.repetition.templatePhrases.reduce((a, b) => a + b.occurrences, 0),
    typographicBefore: typoBefore.typographicScore,
    typographicAfter: typoAfter.typographicScore,
    burstinessBefore: beforeAnalysis.burstiness.burstinessScore,
    burstinessAfter: afterAnalysis.burstiness.burstinessScore,
  };

  return {
    original: text,
    modified: current,
    beforeScore,
    afterScore,
    reductionPercent,
    transforms,
    breakdown,
    heatmapBefore,
    heatmapAfter,
  };
}

export const scrubAllFingerprints = scrubAllAIFingerprints;
