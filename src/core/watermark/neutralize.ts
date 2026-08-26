import type {
  NeutralizationResult, NeutralizationOptions, NeutralizationSuggestion,
} from './types';
import { DEFAULT_NEUTRALIZATION_OPTIONS } from './types';
import { detectWatermark, isGreenList, computeTokenHash } from './detection';
import { getSynonymAlternatives } from './synonyms';
import { simpleTokenize, wordTokenize } from './tokenizer';

const REORDER_PATTERNS = [
  { pattern: /\b(\w+)\s+and\s+(\w+)\b/gi, swap: '$2 and $1' },
  { pattern: /\b(\w+)\s+or\s+(\w+)\b/gi, swap: '$2 or $1' },
  { pattern: /\bboth\s+(\w+)\s+and\s+(\w+)\b/gi, swap: 'both $2 and $1' },
  { pattern: /\b(Because|Since|Although)\s+([^,]+),\s+(.+)/gi, swap: '$3, $1 $2' },
];

const HOMOGLYPH_MAP: Record<string, string> = {
  'a': '\u0430', // Cyrillic small a
  'e': '\u0435', // Cyrillic small e
  'o': '\u043E', // Cyrillic small o
  'p': '\u0440', // Cyrillic small er
  'c': '\u0441', // Cyrillic small es
  'x': '\u0445', // Cyrillic small ha
  'y': '\u0443', // Cyrillic small u
  'A': '\u0410', // Cyrillic capital A
  'E': '\u0415', // Cyrillic capital IE
  'O': '\u041E', // Cyrillic capital O
  'P': '\u0420', // Cyrillic capital ER
  'C': '\u0421', // Cyrillic capital ES
  'X': '\u0425', // Cyrillic capital HA
};

// Max iterations for the neutralization convergence loop.
const MAX_ITERATIONS = 5;

export function neutralize(
  text: string,
  options: Partial<NeutralizationOptions> = {},
): NeutralizationResult {
  const start = performance.now();
  const opts = { ...DEFAULT_NEUTRALIZATION_OPTIONS, ...options };

  const beforeResult = detectWatermark(text);
  const beforeZScore = beforeResult.zScore;
  const detectedGamma = beforeResult.gamma;
  const detectedKey = beforeResult.hashKey;
  const detectedWindow = beforeResult.windowSize;

  const allSuggestions: NeutralizationSuggestion[] = [];
  let result = text;
  let iterations = 0;
  let currentZScore = beforeZScore;

  // Run at least once, then keep neutralizing while z is above threshold or max iterations.
  while ((iterations === 0 || currentZScore > 2.0) && iterations < MAX_ITERATIONS) {
    let modified = result;

    if (opts.strategies.has('synonym')) {
      const detection = detectWatermark(modified, {
        gamma: detectedGamma, hashKey: detectedKey, windowSize: detectedWindow,
      });
      const { text: synText, suggestions: synSuggestions } = applySynonymsTargeted(
        modified, detection.tokens, opts.intensity, detectedGamma, detectedKey, detectedWindow,
      );
      modified = synText;
      allSuggestions.push(...synSuggestions);
    }

    if (opts.strategies.has('reorder')) {
      const { text: reorderedText, suggestions: reorderSuggestions } = applyReorder(modified, opts.intensity);
      modified = reorderedText;
      allSuggestions.push(...reorderSuggestions);
    }

    if (opts.strategies.has('homoglyph')) {
      const { text: homoglyphText, suggestions: homoglyphSuggestions } = applyHomoglyphs(modified, opts.intensity);
      modified = homoglyphText;
      allSuggestions.push(...homoglyphSuggestions);
    }

    if (opts.strategies.has('whitespace')) {
      modified = normalizeWhitespace(modified);
    }

    result = modified;
    const afterDetect = detectWatermark(result, {
      gamma: detectedGamma, hashKey: detectedKey, windowSize: detectedWindow,
    });
    currentZScore = afterDetect.zScore;
    iterations++;

    // No change detected — stop early.
    if (modified === text && iterations === 1) break;
  }

  const afterResult = detectWatermark(result);
  const afterZScore = afterResult.zScore;

  return {
    original: text,
    neutralized: result,
    suggestions: allSuggestions,
    appliedCount: allSuggestions.length,
    beforeZScore,
    afterZScore,
    iterationCount: iterations,
    durationMs: performance.now() - start,
  };
}

/**
 * Targeted synonym substitution: prioritizes synonyms that land on the RED list,
 * with graceful fallback to top alternative if no red-list alternatives are found.
 */
