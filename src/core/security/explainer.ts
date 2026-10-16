import type { RiskSeverity } from '../shared/severity';
import type { LLMConfig } from '../llm/types';
import { generateJSON, type JSONModeSpec } from '../llm/client';
import type { ThreatFinding } from '../threat/types';
import type { InjectionFinding, DecodedPayload } from '../injection/types';
import type { CharFinding, StegoPattern, MixedScriptRun, BidiIssue } from '../scanner/types';

export interface AttackVectorBriefing {
  id: string;
  vectorName: string;
  discipline: 'scanner' | 'injection' | 'threat' | 'kill-chain';
  severity: RiskSeverity;
  riskScore: number; // 0..100
  mechanism: string;
  whatItDoes: string;
  targets: string[];
  context?: string;
  mitigation: string;
  source: 'deterministic-forensic' | 'on-device-ai' | 'local-llm' | 'cloud-llm';
  confidence: 'high' | 'medium' | 'low';
  relatedGlossaryTerms: string[];
}

export type AttackVectorExplanation = AttackVectorBriefing;

/**
 * Builds a deterministic, forensic-grade briefing for any finding across
 * Scanner, Injection, or Threat disciplines without requiring an LLM call.
 */
export function buildDeterministicBriefing(
  finding: any,
  discipline: 'scanner' | 'injection' | 'threat' | 'kill-chain'
): AttackVectorBriefing {
  if (discipline === 'kill-chain') {
    return {
      id: finding?.id ?? 'KILL-CHAIN-GENERIC',
      vectorName: finding?.vectorName ?? 'Compound Multi-Stage Kill-Chain',
      discipline: 'kill-chain',
      severity: finding?.severity ?? 'CRITICAL',
      riskScore: finding?.riskScore ?? 95,
      mechanism: finding?.mechanism ?? 'Compound attack sequence combining multiple techniques within the same document.',
      whatItDoes: finding?.whatItDoes ?? 'Coordinates initial access or obfuscation with secondary execution and persistence.',
      targets: finding?.targets ?? ['Operating System', 'Network', 'Credentials'],
      context: finding?.context ?? 'Multiple correlated threats detected in document.',
      mitigation: finding?.mitigation ?? 'Isolate document and do not execute contained instructions or scripts.',
      source: 'deterministic-forensic',
      confidence: 'high',
      relatedGlossaryTerms: finding?.relatedGlossaryTerms ?? ['c2', 'persistence'],
    };
  }

  if (discipline === 'scanner') {
    const f = finding as (Partial<CharFinding> & Partial<StegoPattern> & Partial<MixedScriptRun> & Partial<BidiIssue>);
    const charClass = f.charClass;

    if (charClass === 'tag-char' || (f.codePoint && f.codePoint >= 0xe0000 && f.codePoint <= 0xe007f)) {
      return {
        id: `VEC-SCAN-TAG-${f.codePointHex ?? 'E0000'}`,
        vectorName: 'High-Plane ASCII Tag Smuggling',
        discipline: 'scanner',
        severity: 'CRITICAL',
        riskScore: 90,
        mechanism: 'Embeds Unicode Tag Characters (U+E0000–U+E007F) which map 1:1 to visible ASCII characters (cp - 0xE0000) while rendering completely invisible in UI text editors.',
        whatItDoes: 'Smuggles hidden system instructions, jailbreaks, or exfiltration commands past human reviewers into downstream LLM tokenizers.',
        targets: ['LLM Tokenizer', 'System Prompt', 'Guardrails'],
        context: 'Invisible characters positioned within user-submitted text.',
        mitigation: 'Strip high-plane Unicode tag characters using the Clean Invisible Characters action.',
        source: 'deterministic-forensic',
        confidence: 'high',
        relatedGlossaryTerms: ['ascii-smuggling', 'tag-characters'],
      };
    }

    if (charClass === 'zero-width' || f.decodedBits !== undefined) {
      return {
        id: 'VEC-SCAN-ZWS-STEGO',
        vectorName: 'Covert Zero-Width Steganographic Bitstream',
        discipline: 'scanner',
        severity: 'CRITICAL',
        riskScore: 85,
        mechanism: 'Encodes binary data into sequences of non-rendering zero-width spaces (U+200B), non-joiners (U+200C), joiners (U+200D), or BOMs (U+FEFF).',
        whatItDoes: 'Transmits concealed text payloads, watermarks, or prompts that remain completely imperceptible to visual inspection.',
        targets: ['Visual Text Inspection', 'Ingress Filtering', 'LLM Prompt Context'],
        context: 'Steganographic bitstream concealed in text whitespace or words.',
        mitigation: 'Neutralize zero-width stego sequences or unmask them using the Reveal mode.',
        source: 'deterministic-forensic',
        confidence: 'high',
        relatedGlossaryTerms: ['zero-width-characters', 'steganography'],
      };
    }

    if (charClass === 'bidi-control' || f.type?.includes('unbalanced')) {
      return {
        id: 'VEC-SCAN-TROJAN-SOURCE',
        vectorName: 'Trojan Source Visual Ordering Reversal',
        discipline: 'scanner',
        severity: 'HIGH',
        riskScore: 80,
        mechanism: 'Injects bidirectional algorithm controls (RLO U+202E, LRO U+202D) to invert the rendered display order of words relative to their underlying execution order.',
        whatItDoes: 'Disguises malicious code parameters or commands to appear benign to visual code reviewers while executing in reverse.',
        targets: ['Code Reviewers', 'Terminal Renderers', 'Command Parsers'],
        context: 'Bidi control overrides found in text or code snippets.',
        mitigation: 'Strip Bidi overrides and verify underlying logical character byte order.',
        source: 'deterministic-forensic',
        confidence: 'high',
        relatedGlossaryTerms: ['trojan-source', 'bidi-overrides'],
      };
    }

    if (charClass === 'homoglyph' || f.scripts !== undefined) {
      return {
        id: 'VEC-SCAN-HOMOGLYPH',
        vectorName: 'Homoglyph Mixed-Script Spoofing',
        discipline: 'scanner',
        severity: 'MEDIUM',
        riskScore: 65,
        mechanism: 'Substitutes Latin characters with visually identical glyphs from Cyrillic, Greek, or other Unicode scripts.',
        whatItDoes: 'Bypasses lexical blocklists and signature detectors while visually deceiving users into believing words are authentic.',
        targets: ['Lexical Blocklists', 'Domain Verification', 'Human Readers'],
        context: 'Mixed-script run detected within single word token.',
        mitigation: 'Normalize confusable characters to standard Latin equivalents.',
        source: 'deterministic-forensic',
        confidence: 'high',
        relatedGlossaryTerms: ['homoglyphs', 'confusables'],
      };
    }

    if (charClass === 'variation-selector') {
      return {
        id: 'VEC-SCAN-VS-STEGO',
        vectorName: 'Variation Selector Steganography',
        discipline: 'scanner',
        severity: 'HIGH',
        riskScore: 78,
        mechanism: 'Chains contiguous Unicode Variation Selectors (U+FE00–U+FE0F or U+E0100–U+E01EF) to smuggle binary nibbles or bytes.',
        whatItDoes: 'Hides arbitrary data streams inside normal text or emojis without rendering visible glyph differences.',
        targets: ['Content Moderation', 'Unicode Filters'],
        context: 'Contiguous run of variation selectors.',
        mitigation: 'Strip redundant variation selectors that do not modify legitimate preceding emoji characters.',
        source: 'deterministic-forensic',
        confidence: 'high',
        relatedGlossaryTerms: ['variation-selectors', 'steganography'],
      };
    }

    // Default Scanner fallback
    return {
      id: `VEC-SCAN-${charClass ?? 'ANOMALY'}`,
      vectorName: f.name ?? 'Unicode Character Anomaly',
      discipline: 'scanner',
      severity: (f.risk as RiskSeverity) ?? 'MEDIUM',
      riskScore: 50,
      mechanism: f.description ?? 'Unusual Unicode character representation identified in document text.',
      whatItDoes: 'Alters document tokenization, rendering, or parsing behavior.',
      targets: ['Tokenizer', 'Text Renderer'],
      context: f.context,
      mitigation: 'Review finding in Scanner tab and remove if non-essential.',
      source: 'deterministic-forensic',
      confidence: 'medium',
      relatedGlossaryTerms: ['unicode-hygiene'],
    };
  }

  if (discipline === 'injection') {
    const f = finding as (Partial<InjectionFinding> & Partial<DecodedPayload>);
    const title = f.title ?? f.vector ?? 'Prompt Injection';

    return {
      id: f.id ?? f.ruleId ?? 'VEC-INJ-GENERIC',
      vectorName: title,
      discipline: 'injection',
      severity: (f.severity as RiskSeverity) ?? 'HIGH',
      riskScore: f.severity === 'CRITICAL' ? 92 : (f.severity === 'HIGH' ? 78 : 50),
      mechanism: f.description ?? 'Adversarial instruction sequence engineered to hijack LLM guardrails or control flow.',
      whatItDoes: 'Forces the receiving language model to discard developer system prompts, alter personality, or exfiltrate conversation data.',
      targets: ['System Prompt', 'Role Enforcement', 'Tool Invocation'],
      context: f.snippet ?? f.rawSnippet,
      mitigation: f.mitigation ?? 'Neutralize injection payloads before passing text to downstream LLM contexts.',
      source: 'deterministic-forensic',
      confidence: 'high',
      relatedGlossaryTerms: ['prompt-injection', 'jailbreak'],
    };
  }

  // Discipline: 'threat'
  const f = finding as Partial<ThreatFinding>;
  const exp = f.explanation;

  return {
    id: f.id ?? f.ruleId ?? 'VEC-THREAT-GENERIC',
    vectorName: exp?.category ?? f.ruleId ?? 'Executable Threat Payload',
    discipline: 'threat',
    severity: f.severity ?? 'HIGH',
    riskScore: f.severity === 'CRITICAL' ? 95 : (f.severity === 'HIGH' ? 80 : 50),
    mechanism: exp?.mechanism ?? 'Executable shell command or script capable of compromising workstation security.',
    whatItDoes: exp?.consequence ?? 'Executes unauthorized operating system actions if run in a terminal or shell.',
    targets: exp?.targets ?? ['Operating System', 'Process'],
    context: exp?.context,
    mitigation: exp?.mitigation ?? 'Do not execute this command. Inspect the surrounding context in a disposable sandbox.',
    source: exp?.source === 'llm-capability-review' ? 'cloud-llm' : 'deterministic-forensic',
    confidence: exp?.confidence ?? 'high',
    relatedGlossaryTerms: exp?.relatedGlossaryTerms ?? ['pipe-to-shell', 'c2'],
  };
}

