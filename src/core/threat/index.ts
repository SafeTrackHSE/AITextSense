import { extractCandidateSpans, type ExtractedSpan } from './extract';
import { decodeRecursive, type DecodeHop } from './decode';
import { THREAT_SIGNATURES, matchSignaturePatterns, type ThreatSignature } from './signatures';
import { computeThreatRisk } from './risk';
import { reviewCapability } from './capabilityReview';
import { isHighEntropyBlob } from './entropy';
import { severityRank } from '../shared/severity';
import { synthesizeKillChain } from '../security/explainer';
import type { ThreatAnalysisResult, ThreatAnalysisOptions, ThreatFinding } from './types';

export * from './types';
export { extractCandidateSpans } from './extract';
export { decodeRecursive } from './decode';
export { THREAT_SIGNATURES } from './signatures';
export { computeThreatRisk } from './risk';
export { reviewCapability } from './capabilityReview';

/**
 * Total online capability-review LLM calls allowed per analysis — shared across
 * deep-diving found threats AND explaining novel spans — to bound cost/latency.
 */
const MAX_CAPABILITY_REVIEW_CALLS = 6;

function buildFinding(
  sig: ThreatSignature,
  span: ExtractedSpan,
  matchedText: string,
  matchOffsetInSpan: number,
  decodedFrom?: DecodeHop[],
): ThreatFinding {
  const start = decodedFrom ? span.start : span.start + matchOffsetInSpan;
  const end = decodedFrom ? span.end : start + matchedText.length;

  return {
    id: `${sig.id}-${span.start}-${span.end}`,
    ruleId: sig.id,
    vector: span.vector,
    severity: sig.severity,
    span: { start, end, text: decodedFrom ? span.text : matchedText },
    decodedFrom: decodedFrom?.map(h => ({ encoding: h.encoding, input: h.input, output: h.output })),
    explanation: sig.explanation,
  };
}

function matchAllWithOffsets(sig: ThreatSignature, text: string): Array<{ matchedText: string; offset: number }> {
  const flags = sig.pattern.flags.includes('g') ? sig.pattern.flags : sig.pattern.flags + 'g';
  const re = new RegExp(sig.pattern.source, flags);
  const results: Array<{ matchedText: string; offset: number }> = [];
  for (const m of text.matchAll(re)) {
    if (m.index !== undefined && m[0].length > 0) {
      results.push({ matchedText: m[0], offset: m.index });
    }
  }
  return results;
}

/**
 * Runs the full offline threat pipeline: extract candidate spans, try
 * decoding anything that looks encoded, match the static signature library
 * against both the raw spans and any decoded content, then a full-text
 * fallback pass.
 */
