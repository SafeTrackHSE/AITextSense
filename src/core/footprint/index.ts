export { analyzeFootprint } from './analysis';
export {
  removeFootprint,
  scrubAllAIFingerprints,
  scrubAllFingerprints,
  maskProtectedSpans,
  unmaskProtectedSpans,
  restoreProtectedSpans,
  normalizeTypographicTells,
  type ScrubFingerprintOptions,
  type FingerprintRemovalBreakdown,
  type AIFingerprintScrubReport,
} from './removal';
export {
  detectTypographicTells,
  computeSentenceFingerprintHeatmap,
  type TypographicProfile,
  type SentenceFingerprint,
  type SentenceFingerprintOverlay,
} from './detector';
export {
  LLM_FAVORED,
  LLM_FAVORED_LIST,
  HEDGING_PATTERNS,
  TEMPLATE_PATTERNS,
  TEMPLATE_REWRITES,
} from './patterns';
export type {
  FootprintAnalysis,
  PerplexityProfile,
  BurstinessResult,
  RepetitionResult,
  VocabularyResult,
  FoundPattern,
  FootprintTransform,
  FootprintRemovalResult,
} from './types';
