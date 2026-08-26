import type {
  InjectionAnalysisResult,
  InjectionNeutralizationResult,
  InjectionVector,
  TokenizerImpact,
} from './types';
import {
  decodeTagCharacters,
  decodeZeroWidthStego,
  decodeBidiReversal,
  detectKeywordSplitting,
  detectMarkdownExfil,
} from './decoders';
import { evaluateHeuristicSignatures, computeOverallRisk } from './heuristics';
import { evaluateSemanticInjection } from './evaluator';
import type { LLMConfig } from '../llm/types';

export * from './types';
export * from './decoders';
export * from './heuristics';
export * from './evaluator';

/**
 * Executes a full forensic prompt injection and invisible character scan on text.
 */
export async function analyzeInjection(
  text: string,
  options: {
    llmConfig?: LLMConfig;
    runSemanticEval?: boolean;
  } = {}
): Promise<InjectionAnalysisResult> {
  const start = performance.now();

  if (!text || text.trim().length === 0) {
    return {
      riskScore: 0,
      severity: 'CLEAN',
      findings: [],
      decodedPayloads: [],
      tokenizerImpact: {
        originalCharCount: 0,
        cleanedCharCount: 0,
        estimatedRawTokens: 0,
        estimatedCleanedTokens: 0,
        tokenDifference: 0,
        affectedTokenBoundaries: 0,
      },
      durationMs: 0,
    };
  }

  // 1. Run all decoders
  const tagPayloads = decodeTagCharacters(text);
  const zwsPayloads = decodeZeroWidthStego(text);
  const bidiPayloads = decodeBidiReversal(text);
  const splitPayloads = detectKeywordSplitting(text);
  const exfilPayloads = detectMarkdownExfil(text);

  const decodedPayloads = [
    ...tagPayloads,
    ...zwsPayloads,
    ...bidiPayloads,
    ...splitPayloads,
    ...exfilPayloads,
  ];

  // 2. Evaluate heuristic signatures
  const findings = evaluateHeuristicSignatures(decodedPayloads, text);

  // 3. Compute overall risk & severity
  const { riskScore, severity } = computeOverallRisk(decodedPayloads, findings);

  // 4. Calculate tokenizer impact
  const tokenizerImpact = computeTokenizerImpact(text, decodedPayloads);

  // 5. Optional online / local LLM semantic evaluation
  let semanticEvaluation;
  if (options.runSemanticEval && options.llmConfig && decodedPayloads.length > 0) {
    semanticEvaluation = await evaluateSemanticInjection(
      text,
      decodedPayloads.map(p => p.decodedText),
      options.llmConfig
    );
  }

  const durationMs = performance.now() - start;

  return {
    riskScore,
    severity,
    findings,
    decodedPayloads,
    tokenizerImpact,
    semanticEvaluation,
    durationMs,
  };
}

/**
 * Computes difference in character and estimated token counts caused by hidden injection characters.
 */
function computeTokenizerImpact(
  text: string,
  payloads: import('./types').DecodedPayload[]
): TokenizerImpact {
  const originalChars = Array.from(text).length;

  // Strips tags, zero-width chars, and bidi overrides
  const cleaned = text
    .replace(/[\ue0000-\ue007f]/g, '')
    .replace(/[\u200b\u200c\u200d\ufeff\u2060]/g, '')
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, '');

  const cleanedChars = Array.from(cleaned).length;

  // Approximate BPE subword token ratio (avg ~3.8 chars per token for English text)
  const estimatedRawTokens = Math.ceil(text.length / 3.5);
  const estimatedCleanedTokens = Math.ceil(cleaned.length / 3.8);

  return {
    originalCharCount: originalChars,
    cleanedCharCount: cleanedChars,
    estimatedRawTokens,
    estimatedCleanedTokens,
    tokenDifference: Math.max(0, estimatedRawTokens - estimatedCleanedTokens),
    affectedTokenBoundaries: payloads.length,
  };
}

/**
 * Neutralizes prompt injection payloads in text.
 */
export function neutralizeInjections(
  text: string,
  mode: 'strip' | 'reveal' = 'strip'
): InjectionNeutralizationResult {
  const strippedVectors: InjectionVector[] = [];
  let count = 0;

  // 1. Handle Tag Characters (U+E0000 - U+E007F)
  let result = text.replace(/[\u{E0000}-\u{E007F}]+/gu, match => {
    count++;
    if (!strippedVectors.includes('ascii-smuggling-tags')) {
      strippedVectors.push('ascii-smuggling-tags');
    }
    if (mode === 'reveal') {
      // Decode tag chars into visible bracketed text
      let revealed = '';
      for (const ch of match) {
        const cp = ch.codePointAt(0)!;
        const mapped = cp - 0xe0000;
        revealed += mapped >= 0x20 && mapped <= 0x7e ? String.fromCharCode(mapped) : '';
      }
      return ` [REVEALED_INJECTION: ${revealed}] `;
    }
    return '';
  });

  // 2. Handle Zero-Width characters
  result = result.replace(/[\u200b\u200c\u200d\ufeff\u2060]+/g, () => {
    count++;
    if (!strippedVectors.includes('zero-width-stego')) {
      strippedVectors.push('zero-width-stego');
    }
    return '';
  });

  // 3. Handle Bidi overrides
  result = result.replace(/[\u202a-\u202e\u2066-\u2069]+/g, () => {
    count++;
    if (!strippedVectors.includes('bidi-override')) {
      strippedVectors.push('bidi-override');
    }
    return '';
  });

  // 4. Handle Soft Hyphens
  result = result.replace(/\u00ad+/g, () => {
    count++;
    if (!strippedVectors.includes('soft-hyphen-evasion')) {
      strippedVectors.push('soft-hyphen-evasion');
    }
    return '';
  });

  return {
    cleanedText: mode === 'strip' ? result : text,
    revealedText: mode === 'reveal' ? result : text,
    removedPayloadCount: count,
    strippedVectors,
  };
}
