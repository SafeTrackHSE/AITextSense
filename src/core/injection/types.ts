export type InjectionVector =
  | 'ascii-smuggling-tags'
  | 'zero-width-stego'
  | 'bidi-override'
  | 'soft-hyphen-evasion'
  | 'invisible-markdown-exfil';

export type InjectionRiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN';

export interface DecodedPayload {
  id: string;
  vector: InjectionVector;
  title: string;
  rawSnippet: string;
  decodedText: string;
  binaryRepresentation?: string;
  startIndex: number;
  endIndex: number;
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
  semanticEvaluation?: {
    isIntentMalicious: boolean;
    confidence: number;
    explanation: string;
    targetRole?: string;
  };
  durationMs: number;
}

export interface InjectionNeutralizationResult {
  cleanedText: string;
  revealedText: string;
  removedPayloadCount: number;
  strippedVectors: InjectionVector[];
}
