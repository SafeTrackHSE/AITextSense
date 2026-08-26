import type { ScanResult } from '../scanner/types';

export interface OptimizerReportSection {
  editsApplied: number;
  rejectedCount: number;
  beforeScore: number;
  afterScore: number;
  durationMs: number;
  summary: string;
}

export interface PollutionReportSection {
  forgedConfigs: number;
  substitutions: number;
  significantHitsAfter: number;
  summary: string;
}

export interface PoisonReportSection {
  mode: string;
  density: string;
  injections: number;
  wordsCovered: number;
}

export interface LmScoreReportSection {
  meanNll: number;
  stdNll: number;
  uniformity: number;
  machineLikelihood: number;
  totalTokens: number;
}

export interface InjectionReportSection {
  riskScore: number;
  severity: string;
  decodedPayloadCount: number;
  findingsCount: number;
  hiddenTokensCount: number;
  topFindings: string[];
}

export interface IntegrityReport {
  version: string;
  application: string;
  author: string;
  copyright: string;
  timestamp: string;
  hashes: {
    originalSha256: string;
    cleanedSha256: string | null;
  };
  textStats: {
    originalChars: number;
    cleanedChars: number | null;
    words: number;
  };
  scanResult: ScanResult | null;
  cleanupResult: {
    mode: string;
    changesCount: number;
    charsRemoved: number;
    charsNormalized: number;
  } | null;
  watermarkResult: {
    method: string;
    zScore: number;
    pValue: number;
    isSignificant: boolean;
    greenListRatio: number;
  } | null;
  footprintResult: {
    overallScore: number;
    confidence: number;
    llmFavoredWords: string[];
    hedgingPhraseCount: number;
  } | null;
  injectionResult: InjectionReportSection | null;
  optimizerResult: OptimizerReportSection | null;
  pollutionResult: PollutionReportSection | null;
  poisonResult: PoisonReportSection | null;
  lmScoreResult: LmScoreReportSection | null;
  cleanupHistory: Array<{ label: string; timestamp: string }>;
}

export type ExportFormat = 'json' | 'csv' | 'pdf';
