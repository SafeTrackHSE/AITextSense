/**
 * Mode 3: Zero-Reference Intrinsic Self-Plagiarism & Style-Shift "Patchwriting" Detector
 * AI TextSense v3.0.0
 * (c) 2026 Wilson Volpe. All rights reserved.
 */

import type {
  StyleShiftAnomaly,
  OrphanCitation,
  InternalDuplicationSpan,
} from './types';

export interface ParagraphBlock {
  index: number;
  text: string;
  start: number;
  end: number;
  words: string[];
  sentences: string[];
}

const FUNCTION_WORDS = new Set([
  'the', 'of', 'and', 'to', 'a', 'in', 'that', 'is', 'was', 'he',
  'for', 'it', 'with', 'as', 'his', 'on', 'be', 'at', 'by', 'i',
  'this', 'had', 'not', 'are', 'but', 'from', 'or', 'have', 'an',
  'they', 'which', 'one', 'you', 'were', 'her', 'all', 'she', 'there',
  'would', 'their', 'we', 'him', 'been', 'has', 'when', 'who', 'will',
  'more', 'no', 'if', 'out', 'so', 'said', 'what', 'up', 'its', 'about',
  'into', 'than', 'them', 'can', 'only', 'other', 'new', 'some', 'could',
  'time', 'these', 'two', 'may', 'then', 'do', 'first', 'any', 'my', 'now',
]);

/** Estimate syllable count for English words */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;

  let count = 0;
  const vowels = /[aeiouy]/g;
  let match: RegExpExecArray | null;
  let lastIndex = -2;

  while ((match = vowels.exec(w)) !== null) {
    if (match.index !== lastIndex + 1) {
      count++;
    }
    lastIndex = match.index;
  }

  // Silent e ending
  if (w.endsWith('e') && !w.endsWith('le') && count > 1) {
    count--;
  }

  return Math.max(1, count);
}

/** Segment document text into paragraph blocks with exact offsets */
export function extractParagraphs(text: string): ParagraphBlock[] {
  const paragraphs: ParagraphBlock[] = [];
  const parts = text.split(/(\r?\n\s*\r?\n)/);
  let currentOffset = 0;
  let paraIdx = 0;

  for (const part of parts) {
    if (!part) continue;
    const isDelimiter = /^\r?\n\s*\r?\n$/.test(part);

    if (!isDelimiter) {
      const trimmed = part.trim();
      if (trimmed.length > 0) {
        const leading = part.indexOf(trimmed);
        const start = currentOffset + leading;
        const end = start + trimmed.length;

        const words = trimmed
          .toLowerCase()
          .split(/[^\p{L}\p{N}]+/gu)
          .filter(w => w.length > 0);

        const sentences = trimmed
          .split(/[^.!?\r\n]+(?:[.!?]+|\r?\n|$)/g)
          .map(s => s.trim())
          .filter(s => s.length > 0);

        paragraphs.push({
          index: paraIdx++,
          text: trimmed,
          start,
          end,
          words,
          sentences: sentences.length > 0 ? sentences : [trimmed],
        });
      }
    }

    currentOffset += part.length;
  }

  return paragraphs;
}

export interface ParagraphMetrics {
  ttr: number;
  meanWordLength: number;
  sentenceLengthVariance: number;
  punctuationDensity: number;
  fleschKincaidGrade: number;
  functionWordFreq: number;
}

