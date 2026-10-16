import type { LLMConfig } from '../llm/types';
import type { ThreatFinding } from './types';
import { reviewCapability, type CapabilityReviewOutcome } from './capabilityReview';
import {
  explainAttackVectorWithAI,
  synthesizeKillChain,
  buildDeterministicBriefing,
  type AttackVectorBriefing,
} from '../security/explainer';

export { reviewCapability, type CapabilityReviewOutcome };
export { synthesizeKillChain, buildDeterministicBriefing, type AttackVectorBriefing };

/**
 * Explains a detected ThreatFinding using on-device or configured LLM models,
 * governed by the privacy gate rule.
 */
export async function explainThreatWithAI(
  finding: ThreatFinding,
  config: LLMConfig,
  offlineMode: boolean = false
): Promise<AttackVectorBriefing> {
  return explainAttackVectorWithAI(finding, 'threat', config, offlineMode);
}
