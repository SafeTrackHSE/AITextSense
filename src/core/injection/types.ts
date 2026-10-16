import type { RiskSeverity } from '../shared/severity';
import type { SemanticEvaluationResult } from './evaluator';

export type InjectionVector =
  | 'ascii-smuggling-tags'
  | 'zero-width-stego'
  | 'variation-selector-stego'
  | 'bidi-override'
  | 'soft-hyphen-evasion'
  | 'invisible-markdown-exfil'
  /** No covert channel involved — an injection trigger phrase found directly in visible text. Added when the visible-text scan (§5.1) stopped being gated on an invisible payload existing first. */
  | 'plain-text-trigger';

/** Re-exported from the shared severity scale (`core/shared/severity.ts`) so existing imports keep working. */
export type InjectionRiskSeverity = RiskSeverity;

export interface DecodedPayload {
  id: string;
  vector: InjectionVector;
  title: string;
  rawSnippet: string;
  decodedText: string;
  binaryRepresentation?: string;
  startIndex: number;
  endIndex: number;
  utf16Start?: number;
  utf16End?: number;
  byteOffset: number;
  severity: InjectionRiskSeverity;
  description: string;
}

export interface InjectionFinding {
  id: string;
  ruleId: string;
  vector: InjectionVector;
  title: string;
  severity: InjectionRiskSeverity;
  description: string;
  snippet: string;
  extractedCommand?: string;
  mitigation: string;
}

export interface TokenizerImpact {
  originalCharCount: number;
  cleanedCharCount: number;
  estimatedRawTokens: number;
  estimatedCleanedTokens: number;
  tokenDifference: number;
  affectedTokenBoundaries: number;
}

export interface InjectionAnalysisResult {
  riskScore: number; // 0 to 100
  severity: InjectionRiskSeverity;
  findings: InjectionFinding[];
  decodedPayloads: DecodedPayload[];
  tokenizerImpact: TokenizerImpact;
  semanticEvaluation?: SemanticEvaluationResult;
  durationMs: number;
}

export interface InjectionNeutralizationResult {
  cleanedText: string;
  revealedText: string;
  removedPayloadCount: number;
  strippedVectors: InjectionVector[];
}
