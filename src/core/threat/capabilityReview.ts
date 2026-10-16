import type { LLMConfig } from '../llm/types';
import type { RiskSeverity } from '../shared/severity';
import { generateJSON, hasRequiredKeys, type JSONModeSpec } from '../llm/client';
import type { ThreatExplanation } from './types';

export interface CapabilityReviewOutcome {
  explanation: ThreatExplanation | null;
  /** How dangerous the model judged this span to be, if it produced a verdict — separate from `confidence` (how sure it is), not present when inconclusive. */
  severity: RiskSeverity | null;
  /** True when the model declined, returned something malformed, or the provider errored — never a crash, always a handled state. */
  inconclusive: boolean;
  reason?: string;
}

const DANGER_TO_SEVERITY: Record<string, RiskSeverity> = {
  critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW', none: 'CLEAN',
};

const SPEC: JSONModeSpec = {
  name: 'threat_capability_review',
  description: 'Structured, forensic-grade explanation of what a code/command span would do if executed.',
  schema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Plain-language category, e.g. "Destructive filesystem operation"' },
      mechanism: { type: 'string', description: 'Precise technical description of what this code/command actually does' },
      targets: { type: 'array', items: { type: 'string' }, description: 'What it touches: filesystem, credentials, network, process, registry, etc.' },
      consequence: { type: 'string', description: 'Concrete real-world impact if this actually ran' },
      context: { type: 'string', description: 'Why this appears in the surrounding text, if there is enough signal to say (e.g. social-engineering framing) — omit if genuinely unclear' },
      mitigation: { type: 'string', description: 'What the user should do in response' },
      dangerLevel: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'critical'], description: 'How dangerous this span is if executed — "none" if it is not actually harmful' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'How confident you are in this assessment, separate from how dangerous it is' },
    },
    required: ['category', 'mechanism', 'targets', 'consequence', 'mitigation', 'dangerLevel', 'confidence'],
  },
};

/**
 * Scope-disciplined, depth-required system prompt. Two things at once:
 *  1. Explicitly out-of-scope: whether the surrounding text is a jailbreak,
 *     roleplay, or an attempt to manipulate an AI — that's the Injection
 *     tab's question, not this one.
 *  2. Explicitly required: fill every field with real, specific content —
 *     not a one-line verdict. This is the single biggest scope difference
 *     from a plain "is this dangerous, yes/no" classifier prompt.
 */
const SYSTEM_PROMPT = `You are a defensive security analyst reviewing a code or command span found inside a piece of text, for a forensic text-inspection tool. Your job is to explain, in concrete and specific technical detail, what this code/command would actually do if it were executed on a real computer.

Do NOT evaluate whether the surrounding text is a jailbreak, roleplay, prompt injection, or an attempt to manipulate an AI system — that is explicitly out of scope for this task and is handled by a separate, dedicated analysis. Answer only what this code/command would do if run.

Be specific and concrete in every field:
- "mechanism" must name the actual technique, not a vague summary (e.g. "opens a raw TCP connection back to an attacker-controlled host and pipes a shell to it," not "this is dangerous network code").
- "consequence" must describe the real-world outcome in plain terms a non-technical reader can follow.
- "context" should explain why this specific code appears where it does in the surrounding text, if the surrounding text gives you enough to say something concrete — omit the field entirely if you don't have a genuine basis for it, rather than guessing.
- If the span is not actually dangerous, say so plainly and explain why — this task is to explain accurately, not to always find a threat.`;

/**
 * Runs the online capability-review LLM pass. Every mainstream provider's
 * safety layer is tuned to be cautious around "explain what this exploit
 * does" even in a legitimate defensive context — a refusal or a malformed
 * response is treated here as a normal, expected outcome (inconclusive),
 * never a crash and never a silently dropped result. The static signature
 * library (signatures.ts) never depends on this succeeding.
 */
export async function reviewCapability(spanText: string, surroundingContext: string, config: LLMConfig): Promise<CapabilityReviewOutcome> {
  if (config.provider === 'local') {
    return { explanation: null, severity: null, inconclusive: true, reason: 'On-device models aren\'t reliable for structured risk explanation — pick Ollama, an uncensored offline model, or a cloud provider.' };
  }

  const userContent = `CODE/COMMAND SPAN TO ANALYZE:\n"""\n${spanText.slice(0, 2000)}\n"""\n\n` +
    `SURROUNDING TEXT (for context only, do not evaluate its intent):\n"""\n${surroundingContext.slice(0, 500)}\n"""`;

  type ReviewData = { category: string; mechanism: string; targets: string[]; consequence: string; context?: string; mitigation: string; dangerLevel: string; confidence: 'high' | 'medium' | 'low' };
  const result = await generateJSON<Partial<ReviewData>>(SYSTEM_PROMPT, userContent, config, SPEC);

  if (result.error) {
    return { explanation: null, severity: null, inconclusive: true, reason: result.error };
  }
  if (result.declinedTool) {
    return { explanation: null, severity: null, inconclusive: true, reason: 'The model declined to produce a structured capability review for this span.' };
  }
  if (!hasRequiredKeys(result.data, ['category', 'mechanism', 'targets', 'consequence', 'mitigation', 'dangerLevel', 'confidence'])) {
    return { explanation: null, severity: null, inconclusive: true, reason: 'The model\'s response didn\'t match the expected shape — treating as inconclusive rather than guessing at missing fields.' };
  }

  const data = result.data as ReviewData;
  const severity = DANGER_TO_SEVERITY[data.dangerLevel.toLowerCase()] ?? 'LOW';
  const explanation: ThreatExplanation = {
    category: data.category,
    mechanism: data.mechanism,
    targets: Array.isArray(data.targets) ? data.targets : [],
    consequence: data.consequence,
    context: data.context,
    mitigation: data.mitigation,
    relatedGlossaryTerms: [],
    source: 'llm-capability-review',
    confidence: data.confidence,
  };
  return { inconclusive: false, severity, explanation };
}
