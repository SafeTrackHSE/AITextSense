/**
 * Executive Integrity & Forensic Report Schema
 * AI TextSense v3.0.0
 * (c) 2026 Wilson Volpe. All rights reserved.
 */

import type { ScanResult } from '../scanner/types';
import type { CleanupResult, CleanupHistory } from '../cleanup/types';
import type { WatermarkDetectionResult } from '../watermark/types';
import type { FootprintAnalysis, FootprintRemovalResult } from '../footprint/types';
import type { InjectionAnalysisResult } from '../injection/types';
import type { ThreatAnalysisResult } from '../threat/types';
import type { OptimizerResult } from '../oracle/optimizer';
import type { PollutionResult } from '../spoof/pollution';
import type { PoisonResult } from '../poison/tokenBoundary';
import type { LMScanResult } from '../lm/scorer';
import type { PlagiarismAnalysisResult } from '../plagiarism/types';
import type {
  OptimizerReportSection,
  PollutionReportSection,
  PoisonReportSection,
  LmScoreReportSection,
  InjectionReportSection,
  ThreatReportSection,
  IntegrityReport,
} from './types';

export const REPORT_VERSION = '3.0.0';
export const CURRENT_REPORT_VERSION = '3.0.0';

export interface PlagiarismReportSection {
  originalityScore: number;
  plagiarismScore: number;
  highestMatchSource: string | null;
  highestMatchPercent: number;
  shingleMatchCount: number;
  paraphraseCount: number;
  styleShiftCount: number;
  orphanCitationCount: number;
  onlineHitCount: number;
  topMatches?: Array<{
    source: string;
    similarity: number;
    textSnippet: string;
  }>;
}

export interface FootprintScrubReportSection {
  beforeScore: number;
  afterScore: number;
  transformsApplied: number;
  llmWordsRemoved: number;
  hedgingRemoved: number;
  templatesReplaced: number;
  typographicFixed: number;
}

export interface KillChainReportSection {
  chainsDetected: number;
  chains: Array<{
    id: string;
    title: string;
    severity: string;
    stages: string[];
    riskScore: number;
    description: string;
  }>;
}

export interface AttackBriefing {
  id: string;
  title: string;
  discipline: string;
  severity: string;
  riskScore: number;
  mechanism: string;
  consequence: string;
  mitigation: string;
}

/**
 * Full v3.0.0 Analysis Report structure.
 * Inherits and maintains 100% backwards compatibility with IntegrityReport.
 */
export interface AnalysisReport extends IntegrityReport {
  footprintScrubReport?: FootprintScrubReportSection | null;
  plagiarism?: PlagiarismReportSection | null;
  killChain?: KillChainReportSection | null;
  attackBriefings?: AttackBriefing[] | null;
  scannerVectorExplanations?: AttackBriefing[] | null;
}

/**
 * Unified input to buildReport()
 */
export interface ReportInput {
  originalText: string;
  cleanedText?: string;
  scanResult?: ScanResult | null;
  cleanupResult?: CleanupResult | null;
  watermarkResult?: WatermarkDetectionResult | null;
  footprintResult?: FootprintAnalysis | null;
  footprintRemoval?: FootprintRemovalResult | null;
  footprintScrubReport?: FootprintScrubReportSection | null;
  injectionResult?: InjectionAnalysisResult | null;
  threatResult?: ThreatAnalysisResult | null;
  optimizerResult?: OptimizerResult | null;
  pollutionResult?: PollutionResult | null;
  poisonResult?: PoisonResult | null;
  lmScoreResult?: LMScanResult | null;
  plagiarismResult?: PlagiarismAnalysisResult | null;
  plagiarism?: PlagiarismReportSection | null;
  killChain?: KillChainReportSection | null;
  attackBriefings?: AttackBriefing[] | null;
  history?: CleanupHistory | null;
}

export type {
  OptimizerReportSection,
  PollutionReportSection,
  PoisonReportSection,
  LmScoreReportSection,
  InjectionReportSection,
  ThreatReportSection,
  IntegrityReport,
};
