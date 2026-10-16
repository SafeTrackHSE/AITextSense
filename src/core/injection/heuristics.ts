import type { DecodedPayload, InjectionFinding, InjectionRiskSeverity } from './types';

interface SignatureRule {
  id: string;
  name: string;
  pattern: RegExp;
  severity: InjectionRiskSeverity;
  description: string;
  mitigation: string;
}

const INJECTION_SIGNATURES: SignatureRule[] = [
  {
    id: 'SIG-SYS-OVERRIDE',
    name: 'System Instruction Override / Hijack',
    pattern: /(?:ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions|disregard\s+(?:all\s+)?(?:previous|system)\s+prompts|new\s+system\s+prompt|you\s+are\s+now\s+in\s+developer\s+mode)/i,
    severity: 'CRITICAL',
    description: 'Adversarial attempt to nullify system prompt constraints and reset model persona.',
    mitigation: 'Strip all invisible characters and enforce immutable system role boundaries.',
  },
  {
    id: 'SIG-DELIMITER-SMUGGLING',
    name: 'LLM Role Delimiter Smuggling',
    pattern: /(?:<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<system>|<\/system>|system:\s*|assistant:\s*|human:\s*|<<SYS>>|<\/SYS>>)/i,
    severity: 'CRITICAL',
    description: 'Direct injection of proprietary chat template delimiters (ChatML, Llama-style, Anthropic Human/Assistant tags).',
    mitigation: 'Escape or sanitize raw structural role tokens in user inputs.',
  },
  {
    id: 'SIG-JAILBREAK-IDENTITY',
    name: 'Jailbreak Persona Trigger (DAN / Developer Mode)',
    pattern: /(?:\bDAN\b|Do\s+Anything\s+Now|AIM\s+mode|jailbreak|unfiltered\s+mode|bypass\s+safety|evil\s+twin)/i,
    severity: 'HIGH',
    description: 'Invokes known jailbreak frameworks designed to disable safety filters.',
    mitigation: 'Filter out known jailbreak archetypes and inspect decoded payloads.',
  },
];

// SIG-DATA-EXFIL and SIG-CODE-EXEC were migrated to core/threat/signatures.ts
// (THR-NET-ENCODED-EXFIL-POST, THR-FS-RECURSIVE-DELETE, THR-FS-DISK-WIPE,
// THR-PROC-DYNAMIC-EXEC, THR-NET-PIPE-EXEC and related) — those are about
// code-execution/exfiltration danger, not covert-channel/jailbreak-trigger
// detection, so they belong in the Threat module, which also runs
// unconditionally rather than gated behind a payload already being found here.

export function evaluateHeuristicSignatures(
  payloads: DecodedPayload[],
  fullText: string
): InjectionFinding[] {
  const findings: InjectionFinding[] = [];

  // Check each decoded payload (the hidden text!)
  for (const payload of payloads) {
    const textToTest = payload.decodedText;
    for (const sig of INJECTION_SIGNATURES) {
      const match = sig.pattern.exec(textToTest);
      if (match) {
        findings.push({
          id: `${sig.id}-${payload.id}`,
          ruleId: sig.id,
          vector: payload.vector,
          title: sig.name,
          severity: sig.severity,
          description: `${sig.description} Found inside decoded payload: "${match[0]}"`,
          snippet: payload.decodedText,
          extractedCommand: match[0],
          mitigation: sig.mitigation,
        });
      }
    }
  }

  // Scan the visible text for injection trigger phrases unconditionally — a plain-text
  // "ignore all previous instructions" prompt with no invisible Unicode payload must
  // still score above CLEAN. This used to be gated on `payloads.length > 0`, which meant
  // the single most common form of prompt injection (plain visible text, no covert
  // channel at all) was never actually detected. See plan §1.1 / §5.1.
  for (const sig of INJECTION_SIGNATURES) {
    const match = sig.pattern.exec(fullText);
    if (!match || findings.some(f => f.ruleId === sig.id)) continue;

    const coordinated = payloads.length > 0;
    findings.push({
      id: `${sig.id}-visible`,
      ruleId: sig.id,
      vector: coordinated ? payloads[0].vector : 'plain-text-trigger',
      title: coordinated ? `Coordinated Attack: ${sig.name}` : sig.name,
      severity: sig.severity,
      description: coordinated
        ? `Visible text contains injection trigger words while paired with ${payloads.length} invisible payload(s).`
        : `Visible text contains an injection trigger phrase directly, with no invisible Unicode payload involved.`,
      snippet: match[0],
      extractedCommand: match[0],
      mitigation: sig.mitigation,
    });
  }

  return findings;
}

export function computeOverallRisk(
  payloads: DecodedPayload[],
  findings: InjectionFinding[]
): { riskScore: number; severity: InjectionRiskSeverity } {
  if (payloads.length === 0 && findings.length === 0) {
    return { riskScore: 0, severity: 'CLEAN' };
  }

  let score = 0;

  // Base score for presence of invisible payload
  for (const p of payloads) {
    if (p.vector === 'ascii-smuggling-tags') score += 40;
    else if (p.vector === 'zero-width-stego') score += 30;
    else if (p.vector === 'invisible-markdown-exfil') score += 45;
    else if (p.vector === 'bidi-override') score += 25;
    else if (p.vector === 'soft-hyphen-evasion') score += 15;
  }

  // Multiply by findings severity
  for (const f of findings) {
    if (f.severity === 'CRITICAL') score += 50;
    else if (f.severity === 'HIGH') score += 30;
    else if (f.severity === 'MEDIUM') score += 15;
    else score += 5;
  }

  const normalizedScore = Math.min(100, Math.max(0, score));

  let severity: InjectionRiskSeverity = 'LOW';
  if (normalizedScore >= 75 || findings.some(f => f.severity === 'CRITICAL')) {
    severity = 'CRITICAL';
  } else if (normalizedScore >= 50 || findings.some(f => f.severity === 'HIGH')) {
    severity = 'HIGH';
  } else if (normalizedScore >= 25) {
    severity = 'MEDIUM';
  } else if (normalizedScore > 0) {
    severity = 'LOW';
  } else {
    severity = 'CLEAN';
  }

  return { riskScore: normalizedScore, severity };
}
