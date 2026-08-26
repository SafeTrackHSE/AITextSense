/**
 * AI TextSense v2 — Regeneration Round-Trip
 *
 * Editing is bounded: residual watermark signal survives in untouched spans.
 * Regeneration resets the token distribution entirely. This engine rewrites
 * sentence-by-sentence, generating N candidates per sentence and keeping the
 * one the ORACLE scores as least detectable — then verifies the assembled
 * result against the same oracle and repeats up to `maxRounds`.
 *
 * Offline path uses the bundled on-device T5 models; if an online LLM is
 * configured it is preferred (stronger paraphrase = deeper distribution reset).
 */
import { buildObjective, type ObjectiveResult } from '../oracle/optimizer';
import { rewriteLocal } from '../llm/local';
import { DEFAULT_LOCAL_MODEL } from '../llm/local';

export interface RoundTripOptions {
  /** Candidates generated per sentence (best-of-N). Higher = stronger + slower. */
  samplesPerSentence?: number;
  maxRounds?: number;
  /** Stop when objective score falls below this. */
  targetScore?: number;
  modelId?: string;
  onProgress?: (msg: string, percent: number) => void;
}

export interface RoundTripResult {
  original: string;
  regenerated: string;
  rounds: number;
  sentencesRewritten: number;
  before: ObjectiveResult;
  after: ObjectiveResult;
  curve: number[];
  durationMs: number;
  summary: string;
}

function splitSentences(text: string): Array<{ text: string; offset: number }> {
  const out: Array<{ text: string; offset: number }> = [];
  const re = /[^.!?\n]+[.!?]*\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ text: m[0], offset: m.index });
  }
  return out;
}

export async function regenerateRoundTrip(
  text: string,
  options: RoundTripOptions = {},
): Promise<RoundTripResult> {
  const start = performance.now();
  const o = {
    samplesPerSentence: options.samplesPerSentence ?? 3,
    maxRounds: options.maxRounds ?? 3,
    targetScore: options.targetScore ?? 0.12,
    modelId: options.modelId ?? DEFAULT_LOCAL_MODEL,
    onProgress: options.onProgress,
  };

  const { objective } = buildObjective({ watermarkConfigs: 3, includeFootprint: true });
  const before = objective(text);
  let current = text;
  let currentScore = before.score;
  const curve: number[] = [currentScore];
  let totalRewritten = 0;
  let round = 0;

  while (round < o.maxRounds && currentScore > o.targetScore) {
    round++;
    const sentences = splitSentences(current);
    if (sentences.length === 0) break;

    let rebuilt = '';
    let cursor = 0;

    for (let si = 0; si < sentences.length; si++) {
      const s = sentences[si];
      rebuilt += current.slice(cursor, s.offset);
      cursor = s.offset + s.text.length;

      const trimmed = s.text.trim();
      if (trimmed.length < 20) {
        rebuilt += s.text;
        continue;
      }

      // Best-of-N: generate candidates, keep the least-detectable.
      let bestText = s.text;
      let bestScore = objective(s.text).score;

      for (let n = 0; n < o.samplesPerSentence; n++) {
        try {
          const res = await rewriteLocal(trimmed, 'humanize', o.modelId);
          if (!res.text || res.text.length < 10) continue;
          const candidate = res.text + (/[.!?]\s*$/.test(res.text) ? ' ' : '. ');
          // Cheap approximation: score the candidate alone plus a context tail.
          const probe = current.slice(Math.max(0, s.offset - 200), s.offset) + candidate;
          const sc = Math.max(objective(probe).score * 0.7, objective(candidate).score);
          if (sc < bestScore) {
            bestScore = sc;
            bestText = candidate;
          }
        } catch {
          // Model unavailable or sentence too odd to rewrite — keep original piece.
          break;
        }
        o.onProgress?.(
          `Round ${round}: sentence ${si + 1}/${sentences.length}`,
          Math.round(((round - 1) * sentences.length + si) / (o.maxRounds * sentences.length) * 100),
        );
      }

      if (bestText !== s.text) totalRewritten++;
      rebuilt += bestText;
    }
    rebuilt += current.slice(cursor);

    current = rebuilt.replace(/\s{2,}/g, ' ').trim();
    currentScore = objective(current).score;
    curve.push(currentScore);

    o.onProgress?.(`Round ${round} complete`, Math.round((round / o.maxRounds) * 100));
  }

  const after = objective(current);
  return {
    original: text,
    regenerated: current,
    rounds: round,
    sentencesRewritten: totalRewritten,
    before,
    after,
    curve,
    durationMs: performance.now() - start,
    summary:
      `${round} round(s), ${totalRewritten} sentences regenerated, ` +
      `detectability ${(before.score * 100).toFixed(0)}% → ${(after.score * 100).toFixed(0)}%`,
  };
}
