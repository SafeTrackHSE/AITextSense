export interface TokenInfo {
  token: string;
  id: number;
  position: number;
  isGreenList: boolean;
  score: number;
}

export interface WatermarkDetectionResult {
  method: string;
  tokenizer: string;
  totalTokens: number;
  greenListHits: number;
  greenListRatio: number;
  zScore: number;
  pValue: number;
  gamma: number;
  windowSize: number;
  hashKey: number;
  hashFunction: string;
  isSignificant: boolean;
  tokens: TokenInfo[];
  durationMs: number;
}

export interface WatermarkSweepResult {
  results: WatermarkDetectionResult[];
  bestResult: WatermarkDetectionResult;
  summary: string;
}

export interface NeutralizationSuggestion {
  tokenIndex: number;
  originalToken: string;
  originalPosition: number;
  alternatives: SynonymAlternative[];
  strategy: 'synonym' | 'reorder' | 'homoglyph' | 'whitespace';
}

export interface SynonymAlternative {
  text: string;
  similarity: number;
  source: string;
}

export interface NeutralizationResult {
  original: string;
  neutralized: string;
  suggestions: NeutralizationSuggestion[];
  appliedCount: number;
  beforeZScore: number;
  afterZScore: number;
  iterationCount: number;
  durationMs: number;
}

export interface NeutralizationOptions {
  strategies: Set<'synonym' | 'reorder' | 'homoglyph' | 'whitespace'>;
  intensity: 'light' | 'moderate' | 'heavy';
  preserveMeaning: boolean;
}

export const DEFAULT_NEUTRALIZATION_OPTIONS: NeutralizationOptions = {
  strategies: new Set(['synonym', 'reorder', 'whitespace']),
  intensity: 'moderate',
  preserveMeaning: true,
};