/** Compute stylometric metric vector for a paragraph */
export function computeParagraphMetrics(p: ParagraphBlock): ParagraphMetrics {
  const wordCount = p.words.length || 1;
  const charCount = p.text.length || 1;

  // Type-Token Ratio
  const uniqueWords = new Set(p.words);
  const ttr = uniqueWords.size / wordCount;

  // Mean Word Length
  const totalWordChars = p.words.reduce((sum, w) => sum + w.length, 0);
  const meanWordLength = totalWordChars / wordCount;

  // Sentence Length Variance
  const sentLengths = p.sentences.map(s => s.split(/\s+/).filter(Boolean).length);
  const meanSentLen = sentLengths.reduce((a, b) => a + b, 0) / (sentLengths.length || 1);
  const variance = sentLengths.reduce((acc, len) => acc + Math.pow(len - meanSentLen, 2), 0) / (sentLengths.length || 1);

  // Punctuation Density
  const punctMatches = p.text.match(/[,;:\-\u2014()"'`]/g);
  const punctCount = punctMatches ? punctMatches.length : 0;
  const punctuationDensity = punctCount / charCount;

  // Flesch-Kincaid Reading Grade
  const totalSyllables = p.words.reduce((sum, w) => sum + countSyllables(w), 0);
  const numSentences = Math.max(1, p.sentences.length);
  const fkGrade = 0.39 * (wordCount / numSentences) + 11.8 * (totalSyllables / wordCount) - 15.59;

  // Function Word Frequency
  const funcWordCount = p.words.filter(w => FUNCTION_WORDS.has(w)).length;
  const functionWordFreq = funcWordCount / wordCount;

  return {
    ttr: Math.round(ttr * 1000) / 1000,
    meanWordLength: Math.round(meanWordLength * 1000) / 1000,
    sentenceLengthVariance: Math.round(variance * 100) / 100,
    punctuationDensity: Math.round(punctuationDensity * 1000) / 1000,
    fleschKincaidGrade: Math.round(Math.max(0, fkGrade) * 10) / 10,
    functionWordFreq: Math.round(functionWordFreq * 1000) / 1000,
  };
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateMad(values: number[], median: number): number {
  if (values.length === 0) return 0;
  const diffs = values.map(v => Math.abs(v - median));
  return calculateMedian(diffs);
}

/**
 * Detect style-shift / patchwriting anomalies across paragraphs.
 * Computes robust Z-scores using median and MAD (Median Absolute Deviation).
 * Flags paragraphs whose distance exceeds zThreshold (default |z| > 2.0).
 */
export function detectStyleShiftAnomalies(
  text: string,
  zThreshold = 2.0
): StyleShiftAnomaly[] {
  const paragraphs = extractParagraphs(text);
  // Need at least 3 substantial paragraphs for meaningful statistical variance
  const substantial = paragraphs.filter(p => p.words.length >= 15);
  if (substantial.length < 3) return [];

  const metricsList = substantial.map(p => computeParagraphMetrics(p));

  const keys: (keyof ParagraphMetrics)[] = [
    'ttr',
    'meanWordLength',
    'sentenceLengthVariance',
    'punctuationDensity',
    'fleschKincaidGrade',
    'functionWordFreq',
  ];

  const stats = new Map<keyof ParagraphMetrics, { median: number; mad: number }>();
  for (const k of keys) {
    const vals = metricsList.map(m => m[k]);
    const med = calculateMedian(vals);
    const mad = calculateMad(vals, med);
    stats.set(k, { median: med, mad: mad > 0.0001 ? mad : 0.001 });
  }

  const anomalies: StyleShiftAnomaly[] = [];

  for (let i = 0; i < substantial.length; i++) {
    const p = substantial[i];
    const m = metricsList[i];
    const deviatingFeatures: string[] = [];
    let maxZ = 0;

    for (const k of keys) {
      const { median, mad } = stats.get(k)!;
      // 1.4826 scale factor normalizes MAD to standard deviation
      const z = (m[k] - median) / (1.4826 * mad);
      const absZ = Math.abs(z);

      if (absZ > maxZ) {
        maxZ = absZ;
      }

      if (absZ >= zThreshold) {
        const sign = z > 0 ? '+' : '-';
        deviatingFeatures.push(`${k}: ${m[k]} (z=${sign}${absZ.toFixed(1)}, doc median ${median.toFixed(2)})`);
      }
    }

    if (maxZ >= zThreshold && deviatingFeatures.length > 0) {
      anomalies.push({
        paragraphIndex: p.index,
        startOffset: p.start,
        endOffset: p.end,
        text: p.text,
        zScore: Math.round(maxZ * 100) / 100,
        metrics: m,
        deviatingFeatures,
      });
    }
  }

  return anomalies;
}

/**
 * Detect Orphan Citations: citations present in text where no Bibliography / References
 * section exists in the document.
 */
export function detectOrphanCitations(text: string): OrphanCitation[] {
  // Check if document has a Bibliography or References section
  const hasBibliography = /(?:^|\n)\s*(?:#{1,4}\s*)?(?:references|bibliography|works\s+cited|sources)\b/i.test(text);
  if (hasBibliography) {
    return []; // Citations have a corresponding section
  }

  const orphans: OrphanCitation[] = [];

  // 1. Numeric citations: [1], [12], [3-5]
  const numericRegex = /\[(\d{1,3}(?:[–\-,\s]+\d{1,3})*)\]/g;
  let match: RegExpExecArray | null;

  while ((match = numericRegex.exec(text)) !== null) {
    const offset = match.index;
    const contextStart = Math.max(0, offset - 25);
    const contextEnd = Math.min(text.length, offset + match[0].length + 25);
    orphans.push({
      marker: match[0],
      offset,
      surroundingContext: text.slice(contextStart, contextEnd).replace(/\s+/g, ' '),
      reason: 'Numeric citation marker found without a References or Bibliography section.',
    });
  }

  // 2. Author-year citations: (Smith, 2023) or (Smith et al., 2021)
  const authorYearRegex = /\(([A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?(?:,?\s+(?:and|&)\s+[A-Z][a-zA-Z]+)?(?:,?\s+\d{4}[a-z]?))\)/g;
  while ((match = authorYearRegex.exec(text)) !== null) {
    const offset = match.index;
    const contextStart = Math.max(0, offset - 25);
    const contextEnd = Math.min(text.length, offset + match[0].length + 25);
    orphans.push({
      marker: match[0],
      offset,
      surroundingContext: text.slice(contextStart, contextEnd).replace(/\s+/g, ' '),
      reason: 'Academic author-year citation found without a References or Bibliography section.',
    });
  }

  // Deduplicate citations occurring at same offset
  const seen = new Set<number>();
  return orphans.filter(o => {
    if (seen.has(o.offset)) return false;
    seen.add(o.offset);
    return true;
  });
}

/**
 * Detect internal self-duplication: duplicate sentences or paragraphs (>= 8 words)
 * repeated within the same document.
 */
export function detectInternalDuplications(text: string): InternalDuplicationSpan[] {
  const duplicates: InternalDuplicationSpan[] = [];
  const sentenceRegex = /[^.!?\r\n]+(?:[.!?]+|\r?\n|$)/g;

  interface SentEntry {
    text: string;
    normalized: string;
    start: number;
    end: number;
    wordCount: number;
  }

  const entries: SentEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const raw = match[0].trim();
    if (raw.length < 25) continue;
    const words = raw.toLowerCase().split(/[^\p{L}\p{N}]+/gu).filter(Boolean);
    if (words.length >= 8) {
      const start = match.index + match[0].indexOf(raw);
      entries.push({
        text: raw,
        normalized: words.join(' '),
        start,
        end: start + raw.length,
        wordCount: words.length,
      });
    }
  }

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];

      if (a.normalized === b.normalized) {
        duplicates.push({
          firstStart: a.start,
          firstEnd: a.end,
          firstText: a.text,
          secondStart: b.start,
          secondEnd: b.end,
          secondText: b.text,
          similarity: 1.0,
        });
      }
    }
  }

  return duplicates;
}