function applySynonymsTargeted(
  text: string,
  tokens: Array<{ token: string; isGreenList: boolean; position: number }>,
  intensity: 'light' | 'moderate' | 'heavy',
  gamma: number,
  hashKey: number,
  windowSize: number,
): { text: string; suggestions: NeutralizationSuggestion[] } {
  const suggestions: NeutralizationSuggestion[] = [];
  const greenTokens = tokens.filter(t => t.isGreenList);

  const targetCount = greenTokens.length > 0
    ? (intensity === 'light'
        ? Math.ceil(greenTokens.length * 0.3)
        : intensity === 'moderate'
          ? Math.ceil(greenTokens.length * 0.5)
          : Math.ceil(greenTokens.length * 0.8))
    : (intensity === 'light' ? 2 : intensity === 'moderate' ? 4 : 10);

  const rawTokens = simpleTokenize(text);
  const wordTokens = wordTokenize(text);
  let result = text;
  let offset = 0;
  let applied = 0;

  for (const wt of wordTokens) {
    if (applied >= targetCount) break;

    const alternatives = getSynonymAlternatives(wt.text);
    if (alternatives.length === 0) continue;

    // Find context for this token in the raw token stream.
    const rawIdx = rawTokens.findIndex(rt => rt.offset >= wt.offset);
    const context = rawIdx > 0
      ? rawTokens.slice(Math.max(0, rawIdx - windowSize), rawIdx).map(rt => rt.text)
      : [''];

    // Filter alternatives to those that land in the RED list.
    let candidates = alternatives.filter(alt => {
      const hash = computeTokenHash(alt.text.toLowerCase(), context, hashKey, windowSize);
      return !isGreenList(hash, gamma);
    });

    if (candidates.length === 0) {
      candidates = alternatives;
    }

    const best = candidates[0];
    const adjustedOffset = wt.offset + offset;

    // Preserve titlecase if original is capitalized
    let replacement = best.text;
    if (/^[A-Z][a-z]/.test(wt.text) && /^[a-z]/.test(replacement)) {
      replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }

    const before = result.slice(0, adjustedOffset);
    const after = result.slice(adjustedOffset + wt.text.length);
    result = before + replacement + after;
    offset += replacement.length - wt.text.length;

    suggestions.push({
      tokenIndex: wt.id,
      originalToken: wt.text,
      originalPosition: wt.offset,
      alternatives: candidates.map(a => ({
        text: a.text,
        similarity: a.similarity,
        source: 'synonym-red-list',
      })),
      strategy: 'synonym',
    });

    applied++;
  }

  return { text: result, suggestions };
}

function applyReorder(
  text: string,
  intensity: 'light' | 'moderate' | 'heavy',
): { text: string; suggestions: NeutralizationSuggestion[] } {
  const suggestions: NeutralizationSuggestion[] = [];
  let result = text;

  const maxSwaps = intensity === 'light' ? 1 : intensity === 'moderate' ? 3 : 10;
  let swapCount = 0;

  for (const rp of REORDER_PATTERNS) {
    if (swapCount >= maxSwaps) break;

    const scanRegex = new RegExp(rp.pattern.source, rp.pattern.flags);
    const matches = [...result.matchAll(scanRegex)];
    for (const match of matches) {
      if (swapCount >= maxSwaps) break;
      if (match.index === undefined) continue;

      const freshRegex = new RegExp(rp.pattern.source, rp.pattern.flags);
      const swapped = match[0].replace(freshRegex, rp.swap);
      if (swapped === match[0]) continue;

      result = result.slice(0, match.index) + swapped + result.slice(match.index + match[0].length);

      suggestions.push({
        tokenIndex: -1,
        originalToken: match[0],
        originalPosition: match.index,
        alternatives: [{ text: swapped, similarity: 1.0, source: 'reorder' }],
        strategy: 'reorder',
      });

      swapCount++;
    }
  }

  return { text: result, suggestions };
}

function applyHomoglyphs(
  text: string,
  intensity: 'light' | 'moderate' | 'heavy',
): { text: string; suggestions: NeutralizationSuggestion[] } {
  const suggestions: NeutralizationSuggestion[] = [];
  const maxInjections = intensity === 'light' ? 2 : intensity === 'moderate' ? 5 : 15;
  let injected = 0;
  let result = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (injected < maxInjections && HOMOGLYPH_MAP[char]) {
      const substituted = HOMOGLYPH_MAP[char];
      result += substituted;
      suggestions.push({
        tokenIndex: -1,
        originalToken: char,
        originalPosition: i,
        alternatives: [{ text: substituted, similarity: 1.0, source: 'homoglyph-substitute' }],
        strategy: 'homoglyph',
      });
      injected++;
    } else {
      result += char;
    }
  }

  return { text: result, suggestions };
}

/** Single regex covering all anomalous Unicode whitespace — replaces 15 sequential calls. */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/ {2,}/g, ' ');
}