export async function analyzeThreat(text: string, options: ThreatAnalysisOptions = {}): Promise<ThreatAnalysisResult> {
  const start = performance.now();
  if (!text) {
    return { riskScore: 0, severity: 'CLEAN', findings: [], spansExtracted: 0, decodedSpanCount: 0, capabilityReviewed: false, durationMs: performance.now() - start };
  }

  const spans = extractCandidateSpans(text);
  const findings: ThreatFinding[] = [];
  const seen = new Set<string>();
  let decodedSpanCount = 0;
  const unmatchedSuspiciousSpans: ExtractedSpan[] = [];

  for (const span of spans) {
    let spanMatched = false;

    // 1. Direct signature match on the raw span text with global matchAll and range deduplication.
    for (const sig of THREAT_SIGNATURES) {
      const hits = matchAllWithOffsets(sig, span.text);
      for (const hit of hits) {
        const absStart = span.start + hit.offset;
        const absEnd = absStart + hit.matchedText.length;
        const key = `${sig.id}::${absStart}-${absEnd}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push(buildFinding(sig, span, hit.matchedText, hit.offset));
        spanMatched = true;
      }
    }

    // 2. Anything that looks encoded (or found nothing directly) gets a decode attempt.
    if (span.vector === 'encoded-blob' || !spanMatched) {
      const decoded = decodeRecursive(span.text);
      if (decoded.chain.length > 0) {
        decodedSpanCount++;
        const decodedMatches = matchSignaturePatterns(decoded.finalText);
        for (const sig of decodedMatches) {
          const key = `${sig.id}::decoded::${span.start}-${span.end}`;
          if (seen.has(key)) continue;
          seen.add(key);
          findings.push(buildFinding(sig, span, decoded.finalText, 0, decoded.chain));
          spanMatched = true;
        }
      }
    }

    if (!spanMatched && (span.vector === 'bare-command-line' || span.vector === 'fenced-code-block' || isHighEntropyBlob(span.text))) {
      unmatchedSuspiciousSpans.push(span);
    }
  }

  // 3. Full-text fallback pass — unconditional, catches anything not caught by span
  //    extraction (e.g. a dangerous phrase embedded in ordinary prose, not code-formatted).
  for (const sig of THREAT_SIGNATURES) {
    const hits = matchAllWithOffsets(sig, text);
    for (const hit of hits) {
      const absStart = hit.offset;
      const absEnd = absStart + hit.matchedText.length;
      const key = `${sig.id}::${absStart}-${absEnd}`;
      if (seen.has(key)) continue;

      const alreadyCovered = findings.some(
        f => f.ruleId === sig.id && !(absEnd <= f.span.start || absStart >= f.span.end)
      );
      if (alreadyCovered) continue;

      seen.add(key);
      findings.push({
        id: `${sig.id}-fulltext-${absStart}-${absEnd}`,
        ruleId: sig.id,
        vector: 'bare-command-line',
        severity: sig.severity,
        span: { start: absStart, end: absEnd, text: hit.matchedText },
        explanation: sig.explanation,
      });
    }
  }

  // 4. Optional online AI capability review.
  let capabilityReviewed = false;
  if (options.runCapabilityReview && options.llmConfig) {
    capabilityReviewed = true;
    let budget = MAX_CAPABILITY_REVIEW_CALLS;

    const bySeverity = [...findings].sort((x, y) => severityRank(y.severity) - severityRank(x.severity));
    for (const finding of bySeverity) {
      if (budget <= 0) break;
      budget--;
      const contextStart = Math.max(0, finding.span.start - 150);
      const surrounding = text.slice(contextStart, Math.min(text.length, finding.span.end + 150));
      const target = finding.decodedFrom && finding.decodedFrom.length > 0
        ? finding.decodedFrom[finding.decodedFrom.length - 1].output
        : finding.span.text;
      const outcome = await reviewCapability(target, surrounding, options.llmConfig);
      if (outcome.inconclusive || !outcome.explanation) {
        finding.llmReviewInconclusive = outcome.reason ?? 'The model did not return a usable explanation.';
      } else {
        finding.llmExplanation = outcome.explanation;
      }
    }

    for (const span of unmatchedSuspiciousSpans) {
      if (budget <= 0) break;
      budget--;
      const contextStart = Math.max(0, span.start - 150);
      const surrounding = text.slice(contextStart, Math.min(text.length, span.end + 150));
      const outcome = await reviewCapability(span.text, surrounding, options.llmConfig);
      if (outcome.inconclusive || !outcome.explanation || !outcome.severity || outcome.severity === 'CLEAN') continue;
      findings.push({
        id: `THR-LLM-${span.start}-${span.end}`,
        ruleId: 'THR-LLM-CAPABILITY-REVIEW',
        vector: span.vector,
        severity: outcome.severity,
        span: { start: span.start, end: span.end, text: span.text },
        explanation: outcome.explanation,
      });
    }
  }

  const killChains = synthesizeKillChain(findings);
  let { riskScore, severity } = computeThreatRisk(findings);

  if (killChains.some(c => c.severity === 'CRITICAL')) {
    riskScore = Math.max(riskScore, 90);
    severity = 'CRITICAL';
  }

  return {
    riskScore,
    severity,
    findings,
    spansExtracted: spans.length,
    decodedSpanCount,
    capabilityReviewed,
    killChains,
    durationMs: performance.now() - start,
  };
}
