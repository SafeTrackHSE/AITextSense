/**
 * 4-Mode Plagiarism & Originality Engine
 * AI TextSense v3.0.0
 * (c) 2026 Wilson Volpe. All rights reserved.
 */

import type {
  ReferenceDocument,
  ShingleMatchSpan,
  SemanticMatchSpan,
  StyleShiftAnomaly,
  InternalDuplicationSpan,
  OrphanCitation,
  OnlineVerificationHit,
  PlagiarismAnalysisResult,
  PlagiarismOptions,
} from './types';

import { analyzeReferenceShingling } from './shingling';
import { analyzeSemanticParaphrases } from './semantic';
import {
  detectStyleShiftAnomalies,
  detectOrphanCitations,
  detectInternalDuplications,
} from './intrinsic';
import { verifyOnlineSources } from './online';

export * from './types';
export * from './shingling';
export * from './semantic';
export * from './intrinsic';
export * from './online';

/**
 * Unified Plagiarism & Originality Orchestrator
 * Coordinates all 4 analysis modes:
 * Mode 1: 1-to-N Reference Document Shingling & Winnowing
 * Mode 2: Semantic Paraphrase Detection (TF-IDF & On-Device Neural Embeddings)
 * Mode 3: Zero-Reference Intrinsic Style-Shift & Orphan Citation Detection
 * Mode 4: Online Academic (CrossRef) & Web (Wikipedia) Verification
 */
export async function analyzePlagiarism(
  text: string,
  references: ReferenceDocument[] = [],
  options: PlagiarismOptions = {}
): Promise<PlagiarismAnalysisResult> {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      originalityScore: 100,
      plagiarismScore: 0,
      modesRun: {
        referenceShingling: false,
        semanticParaphrase: false,
        intrinsicStyleShift: false,
        onlineVerification: false,
      },
      shingleMatches: [],
      semanticMatches: [],
      intrinsicAnomalies: [],
      internalDuplicates: [],
      orphanCitations: [],
      onlineHits: [],
      summary: {
        highestMatchSource: null,
        highestMatchPercent: 0,
        paraphraseCount: 0,
        styleShiftCount: 0,
        orphanCitationCount: 0,
        onlineHitCount: 0,
      },
      durationMs: 0,
    };
  }

  const hasReferences = references.length > 0;
  const enableShingling = hasReferences;
  const enableSemantic = options.enableSemantic !== false && hasReferences;
  const enableIntrinsic = options.enableIntrinsic !== false;
  const enableOnline = options.enableOnline === true && !options.offlineMode;

  let shingleMatches: ShingleMatchSpan[] = [];
  let highestSimilarity = 0;
  let matchedDocId: string | null = null;

  // Mode 1: Shingling against reference documents
  if (enableShingling) {
    const shingleResult = analyzeReferenceShingling(text, references);
    shingleMatches = shingleResult.matches;
    highestSimilarity = shingleResult.highestSimilarity;
    matchedDocId = shingleResult.matchedDocId;
  }

  // Mode 2: Semantic Paraphrase Detection
  let semanticMatches: SemanticMatchSpan[] = [];
  if (enableSemantic) {
    semanticMatches = await analyzeSemanticParaphrases(text, references, {
      useNeuralEmbeddings: options.useNeuralEmbeddings,
      maxSentencePairs: options.maxSentencePairs,
    });
  }

  // Mode 3: Zero-Reference Intrinsic Originality
  let intrinsicAnomalies: StyleShiftAnomaly[] = [];
  let orphanCitations: OrphanCitation[] = [];
  let internalDuplicates: InternalDuplicationSpan[] = [];

  if (enableIntrinsic) {
    intrinsicAnomalies = detectStyleShiftAnomalies(text, options.intrinsicZThreshold ?? 2.0);
    orphanCitations = detectOrphanCitations(text);
    internalDuplicates = detectInternalDuplications(text);
  }

  // Mode 4: Online Source Verification
  let onlineHits: OnlineVerificationHit[] = [];
  if (enableOnline) {
    onlineHits = await verifyOnlineSources(text, {
      offlineMode: options.offlineMode,
      timeoutMs: options.onlineTimeoutMs,
    });
  }

  // Calculate matched character coverage
  let matchedChars = 0;
  if (shingleMatches.length > 0) {
    // Merge intervals on source text to compute true coverage without double counting
    const intervals = shingleMatches
      .map(m => ({ start: m.sourceStart, end: m.sourceEnd }))
      .sort((a, b) => a.start - b.start);

    let curStart = -1;
    let curEnd = -1;

    for (const iv of intervals) {
      if (curStart === -1) {
        curStart = iv.start;
        curEnd = iv.end;
      } else if (iv.start <= curEnd) {
        curEnd = Math.max(curEnd, iv.end);
      } else {
        matchedChars += curEnd - curStart;
        curStart = iv.start;
        curEnd = iv.end;
      }
    }
    if (curStart !== -1) {
      matchedChars += curEnd - curStart;
    }
  }

  const textLength = text.length || 1;
  const coverageRatio = Math.min(1.0, matchedChars / textLength);

  // Compute Plagiarism & Originality Score
  let plagiarismPoints = coverageRatio * 80;

  // Add points for semantic paraphrases
  if (semanticMatches.length > 0) {
    plagiarismPoints += Math.min(20, semanticMatches.length * 4);
  }

  // Add minor risk penalty for internal duplicates or orphan citations
  if (internalDuplicates.length > 0) {
    plagiarismPoints += Math.min(10, internalDuplicates.length * 3);
  }
  if (orphanCitations.length > 0) {
    plagiarismPoints += Math.min(5, orphanCitations.length * 2);
  }

  const plagiarismScore = Math.min(100, Math.max(0, Math.round(plagiarismPoints)));
  const originalityScore = 100 - plagiarismScore;

  // Match source document name
  const matchedDoc = matchedDocId ? references.find(r => r.id === matchedDocId) : null;
  const highestMatchSource = matchedDoc ? matchedDoc.name : (shingleMatches[0]?.referenceName ?? null);

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    originalityScore,
    plagiarismScore,
    modesRun: {
      referenceShingling: enableShingling,
      semanticParaphrase: enableSemantic,
      intrinsicStyleShift: enableIntrinsic,
      onlineVerification: enableOnline,
    },
    shingleMatches,
    semanticMatches,
    intrinsicAnomalies,
    internalDuplicates,
    orphanCitations,
    onlineHits,
    summary: {
      highestMatchSource,
      highestMatchPercent: Math.round(Math.max(highestSimilarity * 100, coverageRatio * 100)),
      paraphraseCount: semanticMatches.length,
      styleShiftCount: intrinsicAnomalies.length,
      orphanCitationCount: orphanCitations.length,
      onlineHitCount: onlineHits.length,
    },
    durationMs: Math.round((endTime - startTime) * 10) / 10,
  };
}
