export interface FootprintAnalysis {
  perplexityProfile: PerplexityProfile;
  burstiness: BurstinessResult;
  repetition: RepetitionResult;
  vocabulary: VocabularyResult;
  overallScore: number;
  confidence: number;
  durationMs: number;
}

export interface PerplexityProfile {
  mean: number;
  stddev: number;
  uniformity: number;
  windowScores: number[];
}

export interface BurstinessResult {
  sentenceLengthVariance: number;
  sentenceLengthMean: number;
  burstinessScore: number;
  ttrWindowed: number[];
  ttrMean: number;
}

export interface RepetitionResult {
  bigramRepeatRatio: number;
  trigramRepeatRatio: number;
  hedgingPhrases: FoundPattern[];
  templatePhrases: FoundPattern[];
  structuralUniformity: number;
}

export interface FoundPattern {
  pattern: string;
  occurrences: number;
  positions: number[];
}

export interface VocabularyResult {
  typeTokenRatio: number;
  hapaxRatio: number;
  llmFavoredCount: number;
  llmFavoredWords: string[];
  humanFavoredCount: number;
}

export interface FootprintTransform {
  type: 'sentence-combine' | 'sentence-split' | 'active-passive' | 'clause-reorder' | 'synonym-rotate';
  originalSpan: { start: number; end: number; text: string };
  replacement: string;
  impact: number;
  reason: string;
}

export interface FootprintRemovalResult {
  original: string;
  modified: string;
  transforms: FootprintTransform[];
  beforeScore: number;
  afterScore: number;
  durationMs: number;
}
