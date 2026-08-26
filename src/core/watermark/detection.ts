import type { TokenInfo, WatermarkDetectionResult, WatermarkSweepResult } from './types';
import { simpleTokenize } from './tokenizer';

// Bonferroni-corrected α: 0.05 / (9 keys × 6 gammas × 4 windows) = 0.05 / 216 ≈ 0.000231
const BONFERRONI_ALPHA = 0.05 / 216;

function hashToken(tokenText: string, prevTokenText: string, key: number): number {
  let h = key;
  for (let i = 0; i < prevTokenText.length; i++) {
    h = ((h << 5) - h + prevTokenText.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < tokenText.length; i++) {
    h = ((h << 5) - h + tokenText.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function hashTokenWindow(tokenText: string, context: string[], key: number): number {
  let h = key;
  for (const ctx of context) {
    for (let i = 0; i < ctx.length; i++) {
      h = ((h << 5) - h + ctx.charCodeAt(i)) | 0;
    }
  }
  for (let i = 0; i < tokenText.length; i++) {
    h = ((h << 5) - h + tokenText.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Exported so neutralize.ts can verify a synonym candidate lands in the red list. */
export function computeTokenHash(
  tokenText: string,
  context: string[],
  key: number,
  windowSize: number,
): number {
  return windowSize === 1
    ? hashToken(tokenText, context[0] ?? '', key)
    : hashTokenWindow(tokenText, context, key);
}

/** Exported so neutralize.ts can check list membership for a candidate token. */
export function isGreenList(hash: number, gamma: number): boolean {
  const normalized = (hash % 1000) / 1000;
  return normalized < gamma;
}

function computeZScore(greenCount: number, totalTokens: number, gamma: number): number {
  if (totalTokens === 0) return 0;
  const expected = gamma * totalTokens;
  const variance = gamma * (1 - gamma) * totalTokens;
  if (variance === 0) return 0;
  return (greenCount - expected) / Math.sqrt(variance);
}

function zScoreToPValue(z: number): number {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989422804014327;
  const p = d * Math.exp(-absZ * absZ / 2) *
    (t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))));
  return z > 0 ? p : 1 - p;
}

export function detectWatermark(
  text: string,
  options: {
    gamma?: number;
    windowSize?: number;
    hashKey?: number;
    method?: string;
    tokenizer?: string;
  } = {},
): WatermarkDetectionResult {
  const start = performance.now();
  const gamma = options.gamma ?? 0.5;
  const windowSize = options.windowSize ?? 1;
  const hashKey = options.hashKey ?? 42;
  const method = options.method ?? 'kirchenbauer-approx';
  const tokenizer = options.tokenizer ?? 'simple-word';

  const rawTokens = simpleTokenize(text);
  const tokenInfos: TokenInfo[] = [];
  let greenCount = 0;

  for (let i = windowSize; i < rawTokens.length; i++) {
    const token = rawTokens[i];
    const context = rawTokens.slice(Math.max(0, i - windowSize), i).map(t => t.text);
    const hash = computeTokenHash(token.text, context, hashKey, windowSize);
    const green = isGreenList(hash, gamma);
    if (green) greenCount++;

    tokenInfos.push({
      token: token.text,
      id: token.id,
      position: token.offset,
      isGreenList: green,
      score: (hash % 1000) / 1000,
    });
  }

  const scoredTokens = tokenInfos.length;
  const zScore = computeZScore(greenCount, scoredTokens, gamma);
  const pValue = zScoreToPValue(zScore);

  return {
    method,
    tokenizer,
    totalTokens: scoredTokens,
    greenListHits: greenCount,
    greenListRatio: scoredTokens > 0 ? greenCount / scoredTokens : 0,
    zScore,
    pValue,
    gamma,
    windowSize,
    hashKey,
    hashFunction: 'djb2-chain',
    isSignificant: pValue < BONFERRONI_ALPHA,
    tokens: tokenInfos,
    durationMs: performance.now() - start,
  };
}

/** Expanded sweep: 9 keys × 6 gammas × 4 windows = 216 combinations. */
export function sweepDetection(text: string): WatermarkSweepResult {
  const gammas = [0.25, 0.3, 0.4, 0.5, 0.6, 0.75];
  const windows = [1, 2, 3, 4];
  const keys = [0, 1, 42, 137, 1234, 9999, 31337, 2971, 100003];

  const results: WatermarkDetectionResult[] = [];

  for (const gamma of gammas) {
    for (const windowSize of windows) {
      for (const hashKey of keys) {
        results.push(detectWatermark(text, { gamma, windowSize, hashKey }));
      }
    }
  }

  results.sort((a, b) => b.zScore - a.zScore);
  const best = results[0];

  const bonferroniZ = (BONFERRONI_ALPHA * 216).toExponential(2);
  const summary = best.isSignificant
    ? `Watermark signal detected (z=${best.zScore.toFixed(2)}, p=${best.pValue.toExponential(2)}, Bonferroni-corrected) with gamma=${best.gamma}, window=${best.windowSize}, key=${best.hashKey}`
    : `No significant watermark signal (best z=${best.zScore.toFixed(2)}, α=${bonferroniZ} after Bonferroni correction)`;

  return { results, bestResult: best, summary };
}
