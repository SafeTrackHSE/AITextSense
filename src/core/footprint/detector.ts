/**
 * AI TextSense v3 — Footprint Detector & Heatmap Engine
 *
 * Detects multi-layer AI fingerprints:
 * - Layer 1: Lexical tells (LLM-favored vocabulary)
 * - Layer 2: Syntactic & structural repetition (hedging, templates, uniform rhythm)
 * - Layer 3: Typographic tells (excessive em-dashes, curly quotes, bold list lead-ins)
 * - Layer 4: Per-sentence fingerprint heatmap overlay
 */

import { LLM_FAVORED, HEDGING_PATTERNS, TEMPLATE_PATTERNS } from './patterns';

export interface TypographicProfile {
  emDashCount: number;
  emDashPer100Words: number;
  curlyQuoteCount: number;
  boldLeadInCount: number;
  numberedListColonCount: number;
  typographicScore: number; // 0..1
}

export interface SentenceFingerprint {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  score: number; // 0..1
  level: 'high' | 'moderate' | 'low';
  triggers: string[];
}

export interface SentenceFingerprintOverlay {
  sentences: SentenceFingerprint[];
  highCount: number;
  moderateCount: number;
  lowCount: number;
}

/**
 * Layer 3: Detect typographic anomalies characteristic of LLM outputs.
 * Only penalizes em-dashes when count >= 3 AND density > 1.2/100w so natural human prose is unaffected.
 */
export function detectTypographicTells(text: string): TypographicProfile {
  const words = text.match(/\b\w+\b/g) ?? [];
  const wordCount = Math.max(1, words.length);

  const emDashes = text.match(/—|--/g) ?? [];
  const emDashCount = emDashes.length;
  const emDashPer100Words = (emDashCount / wordCount) * 100;

  const curlyQuotes = text.match(/[“”‘’]/g) ?? [];
  const curlyQuoteCount = curlyQuotes.length;

  const boldLeadIns = text.match(/^\s*[-*+]\s+\*\*[^*]+\*\*:\s*/gm) ?? [];
  const boldLeadInCount = boldLeadIns.length;

  const numberedListColons = text.match(/^\s*\d+\.\s+\*\*[^*]+\*\*:\s*/gm) ?? [];
  const numberedListColonCount = numberedListColons.length;

  let score = 0;
  if (emDashCount >= 3 && emDashPer100Words > 1.2) {
    score += Math.min(0.45, (emDashPer100Words - 1.2) * 0.2 + 0.15);
  }
  if (curlyQuoteCount >= 4) {
    score += 0.2;
  } else if (curlyQuoteCount >= 2) {
    score += 0.1;
  }
  if (boldLeadInCount >= 2) {
    score += Math.min(0.25, boldLeadInCount * 0.1);
  }
  if (numberedListColonCount >= 2) {
    score += Math.min(0.15, numberedListColonCount * 0.08);
  }

  const typographicScore = Math.min(1, Math.max(0, score));

  return {
    emDashCount,
    emDashPer100Words,
    curlyQuoteCount,
    boldLeadInCount,
    numberedListColonCount,
    typographicScore,
  };
}

/**
 * Layer 4: Compute per-sentence fingerprint heatmap overlay.
 */
export function computeSentenceFingerprintHeatmap(text: string): SentenceFingerprintOverlay {
  const sentences: SentenceFingerprint[] = [];
  const re = /[^.!?\n]+[.!?]*\s*/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const startOffset = match.index;
    const endOffset = startOffset + raw.length;
    const triggers: string[] = [];

    const lower = trimmed.toLowerCase();
    const words = lower.match(/[a-z']+/g) ?? [];
    const wordCount = words.length;

    // Check LLM favored vocabulary
    const foundLLMWords = words.filter(w => LLM_FAVORED.has(w));
    if (foundLLMWords.length > 0) {
      for (const w of foundLLMWords.slice(0, 3)) {
        triggers.push(`AI buzzword: '${w}'`);
      }
    }

    // Check hedging phrases
    for (const h of HEDGING_PATTERNS) {
      if (lower.includes(h)) {
        triggers.push(`Hedging: '${h}'`);
        break;
      }
    }

    // Check template phrases
    for (const t of TEMPLATE_PATTERNS) {
      if (lower.includes(t)) {
        triggers.push(`Template phrase: '${t}'`);
        break;
      }
    }

    // Check uniform robotic sentence length (18..26 words typical for GPT default generation)
    if (wordCount >= 18 && wordCount <= 26 && foundLLMWords.length > 0) {
      triggers.push(`Uniform sentence length (${wordCount}w)`);
    }

    // Check typographic tell in this sentence
    if (/—|--/.test(raw)) {
      triggers.push(`Em-dash pause tell`);
    }
    if (/^\s*[-*+]\s+\*\*[^*]+\*\*:\s*/.test(raw)) {
      triggers.push(`Bold-colon list lead-in`);
    }

    let score = 0;
    if (triggers.length >= 3) {
      score = Math.min(1, 0.6 + triggers.length * 0.1);
    } else if (triggers.length === 2) {
      score = 0.5;
    } else if (triggers.length === 1) {
      score = 0.25;
    }

    const level: 'high' | 'moderate' | 'low' =
      score >= 0.55 ? 'high' : score >= 0.25 ? 'moderate' : 'low';

    sentences.push({
      index: idx++,
      text: raw,
      startOffset,
      endOffset,
      score,
      level,
      triggers,
    });
  }

  const highCount = sentences.filter(s => s.level === 'high').length;
  const moderateCount = sentences.filter(s => s.level === 'moderate').length;
  const lowCount = sentences.filter(s => s.level === 'low').length;

  return {
    sentences,
    highCount,
    moderateCount,
    lowCount,
  };
}
