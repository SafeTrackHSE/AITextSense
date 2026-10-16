import type {
  InjectionAnalysisResult,
  InjectionNeutralizationResult,
  InjectionVector,
  TokenizerImpact,
} from './types';
import {
  decodeTagCharacters,
  decodeZeroWidthStego,
  decodeVariationSelectorStego,
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
  const vsPayloads = decodeVariationSelectorStego(text);
  const bidiPayloads = decodeBidiReversal(text);
  const splitPayloads = detectKeywordSplitting(text);
  const exfilPayloads = detectMarkdownExfil(text);

  const decodedPayloads = [
    ...tagPayloads,
    ...zwsPayloads,
    ...vsPayloads,
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
  if (options.runSemanticEval && options.llmConfig && (decodedPayloads.length > 0 || findings.length > 0)) {
    semanticEvaluation = await evaluateSemanticInjection(
      text,
      decodedPayloads.map(p => p.decodedText),
      options.llmConfig,
      findings
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

  // Strips tags, zero-width chars, variation selector sequences, and bidi overrides
  const cleaned = text
    .replace(/[\u{E0000}-\u{E007F}]/gu, '')
    .replace(/(?:[\uFE00-\uFE0F]|[\u{E0100}-\u{E01EF}]){4,}/gu, '')
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
 * In 'reveal' mode, all covert channels are inline-unmasked.
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
      let revealed = '';
      for (const ch of match) {
        const cp = ch.codePointAt(0)!;
        const mapped = cp - 0xe0000;
        revealed += mapped >= 0x20 && mapped <= 0x7e ? String.fromCharCode(mapped) : '';
      }
      return ` [REVEALED_INJECTION: ${revealed}] [REVEALED_TAG: ${revealed}] `;
    }
    return '';
  });

  // 2. Handle Variation Selector Steganography (>= 4 contiguous selectors)
  result = result.replace(/(?:[\uFE00-\uFE0F]|[\u{E0100}-\u{E01EF}]){4,}/gu, match => {
    count++;
    if (!strippedVectors.includes('variation-selector-stego')) {
      strippedVectors.push('variation-selector-stego');
    }
    if (mode === 'reveal') {
      const cps = [...match].map(ch => ch.codePointAt(0)!);
      let decoded = '';
      if (cps[0] >= 0xe0100) {
        const bytes = cps.map(cp => cp - 0xe0100);
        decoded = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
      } else {
        const nibbles = cps.map(cp => cp - 0xfe00);
        const bytes: number[] = [];
        for (let i = 0; i + 1 < nibbles.length; i += 2) {
          bytes.push((nibbles[i] << 4) | nibbles[i + 1]);
        }
        decoded = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
      }
      const clean = decoded.replace(/[^\x20-\x7E]/g, '');
      return ` [REVEALED_VS_STEGO: ${clean || `${cps.length} VS selectors`}] `;
    }
    return '';
  });

  // 3. Handle Zero-Width characters
  result = result.replace(/[\u200b\u200c\u200d\ufeff\u2060]+/g, match => {
    count++;
    if (!strippedVectors.includes('zero-width-stego')) {
      strippedVectors.push('zero-width-stego');
    }
    if (mode === 'reveal') {
      const cps = [...match].map(ch => ch.codePointAt(0)!);
      let decoded: string | null = null;
      // 1-bit standard: 200B=0, 200C=1
      const b1 = cps.map(cp => cp === 0x200b ? '0' : cp === 0x200c ? '1' : '').join('');
      if (b1.length >= 8) {
        let r = '';
        for (let i = 0; i + 8 <= b1.length; i += 8) {
          const code = parseInt(b1.slice(i, i + 8), 2);
          if (code >= 32 && code <= 126) r += String.fromCharCode(code);
        }
        if (r.length > 0) decoded = r;
      }
      // 1-bit inverted: 200C=0, 200B=1
      if (!decoded) {
        const b2 = cps.map(cp => cp === 0x200c ? '0' : cp === 0x200b ? '1' : '').join('');
        if (b2.length >= 8) {
          let r = '';
          for (let i = 0; i + 8 <= b2.length; i += 8) {
            const code = parseInt(b2.slice(i, i + 8), 2);
            if (code >= 32 && code <= 126) r += String.fromCharCode(code);
          }
          if (r.length > 0) decoded = r;
        }
      }
      // 2-bit base-4: 200B=00, 200C=01, 200D=10, FEFF=11
      if (!decoded) {
        const bitMap: Record<number, string> = { 0x200b: '00', 0x200c: '01', 0x200d: '10', 0xfeff: '11' };
        const b3 = cps.map(cp => bitMap[cp] ?? '').join('');
        if (b3.length >= 8) {
          let r = '';
          for (let i = 0; i + 8 <= b3.length; i += 8) {
            const code = parseInt(b3.slice(i, i + 8), 2);
            if (code >= 32 && code <= 126) r += String.fromCharCode(code);
          }
          if (r.length > 0) decoded = r;
        }
      }
      const payloadText = decoded ? decoded.trim() : `${cps.length} ZWS chars`;
      return ` [REVEALED_STEGO: ${payloadText}] `;
    }
    return '';
  });

  // 4. Handle Bidi overrides
  result = result.replace(/[\u202a-\u202e\u2066-\u2069]+/g, match => {
    count++;
    if (!strippedVectors.includes('bidi-override')) {
      strippedVectors.push('bidi-override');
    }
    if (mode === 'reveal') {
      const hexList = [...match].map(c => `U+${c.codePointAt(0)!.toString(16).toUpperCase()}`).join(' ');
      return ` [REVEALED_BIDI: ${hexList}] `;
    }
    return '';
  });

  // 5. Handle Soft Hyphens
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
