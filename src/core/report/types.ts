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

/**
 * Unlike InjectionReportSection.topFindings (titles only), this carries the
 * full explanation per finding — a PDF handed to a stakeholder needs to stand
 * on its own without the app open next to it. See plan §6.
 */
export interface ThreatReportSection {
  riskScore: number;
  severity: string;
  findingsCount: number;
  spansExtracted: number;
  decodedSpanCount: number;
  capabilityReviewed: boolean;
  findings: Array<{
    ruleId: string;
    severity: string;
    category: string;
    mechanism: string;
    targets: string[];
    consequence: string;
    context?: string;
    mitigation: string;
    source: string;
    confidence: string;
    /** Detailed AI deep-dive explanation of this specific payload, when the online capability-review pass ran. */
    aiDeepDive?: { mechanism: string; consequence: string; mitigation: string; confidence: string };
  }>;
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
  threatResult: ThreatReportSection | null;
  optimizerResult: OptimizerReportSection | null;
  pollutionResult: PollutionReportSection | null;
  poisonResult: PoisonReportSection | null;
  lmScoreResult: LmScoreReportSection | null;
  cleanupHistory: Array<{ label: string; timestamp: string }>;
}

export type ExportFormat = 'json' | 'csv' | 'pdf';
