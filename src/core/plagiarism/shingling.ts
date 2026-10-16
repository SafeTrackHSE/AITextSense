/**
 * Mode 1: 1-to-N Reference Document Shingling & Winnowing Fingerprinting
 * AI TextSense v3.0.0
 * (c) 2026 Wilson Volpe. All rights reserved.
 */

import type { ReferenceDocument, ShingleMatchSpan } from './types';

export interface WordToken {
  word: string;
  start: number;
  end: number;
}

export interface Shingle {
  text: string;
  hash: number;
  start: number;
  end: number;
  tokenIndex: number;
}

export interface DocumentFingerprints {
  docId: string;
  docName: string;
  tokens: WordToken[];
  shingles: Shingle[];
  winnowedHashes: Set<number>;
  minHashSignature: number[];
}

/** 32-bit FNV-1a hash */
export function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Tokenize text into words with exact character start and end offsets */
export function tokenizeWordsWithOffsets(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  const regex = /[\p{L}\p{N}_]+/gu;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[0].toLowerCase(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens;
}

/** Generate k-gram word shingles with exact span offsets */
export function createShingles(tokens: WordToken[], k = 4): Shingle[] {
  if (tokens.length < k) return [];
  const shingles: Shingle[] = [];

  for (let i = 0; i <= tokens.length - k; i++) {
    const slice = tokens.slice(i, i + k);
    const shingleText = slice.map(t => t.word).join(' ');
    shingles.push({
      text: shingleText,
      hash: fnv1a(shingleText),
      start: slice[0].start,
      end: slice[slice.length - 1].end,
      tokenIndex: i,
    });
  }

  return shingles;
}

/**
 * Winnowing algorithm (Schleimer et al.)
 * Selects minimum hash in each sliding window of size w to form robust fingerprints.
 */
export function winnowFingerprints(shingles: Shingle[], windowSize = 4): Shingle[] {
  if (shingles.length === 0) return [];
  if (shingles.length <= windowSize) {
    let min = shingles[0];
    for (let i = 1; i < shingles.length; i++) {
      if (shingles[i].hash <= min.hash) min = shingles[i];
    }
    return [min];
  }

  const selected: Shingle[] = [];
  let minIdx = -1;

  for (let i = 0; i <= shingles.length - windowSize; i++) {
    const window = shingles.slice(i, i + windowSize);
    let winMinIdx = 0;

    for (let j = 1; j < window.length; j++) {
      // Pick rightmost minimum to break ties deterministically
      if (window[j].hash <= window[winMinIdx].hash) {
        winMinIdx = j;
      }
    }

    const globalIdx = i + winMinIdx;
    if (globalIdx !== minIdx) {
      minIdx = globalIdx;
      selected.push(shingles[minIdx]);
    }
  }

  return selected;
}

// 64 precomputed deterministic seed coefficients for MinHash
const MINHASH_A = [
  10007, 10009, 10037, 10039, 10061, 10067, 10069, 10079,
  10091, 10093, 10099, 10103, 10111, 10133, 10139, 10141,
  10151, 10159, 10163, 10169, 10177, 10181, 10193, 10211,
  10223, 10243, 10247, 10253, 10259, 10267, 10271, 10273,
  10289, 10301, 10303, 10313, 10321, 10331, 10333, 10337,
  10343, 10357, 10369, 10391, 10399, 10427, 10429, 10433,
  10453, 10457, 10459, 10463, 10477, 10487, 10499, 10501,
  10513, 10529, 10531, 10559, 10567, 10589, 10597, 10601,
];

const MINHASH_B = [
  20011, 20021, 20023, 20029, 20047, 20051, 20063, 20071,
  20089, 20101, 20107, 20113, 20117, 20123, 20129, 20143,
  20147, 20149, 20161, 20173, 20177, 20183, 20201, 20219,
  20231, 20233, 20249, 20261, 20269, 20287, 20297, 20323,
  20327, 20333, 20341, 20347, 20353, 20357, 20359, 20369,
  20389, 20393, 20399, 20407, 20411, 20431, 20441, 20443,
  20477, 20479, 20483, 20507, 20509, 20521, 20533, 20543,
  20549, 20551, 20593, 20599, 20611, 20627, 20639, 20641,
];

const PRIME_P = 4294967291; // Largest 32-bit prime

/** Compute 64-dimensional MinHash signature for a set of shingle hashes */
export function computeMinHashSignature(hashes: number[] | Set<number>): number[] {
  const hashArray = Array.isArray(hashes) ? hashes : Array.from(hashes);
  const numHashes = MINHASH_A.length;
  const signature: number[] = new Array(numHashes).fill(0xffffffff);

  if (hashArray.length === 0) return signature;

  for (const h of hashArray) {
    for (let i = 0; i < numHashes; i++) {
      const val = (Math.imul(MINHASH_A[i], h) + MINHASH_B[i]) % PRIME_P >>> 0;
      if (val < signature[i]) {
        signature[i] = val;
      }
    }
  }

  return signature;
}

/** Estimate Jaccard similarity from MinHash signatures */
export function estimateMinHashSimilarity(sigA: number[], sigB: number[]): number {
  if (sigA.length === 0 || sigB.length === 0 || sigA.length !== sigB.length) return 0;
  let matches = 0;
  for (let i = 0; i < sigA.length; i++) {
    if (sigA[i] === sigB[i]) matches++;
  }
  return matches / sigA.length;
}

/** Exact Jaccard similarity between two sets of numbers */
export function exactJaccard(setA: Set<number>, setB: Set<number>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  const [smaller, larger] = setA.size < setB.size ? [setA, setB] : [setB, setA];

  for (const item of smaller) {
    if (larger.has(item)) intersectionSize++;
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize > 0 ? intersectionSize / unionSize : 0;
}

/**
 * Compare source document against a reference document and extract exact matching spans.
 * Runs 4-gram and 5-gram shingle passes and coalesces consecutive matching shingles
 * into unified, accurate character-offset spans in both documents.
 */
export function compareWithReference(
  sourceText: string,
  reference: ReferenceDocument,
  options: { gramSizes?: number[]; minGramMatch?: number } = {}
): {
  matches: ShingleMatchSpan[];
  jaccardSimilarity: number;
  minHashEstimate: number;
} {
  const gramSizes = options.gramSizes ?? [4, 5];
  const sourceTokens = tokenizeWordsWithOffsets(sourceText);
  const refTokens = tokenizeWordsWithOffsets(reference.text);

  if (sourceTokens.length === 0 || refTokens.length === 0) {
    return { matches: [], jaccardSimilarity: 0, minHashEstimate: 0 };
  }

  // Pre-calculate full document Jaccard & MinHash using 4-gram shingles
  const source4Shingles = createShingles(sourceTokens, 4);
  const ref4Shingles = createShingles(refTokens, 4);
  const sourceHashSet = new Set(source4Shingles.map(s => s.hash));
  const refHashSet = new Set(ref4Shingles.map(s => s.hash));

  const jaccardSimilarity = exactJaccard(sourceHashSet, refHashSet);
  const sigA = computeMinHashSignature(sourceHashSet);
  const sigB = computeMinHashSignature(refHashSet);
  const minHashEstimate = estimateMinHashSimilarity(sigA, sigB);

  const matchedSpans: ShingleMatchSpan[] = [];

  for (const k of gramSizes) {
    const sShingles = k === 4 ? source4Shingles : createShingles(sourceTokens, k);
    const rShingles = k === 4 ? ref4Shingles : createShingles(refTokens, k);
    if (sShingles.length === 0 || rShingles.length === 0) continue;

    // Index reference shingles by hash
    const refMap = new Map<number, Shingle[]>();
    for (const shingle of rShingles) {
      const arr = refMap.get(shingle.hash);
      if (arr) arr.push(shingle);
      else refMap.set(shingle.hash, [shingle]);
    }

    // Find matches in source
    let currentSourceStart = -1;
    let currentSourceEnd = -1;
    let currentRefStart = -1;
    let currentRefEnd = -1;
    let currentMatchedCount = 0;
    let lastRefTokenIdx = -1;

    for (let i = 0; i < sShingles.length; i++) {
      const s = sShingles[i];
      const matchingRefShingles = refMap.get(s.hash);

      if (matchingRefShingles && matchingRefShingles.length > 0) {
        // Pick best matching ref shingle (closest in relative position or consecutive)
        const refMatch = matchingRefShingles.find(r => Math.abs(r.tokenIndex - (lastRefTokenIdx + 1)) <= 1)
          ?? matchingRefShingles[0];

        if (currentSourceStart === -1) {
          currentSourceStart = s.start;
          currentSourceEnd = s.end;
          currentRefStart = refMatch.start;
          currentRefEnd = refMatch.end;
          currentMatchedCount = 1;
        } else if (
          s.start <= currentSourceEnd + 5 &&
          refMatch.start <= currentRefEnd + 5
        ) {
          // Extend span
          currentSourceEnd = Math.max(currentSourceEnd, s.end);
          currentRefEnd = Math.max(currentRefEnd, refMatch.end);
          currentMatchedCount++;
        } else {
          // Commit previous span if long enough
          if (currentMatchedCount >= 1 && currentSourceEnd > currentSourceStart) {
            matchedSpans.push({
              sourceStart: currentSourceStart,
              sourceEnd: currentSourceEnd,
              sourceText: sourceText.slice(currentSourceStart, currentSourceEnd),
              referenceId: reference.id,
              referenceName: reference.name,
              referenceStart: currentRefStart,
              referenceEnd: currentRefEnd,
              referenceText: reference.text.slice(currentRefStart, currentRefEnd),
              similarity: 1.0,
              shingleSize: k,
            });
          }
          currentSourceStart = s.start;
          currentSourceEnd = s.end;
          currentRefStart = refMatch.start;
          currentRefEnd = refMatch.end;
          currentMatchedCount = 1;
        }
        lastRefTokenIdx = refMatch.tokenIndex;
      } else {
        if (currentSourceStart !== -1) {
          if (currentMatchedCount >= 1 && currentSourceEnd > currentSourceStart) {
            matchedSpans.push({
              sourceStart: currentSourceStart,
              sourceEnd: currentSourceEnd,
              sourceText: sourceText.slice(currentSourceStart, currentSourceEnd),
              referenceId: reference.id,
              referenceName: reference.name,
              referenceStart: currentRefStart,
              referenceEnd: currentRefEnd,
              referenceText: reference.text.slice(currentRefStart, currentRefEnd),
              similarity: 1.0,
              shingleSize: k,
            });
          }
          currentSourceStart = -1;
          currentSourceEnd = -1;
          currentRefStart = -1;
          currentRefEnd = -1;
          currentMatchedCount = 0;
          lastRefTokenIdx = -1;
        }
      }
    }

    // Final trailing span
    if (currentSourceStart !== -1 && currentSourceEnd > currentSourceStart) {
      matchedSpans.push({
        sourceStart: currentSourceStart,
        sourceEnd: currentSourceEnd,
        sourceText: sourceText.slice(currentSourceStart, currentSourceEnd),
        referenceId: reference.id,
        referenceName: reference.name,
        referenceStart: currentRefStart,
        referenceEnd: currentRefEnd,
        referenceText: reference.text.slice(currentRefStart, currentRefEnd),
        similarity: 1.0,
        shingleSize: k,
      });
    }
  }

  // Deduplicate and merge overlapping matched spans
  const merged = mergeOverlappingSpans(matchedSpans);

  return {
    matches: merged,
    jaccardSimilarity,
    minHashEstimate,
  };
}

/** Merges overlapping spans from different k-gram passes */
function mergeOverlappingSpans(spans: ShingleMatchSpan[]): ShingleMatchSpan[] {
  if (spans.length <= 1) return spans;

  // Sort by sourceStart asc, then sourceEnd desc
  const sorted = [...spans].sort((a, b) => a.sourceStart - b.sourceStart || b.sourceEnd - a.sourceEnd);
  const result: ShingleMatchSpan[] = [];

  for (const span of sorted) {
    if (result.length === 0) {
      result.push(span);
      continue;
    }

    const prev = result[result.length - 1];
    if (
      prev.referenceId === span.referenceId &&
      span.sourceStart <= prev.sourceEnd + 1
    ) {
      // Overlap or contiguous: merge
      prev.sourceEnd = Math.max(prev.sourceEnd, span.sourceEnd);
      prev.referenceEnd = Math.max(prev.referenceEnd, span.referenceEnd);
      prev.sourceText = span.sourceEnd > prev.sourceEnd
        ? prev.sourceText + span.sourceText.slice(prev.sourceEnd - span.sourceStart)
        : prev.sourceText;
      prev.referenceText = span.referenceEnd > prev.referenceEnd
        ? prev.referenceText + span.referenceText.slice(prev.referenceEnd - span.referenceStart)
        : prev.referenceText;
    } else {
      result.push(span);
    }
  }

  return result;
}

/**
 * Run Mode 1 across 1-to-N reference documents.
 */
export function analyzeReferenceShingling(
  sourceText: string,
  references: ReferenceDocument[]
): {
  matches: ShingleMatchSpan[];
  highestSimilarity: number;
  matchedDocId: string | null;
} {
  const allMatches: ShingleMatchSpan[] = [];
  let highestSimilarity = 0;
  let matchedDocId: string | null = null;

  for (const ref of references) {
    const res = compareWithReference(sourceText, ref);
    if (res.matches.length > 0) {
      allMatches.push(...res.matches);
    }
    if (res.jaccardSimilarity > highestSimilarity) {
      highestSimilarity = res.jaccardSimilarity;
      matchedDocId = ref.id;
    }
  }

  return {
    matches: mergeOverlappingSpans(allMatches),
    highestSimilarity,
    matchedDocId,
  };
}
