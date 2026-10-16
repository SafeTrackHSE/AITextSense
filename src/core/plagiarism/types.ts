/**
 * Plagiarism & Originality Suite Type Definitions
 * AI TextSense v3.0.0 — 4-Mode Plagiarism & Originality Engine
 * (c) 2026 Wilson Volpe. All rights reserved.
 */

export interface ReferenceDocument {
  id: string;
  name: string;
  text: string;
  sourceType?: 'pasted' | 'file' | 'web';
  charCount?: number;
  wordCount?: number;
}

export interface ShingleMatchSpan {
  sourceStart: number;
  sourceEnd: number;
  sourceText: string;
  referenceId: string;
  referenceName: string;
  referenceStart: number;
  referenceEnd: number;
  referenceText: string;
  similarity: number; // 0..1 Jaccard / containment
  shingleSize: number; // e.g. 4 or 5
}

export interface SemanticMatchSpan {
  sourceSentence: string;
  sourceStart: number;
  sourceEnd: number;
  referenceSentence: string;
  referenceId: string;
  referenceName: string;
  referenceStart: number;
  referenceEnd: number;
  similarity: number; // cosine similarity >= 0.78
  jaccard: number; // lexical jaccard < 0.5 (confirms it is a paraphrase, not verbatim)
  method: 'tfidf' | 'embedding-neural';
}

export interface StyleShiftAnomaly {
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  zScore: number; // > 2.0
  metrics: {
    ttr: number; // Type-Token Ratio
    meanWordLength: number;
    sentenceLengthVariance: number;
    punctuationDensity: number;
    fleschKincaidGrade: number;
    functionWordFreq: number;
  };
  deviatingFeatures: string[];
}

export interface InternalDuplicationSpan {
  firstStart: number;
  firstEnd: number;
  firstText: string;
  secondStart: number;
  secondEnd: number;
  secondText: string;
  similarity: number;
}

export interface OrphanCitation {
  marker: string; // e.g. "[1]", "(Smith, 2023)", "et al."
  offset: number;
  surroundingContext: string;
  reason: string;
}

export interface OnlineVerificationHit {
  queryPhrase: string;
  source: 'crossref' | 'wikipedia';
  title: string;
  url: string;
  snippet?: string;
  doi?: string;
  authors?: string[];
  year?: number;
  similarityScore: number;
}

export interface PlagiarismAnalysisResult {
  originalityScore: number; // 0..100 (100 = completely original, 0 = entirely plagiarized)
  plagiarismScore: number; // 0..100 (100 - originalityScore)
  modesRun: {
    referenceShingling: boolean;
    semanticParaphrase: boolean;
    intrinsicStyleShift: boolean;
    onlineVerification: boolean;
  };
  shingleMatches: ShingleMatchSpan[];
  semanticMatches: SemanticMatchSpan[];
  intrinsicAnomalies: StyleShiftAnomaly[];
  internalDuplicates: InternalDuplicationSpan[];
  orphanCitations: OrphanCitation[];
  onlineHits: OnlineVerificationHit[];
  summary: {
    highestMatchSource: string | null;
    highestMatchPercent: number;
    paraphraseCount: number;
    styleShiftCount: number;
    orphanCitationCount: number;
    onlineHitCount: number;
  };
  durationMs: number;
}

export interface PlagiarismOptions {
  shingleGramSize?: number; // default 4 or 5
  windowSize?: number; // winnowing window size, default 4
  minSimilarity?: number; // default 0.70 for verbatim shingle
  enableSemantic?: boolean;
  useNeuralEmbeddings?: boolean; // whether to load/use Xenova/all-MiniLM-L6-v2
  enableIntrinsic?: boolean;
  intrinsicZThreshold?: number; // default 2.0
  enableOnline?: boolean;
  offlineMode?: boolean; // if true, skip crossref & wikipedia
  onlineTimeoutMs?: number; // default 5000ms
  maxSentencePairs?: number; // default 500
}

/** Convenient aliases matching architecture plan notations */
export type ReferenceDoc = ReferenceDocument;
export type MatchedPassage = ShingleMatchSpan;
export type IntrinsicAnomaly = StyleShiftAnomaly;
export type WebSourceHit = OnlineVerificationHit;
export type PlagiarismResult = PlagiarismAnalysisResult;