/**
 * Synthesizes cross-tab multi-step kill chains by correlating findings across
 * Threat, Injection, and Scanner results within the same document.
 */
export function synthesizeKillChain(
  threatFindings: ThreatFinding[] = [],
  injectionFindings: InjectionFinding[] = [],
  decodedPayloads: DecodedPayload[] = [],
): AttackVectorBriefing[] {
  const chains: AttackVectorBriefing[] = [];

  const hasCredHarvesting = threatFindings.some(f =>
    f.explanation?.category?.toLowerCase().includes('credential') ||
    f.ruleId?.includes('CRED')
  );
  const hasNetC2 = threatFindings.some(f =>
    f.explanation?.category?.toLowerCase().includes('network') ||
    f.ruleId?.includes('NET') ||
    f.ruleId?.includes('PIPE') ||
    f.ruleId?.includes('CRADLE')
  );
  const hasExfil = hasNetC2 ||
    threatFindings.some(f => f.ruleId?.includes('EXFIL') || f.ruleId?.includes('MD')) ||
    injectionFindings.some(f => f.vector === 'invisible-markdown-exfil');
  const hasObfuscation = threatFindings.some(f =>
    f.ruleId?.includes('OBF') || (f.decodedFrom && f.decodedFrom.length > 0)
  ) || decodedPayloads.length > 0;
  const hasProcPersist = threatFindings.some(f =>
    f.ruleId?.includes('PROC') ||
    f.ruleId?.includes('PERSIST') ||
    f.ruleId?.includes('CRADLE')
  );
  const hasDownload = threatFindings.some(f =>
    f.ruleId?.includes('PIPE') ||
    f.ruleId?.includes('CRADLE') ||
    f.span?.text?.toLowerCase().includes('download') ||
    f.span?.text?.toLowerCase().includes('curl') ||
    f.span?.text?.toLowerCase().includes('wget')
  );

  // Kill-Chain 1: THR-CHAIN-CRED-EXFIL
  if (hasCredHarvesting && hasExfil) {
    chains.push({
      id: 'THR-CHAIN-CRED-EXFIL',
      vectorName: 'Active Credential Harvesting & Exfiltration Kill-Chain',
      discipline: 'kill-chain',
      severity: 'CRITICAL',
      riskScore: 98,
      mechanism: 'Combines unauthorized credential file access (AWS keys, SSH keys, browser vaults) with outbound network transmission or markdown beacon exfiltration.',
      whatItDoes: 'Silently accesses sensitive authentication credentials and exfiltrates them to an external attacker-controlled server.',
      targets: ['Credentials', 'Cloud Infrastructure', 'Network Gateway'],
      context: 'Multi-stage exploit sequence detected within the same document payload.',
      mitigation: 'Immediately revoke leaked credentials and API tokens. Block outbound HTTP/POST traffic and examine process audit logs.',
      source: 'deterministic-forensic',
      confidence: 'high',
      relatedGlossaryTerms: ['credential-harvesting', 'exfiltration', 'c2'],
    });
  }

  // Kill-Chain 2: THR-CHAIN-OBF-EXEC
  if (hasObfuscation && (hasProcPersist || hasNetC2)) {
    chains.push({
      id: 'THR-CHAIN-OBF-EXEC',
      vectorName: 'Obfuscated Payload Execution Kill-Chain',
      discipline: 'kill-chain',
      severity: 'CRITICAL',
      riskScore: 95,
      mechanism: 'Utilizes encoded blobs (Base64, UTF-16LE, character code arrays, or covert Unicode steganography) to smuggle and dynamically execute shell commands.',
      whatItDoes: 'Bypasses static ingress filters and anti-malware scanners to deploy unauthorized system commands or remote access shells.',
      targets: ['Process Spawning', 'Memory', 'Operating System Shell'],
      context: 'Layered evasion pattern combining obfuscated delivery with dynamic process execution.',
      mitigation: 'Quarantine document immediately. Do not execute unverified commands from terminal or scripts. Inspect decoded payloads in an isolated sandbox.',
      source: 'deterministic-forensic',
      confidence: 'high',
      relatedGlossaryTerms: ['obfuscation', 'evasion', 'pipe-to-shell'],
    });
  }

  // Kill-Chain 3: THR-CHAIN-DROPPER-PERSIST
  if (hasDownload && hasProcPersist) {
    chains.push({
      id: 'THR-CHAIN-DROPPER-PERSIST',
      vectorName: 'Remote Dropper & Persistence Kill-Chain',
      discipline: 'kill-chain',
      severity: 'CRITICAL',
      riskScore: 94,
      mechanism: 'Coordinates remote payload download (PowerShell cradle, curl pipe, or BitsTransfer) with automated persistence (scheduled tasks or registry run keys).',
      whatItDoes: 'Fetches second-stage malicious payloads from external sources and establishes permanent startup hooks on the victim workstation.',
      targets: ['Registry', 'Task Scheduler', 'Filesystem', 'Network'],
      context: 'Text contains coordinated remote installation instructions designed to achieve permanent operational control.',
      mitigation: 'Audit scheduled tasks (schtasks /query) and Windows Run keys. Terminate spawned interpreter processes and restrict outbound script downloads.',
      source: 'deterministic-forensic',
      confidence: 'high',
      relatedGlossaryTerms: ['c2', 'persistence', 'pipe-to-shell'],
    });
  }

  return chains;
}

