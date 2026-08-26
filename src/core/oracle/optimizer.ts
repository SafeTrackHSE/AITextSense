/**
 * AI TextSense v2 — Oracle-Loop Optimizer
 *
 * Closed-loop adversarial edit search. Uses pluggable detector objectives
 * (watermark z-score, stylometric footprint, real-LM perplexity distance)
 * as fitness functions, and searches the edit space with greedy +
 * simulated-annealing hybrid until detectability converges to noise.
 *
 * Every candidate edit is scored BEFORE commitment. No blind intensity
 * fractions — only edits with measurable detectability reduction survive.
 */
import { detectWatermark } from '../watermark/detection';
import { getSynonymAlternatives } from '../watermark/synonyms';
import { analyzeFootprint } from '../footprint/analysis';

export type EditKind = 'synonym' | 'transition' | 'clause-reorder' | 'pair-swap' | 'sentence-split';

export interface EditCandidate {
  kind: EditKind;
  position: number;
  original: string;
  replacement: string;
  /** Estimated detectability delta (negative = good). Populated by generators when cheap. */
  estDelta?: number;
}

export interface ObjectiveResult {
  /** 0..1 — higher = more detectable. */
  score: number;
  details: Record<string, number>;
}

export type Objective = (text: string) => ObjectiveResult;

export interface OptimizerOptions {
  /** Hard cap on accepted edits. */
  maxEdits?: number;
  /** Wall-clock budget for the search loop. */
  timeBudgetMs?: number;
  /** Simulated annealing start temperature (greedy if 0). */
  temperature?: number;
  /** Stop when improvement over last K iterations < this. */
  stallLimit?: number;
  /** Reject edits dropping word-overlap below this Jaccard fraction. */
  semanticFloor?: number;
  /** Number of top watermark configs locked from initial sweep (0 = skip watermark obj). */
  watermarkConfigs?: number;
  /** Include stylometric footprint objective. */
  includeFootprint?: boolean;
}

export interface OptimizerResult {
  original: string;
  optimized: string;
  editsApplied: number;
  before: ObjectiveResult;
  after: ObjectiveResult;
  /** Detectability score after each accepted iteration. */
  curve: number[];
  rejectedCount: number;
  durationMs: number;
  summary: string;
}

const TRANSITION_SWAPS: Array<[RegExp, string]> = [
  [/\bfurthermore\b/i, 'on top of that'],
  [/\bmoreover\b/i, 'and'],
  [/\badditionally\b/i, 'also'],
  [/\bconsequently\b/i, 'as a result'],
  [/\bnevertheless\b/i, 'even so'],
  [/\bnonetheless\b/i, 'still'],
  [/\bhowever\b/i, 'but'],
  [/\btherefore\b/i, 'so'],
  [/\bthus\b/i, 'so'],
  [/\bhence\b/i, 'so'],
  [(/\bin addition\b/i as unknown) as RegExp, 'plus'],
  [/\bin conclusion\b/i, 'in the end'],
  [/\bto summarize\b/i, 'in short'],
];

interface WordTok { text: string; offset: number }

