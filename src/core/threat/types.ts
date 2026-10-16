import type { RiskSeverity } from '../shared/severity';

/** How a span was found — the extraction method, not the danger category. */
export type ThreatVector =
  | 'fenced-code-block'
  | 'inline-code-span'
  | 'bare-command-line'
  | 'encoded-blob';

export type ThreatSignatureCategory =
  | 'destructive-filesystem'
  | 'network-c2'
  | 'credential-harvesting'
  | 'process-persistence'
  | 'obfuscation-idiom'
  | 'markdown-url-exfil';

/**
 * The core deliverable of this module: a real, forensic-grade explanation of
 * what a piece of code/command would do — not a one-line classifier verdict.
 * Shared by static signatures (always available, offline) and the LLM
 * capability-review pass (online, for payloads the static library doesn't
 * recognize) so the UI and report layers render one shape regardless of source.
 */
export interface ThreatExplanation {
  /** Plain-language category, e.g. "Destructive filesystem operation". */
  category: string;
  /** Precise technical description of what the code/command actually does. */
  mechanism: string;
  /** What it touches: filesystem, credentials, network, process, registry, etc. */
  targets: string[];
  /** Concrete real-world impact if this actually ran. */
  consequence: string;
  /** Why this appears here — social-engineering framing, when the surrounding text gives enough signal to say. */
  context?: string;
  /** What the user should do in response. */
  mitigation: string;
  /** Ids into the Help Glossary (§8.2 of the plan) — e.g. ["reverse-shell", "c2"]. */
  relatedGlossaryTerms: string[];
  source: 'static-signature' | 'llm-capability-review';
  confidence: 'high' | 'medium' | 'low';
}

export type EncodingScheme =
  | 'base64'
  | 'base64url'
  | 'base64-utf16le'
  | 'hex'
  | 'rot13'
  | 'percent'
  | 'charcode'
  | 'escape-hex'
  | 'concat-ladder'
  | 'ps-backtick';

export interface DecodeHop {
  encoding: EncodingScheme;
  input: string;
  output: string;
}

export interface ThreatFinding {
  id: string;
  ruleId: string;
  vector: ThreatVector;
  severity: RiskSeverity;
  span: { start: number; end: number; text: string };
  /** Decode chain that revealed this finding, if it came through decode.ts (raw -> hop 1 -> hop 2 …). Absent for direct matches. */
  decodedFrom?: Array<DecodeHop>;
  /** The always-present explanation. For static-signature findings this is the hand-authored one; for LLM-only findings it is the model's. */
  explanation: ThreatExplanation;
  /**
   * Optional deep-dive from the online AI capability-review pass, attached to a
   * static-signature finding to explain that specific detected payload's
   * mechanism in detail (the offline `explanation` describes the rule/category;
   * this describes THIS payload). Present only when capability review ran and
   * the model returned a usable structured response.
   */
  llmExplanation?: ThreatExplanation;
  /** Set when capability review was attempted for this finding but the model declined / was inconclusive — surfaced honestly, never hidden. */
  llmReviewInconclusive?: string;
}

export interface ThreatAnalysisResult {
  riskScore: number; // 0 to 100, same scale as InjectionAnalysisResult for UI consistency
  severity: RiskSeverity;
  findings: ThreatFinding[];
  spansExtracted: number;
  decodedSpanCount: number;
  capabilityReviewed: boolean;
  durationMs: number;
  killChains?: any[];
  overallAiAssessment?: any;
}

export interface ThreatAnalysisOptions {
  runCapabilityReview?: boolean;
  llmConfig?: import('../llm/types').LLMConfig;
}