/**
 * AI-powered attack vector explainer. Governed by the mandatory privacy gate rule:
 * `const canRunAI = llmConfig.enabled && (llmConfig.provider === 'local' || !offlineMode);`
 */
export async function explainAttackVectorWithAI(
  finding: any,
  discipline: 'scanner' | 'injection' | 'threat',
  config: LLMConfig,
  offlineMode: boolean = false
): Promise<AttackVectorBriefing> {
  const fallback = buildDeterministicBriefing(finding, discipline);

  const canRunAI = config.enabled && (config.provider === 'local' || !offlineMode);
  if (!canRunAI) {
    return fallback;
  }

  if (config.provider === 'local') {
    return fallback;
  }

  const SPEC: JSONModeSpec = {
    name: 'security_attack_vector_explanation',
    description: 'Forensic attack vector briefing detailing technical mechanism, concrete impact, targets, and mitigation.',
    schema: {
      type: 'object',
      properties: {
        vectorName: { type: 'string' },
        severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CLEAN'] },
        riskScore: { type: 'number', description: '0 to 100' },
        mechanism: { type: 'string', description: 'Step-by-step how the attack vector operates technically' },
        whatItDoes: { type: 'string', description: 'Concrete real-world consequence' },
        targets: { type: 'array', items: { type: 'string' } },
        context: { type: 'string' },
        mitigation: { type: 'string' },
      },
      required: ['vectorName', 'severity', 'mechanism', 'whatItDoes', 'targets', 'mitigation'],
    },
  };

  const sysPrompt = `You are a Principal Security Forensic Engineer and Exploit Analyst.
Analyze the provided finding from discipline '${discipline}' and provide an authoritative, technically precise forensic briefing.`;

  const findingSnippet = typeof finding === 'object' && finding !== null
    ? JSON.stringify(finding, null, 2).slice(0, 2000)
    : String(finding);

  const userContent = `FINDING DATA:\n"""\n${findingSnippet}\n"""\n\nExplain the attack vector, mechanism, concrete real-world risk, targets, and remediation.`;

  try {
    const res = await generateJSON<Partial<AttackVectorBriefing>>(sysPrompt, userContent, config, SPEC);
    if (res.data && res.data.mechanism && res.data.whatItDoes) {
      const source = ((config.provider as string) === 'local' || config.provider === 'uncensored-offline')
        ? 'on-device-ai'
        : config.provider === 'ollama'
        ? 'local-llm'
        : 'cloud-llm';

      return {
        ...fallback,
        vectorName: res.data.vectorName ?? fallback.vectorName,
        severity: res.data.severity ?? fallback.severity,
        riskScore: typeof res.data.riskScore === 'number' ? res.data.riskScore : fallback.riskScore,
        mechanism: res.data.mechanism,
        whatItDoes: res.data.whatItDoes,
        targets: Array.isArray(res.data.targets) ? res.data.targets : fallback.targets,
        context: res.data.context ?? fallback.context,
        mitigation: res.data.mitigation ?? fallback.mitigation,
        source,
        confidence: 'high',
      };
    }
  } catch {
    /* fallback gracefully on error */
  }

  return fallback;
}