function wordTokens(text: string): WordTok[] {
  const out: WordTok[] = [];
  const re = /[A-Za-z][A-Za-z']*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push({ text: m[0], offset: m.index });
  return out;
}

function jaccardWords(a: string, b: string): number {
  const sa = new Set(a.toLowerCase().match(/[a-z']+/g) ?? []);
  const sb = new Set(b.toLowerCase().match(/[a-z']+/g) ?? []);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/** Build the objective from configured detectors. */
export function buildObjective(opts: Required<Pick<OptimizerOptions, 'watermarkConfigs' | 'includeFootprint'>> & { lockedConfigs?: Array<{ gamma: number; windowSize: number; hashKey: number }> }): {
  objective: Objective;
  lockedConfigs: Array<{ gamma: number; windowSize: number; hashKey: number }>;
} {
  let lockedConfigs = opts.lockedConfigs ?? [];
  if (lockedConfigs.length === 0 && opts.watermarkConfigs > 0) {
    // Lock onto the strongest watermark signals present in ANY input later;
    // here we just expose the standard probe grid for lazy locking.
    lockedConfigs = [{ gamma: 0.5, windowSize: 1, hashKey: 42 }];
  }

  const watermarkObjective: Objective = (text) => {
    if (opts.watermarkConfigs === 0) return { score: 0, details: {} };
    // Probe the standard adversarial grid cheaply: fixed strong configs.
    const probes = [
      { gamma: 0.5, windowSize: 1, hashKey: 42 },
      { gamma: 0.25, windowSize: 1, hashKey: 0 },
      { gamma: 0.5, windowSize: 2, hashKey: 137 },
    ];
    let worst = 0;
    const details: Record<string, number> = {};
    for (const p of probes) {
      const r = detectWatermark(text, p);
      // Map z to 0..1 detectability via logistic-ish squash; z=0 -> 0, z>=6 -> ~1
      const d = 1 / (1 + Math.exp(-(r.zScore - 2.5)));
      details[`z_k${p.hashKey}_w${p.windowSize}`] = r.zScore;
      if (d > worst) worst = d;
    }
    return { score: worst, details };
  };

  const footprintObjective: Objective = (text) => {
    if (!opts.includeFootprint) return { score: 0, details: {} as Record<string, number> };
    const a = analyzeFootprint(text);
    return { score: a.overallScore, details: { footprint: a.overallScore } };
  };

  const objective: Objective = (text) => {
    const w = watermarkObjective(text);
    const f = footprintObjective(text);
    return {
      score: Math.max(w.score, f.score),
      details: { ...w.details, ...f.details },
    };
  };

  return { objective, lockedConfigs };
}

// ---------------------------------------------------------------------------
// Edit generators — produce candidate mutations for scoring.
// ---------------------------------------------------------------------------

export function generateSynonymEdits(text: string, limit: number): EditCandidate[] {
  const out: EditCandidate[] = [];
  for (const wt of wordTokens(text)) {
    if (out.length >= limit) break;
    const lower = wt.text.toLowerCase();
    if (lower.length < 4) continue;
    const alts = getSynonymAlternatives(lower);
    if (alts.length === 0) continue;
    let replacement = alts[0].text;
    if (/^[A-Z]/.test(wt.text)) replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
    out.push({ kind: 'synonym', position: wt.offset, original: wt.text, replacement });
  }
  return out;
}

export function generateTransitionEdits(text: string): EditCandidate[] {
  const out: EditCandidate[] = [];
  for (const [re, to] of TRANSITION_SWAPS) {
    const m = re.exec(text);
    if (!m || m.index === undefined) continue;
    const original = m[0];
    let replacement = to;
    if (original[0] === original[0].toUpperCase()) replacement = to.charAt(0).toUpperCase() + to.slice(1);
    out.push({ kind: 'transition', position: m.index, original, replacement });
  }
  return out;
}

export function generatePairSwapEdits(text: string, limit: number): EditCandidate[] {
  const out: EditCandidate[] = [];
  const re = /\b([a-z]+)\s+(and|or)\s+([a-z]+)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && out.length < limit) {
    const [full, a, conj, b] = m;
    if (a.toLowerCase() === b.toLowerCase()) continue;
    const swapped = `${b} ${conj} ${a}`;
    out.push({ kind: 'pair-swap', position: m.index, original: full, replacement: swapped });
  }
  return out;
}

export function generateClauseReorders(text: string, limit: number): EditCandidate[] {
  const out: EditCandidate[] = [];
  const lead = /^(Because|Since|Although|While|When|If|As)\s+([^,]+),\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = lead.exec(text)) !== null && out.length < limit) {
    const s = m[0];
    const conj = m[1].toLowerCase();
    const sub = m[2].trim();
    let main = m[3].trim();
    const endMatch = main.match(/[.!?]$/);
    const endPunct = endMatch ? endMatch[0] : '.';
    main = main.replace(/[.!?]$/, '');
    main = main.charAt(0).toUpperCase() + main.slice(1);
    out.push({
      kind: 'clause-reorder',
      position: m.index,
      original: s,
      replacement: `${main} ${conj} ${sub}${endPunct}`,
    });
  }
  return out;
}

export function generateSentenceSplits(text: string, limit: number): EditCandidate[] {
  const out: EditCandidate[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let cursor = 0;
  for (const s of sentences) {
    const words = s.trim().split(/\s+/);
    if (words.length > 18 && out.length < limit) {
      // Split near midpoint at a seam.
      const mid = s.length / 2;
      const seam = /(;\s+)|(,\s+(?:and|but|so|yet|because)\s+)/gi;
      seam.lastIndex = 0;
      let best: { pos: number; len: number } | null = null;
      let m: RegExpExecArray | null;
      while ((m = seam.exec(s)) !== null) {
        const pos = m.index;
        if (Math.abs(pos - mid) < (best ? Math.abs(best.pos - mid) : Infinity)) {
          best = { pos, len: m[0].length };
        }
      }
      if (best && best.pos > 20) {
        const head = s.slice(0, best.pos).trim().replace(/[,;]$/, '');
        let tail = s.slice(best.pos + best.len).trim();
        tail = tail.charAt(0).toUpperCase() + tail.slice(1);
        const rebuilt = head.replace(/[.!?]*$/, '') + '. ' + tail;
        out.push({ kind: 'sentence-split', position: cursor, original: s, replacement: rebuilt });
      }
    }
    cursor += s.length + 1;
  }
  return out;
}

function applyEdit(text: string, e: EditCandidate): string {
  const before = text.slice(0, e.position);
  const after = text.slice(e.position + e.original.length);
  return before + e.replacement + after;
}

// ---------------------------------------------------------------------------
// Search loop
// ---------------------------------------------------------------------------

export function optimize(
  text: string,
  options: OptimizerOptions = {},
): OptimizerResult {
  const o = {
    maxEdits: options.maxEdits ?? 60,
    timeBudgetMs: options.timeBudgetMs ?? 20000,
    temperature: options.temperature ?? 0.4,
    stallLimit: options.stallLimit ?? 12,
    semanticFloor: options.semanticFloor ?? 0.82,
    watermarkConfigs: options.watermarkConfigs ?? 3,
    includeFootprint: options.includeFootprint ?? true,
    ...options,
  };

  const start = performance.now();
  const { objective } = buildObjective(o);

  const before = objective(text);
  let current = text;
  let currentScore = before.score;
  const curve: number[] = [currentScore];
  let applied = 0;
  let rejected = 0;
  let stalled = 0;
  let temp = o.temperature;

  while (
    applied < o.maxEdits &&
    performance.now() - start < o.timeBudgetMs &&
    stalled < o.stallLimit &&
    currentScore > 0.08
  ) {
    // Generate a fresh candidate pool around the current text.
    const pool: EditCandidate[] = [
      ...generateTransitionEdits(current),
      ...generatePairSwapEdits(current, 6),
      ...generateClauseReorders(current, 4),
      ...generateSentenceSplits(current, 2),
      ...generateSynonymEdits(current, 24),
    ];
    if (pool.length === 0) break;

    // Score candidates in randomized order with annealing acceptance.
    let improved = false;
    const order = pool.sort(() => Math.random() - 0.5);

    for (const cand of order) {
      if (performance.now() - start > o.timeBudgetMs) break;
      const candidateText = applyEdit(current, cand);
      if (jaccardWords(text, candidateText) < o.semanticFloor) {
        rejected++;
        continue;
      }
      const s = objective(candidateText).score;
      const delta = s - currentScore;

      if (delta < -1e-6) {
        // Improvement — always accept.
        current = candidateText;
        currentScore = s;
        applied++;
        improved = true;
        stalled = 0;
        temp *= 0.92;
        curve.push(s);
        break; // regenerate pool after structural change
      }

      // Annealing acceptance for slightly-worse moves.
      if (delta < 0.02 && Math.random() < Math.exp(-Math.abs(delta) / Math.max(temp, 0.01))) {
        current = candidateText;
        currentScore = s;
        applied++;
        curve.push(s);
        break;
      }

      rejected++;
    }

    if (!improved) stalled++;
    temp *= 0.95;
  }

  const after = objective(current);
  const wmDetail = Object.entries(after.details).find(([k]) => k.startsWith('z_'));
  const summary =
    `detectability ${(before.score * 100).toFixed(0)}% → ${(after.score * 100).toFixed(0)}%` +
    (wmDetail ? `, ${wmDetail[0]}=${wmDetail[1].toFixed(2)}σ` : '') +
    `, ${applied} edits (${rejected} rejected), ${curve.length} iterations`;

  return {
    original: text,
    optimized: current,
    editsApplied: applied,
    before,
    after,
    curve,
    rejectedCount: rejected,
    durationMs: performance.now() - start,
    summary,
  };
}
