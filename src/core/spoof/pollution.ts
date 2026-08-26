/**
 * AI TextSense v2 — Watermark Pollution / Spoofing
 *
 * Instead of only REMOVING a watermark signal, inject CONFLICTING signals:
 * push the text to also satisfy alternative (key, gamma) configurations, so
 * any forensic sweep finds multiple "significant" watermarks simultaneously.
 *
 * Evidentiary impact: "text matches key X" is proof of nothing when the same
 * text equally matches keys Y and Z. Detection-as-attribution dies here.
 */
import { computeTokenHash, isGreenList } from '../watermark/detection';
import { getSynonymAlternatives } from '../watermark/synonyms';
import { simpleTokenize } from '../watermark/tokenizer';
import { sweepDetection } from '../watermark/detection';

export interface PollutionConfig {
  hashKey: number;
  gamma: number;
}

export interface PollutionResult {
  original: string;
  polluted: string;
  /** Alternative configurations successfully forged into the text. */
  forgedConfigs: Array<{ config: PollutionConfig; beforeZ: number; afterZ: number }>;
  substitutions: number;
  /** Number of configs the standard sweep now flags as significant. */
  significantHitsAfter: number;
  durationMs: number;
  summary: string;
}

const ALTERNATIVE_KEYS = [0, 1, 137, 1234, 9999, 31337, 2971, 100003];

function zScore(green: number, n: number, gamma: number): number {
  if (n === 0) return 0;
  const expected = gamma * n;
  const variance = gamma * (1 - gamma) * n;
  if (variance === 0) return 0;
  return (green - expected) / Math.sqrt(variance);
}

function measureZ(text: string, cfg: PollutionConfig): number {
  const texts = simpleTokenize(text).map(t => t.text);
  let green = 0;
  const w = 1;
  for (let i = w; i < texts.length; i++) {
    const ctx = texts.slice(Math.max(0, i - w), i);
    if (isGreenList(computeTokenHash(texts[i], ctx, cfg.hashKey, w), cfg.gamma)) green++;
  }
  return zScore(green, Math.max(0, texts.length - w), cfg.gamma);
}

/**
 * Forge an alternative watermark INTO the text by steering word choices
 * toward the green list of the target configuration.
 */
export function forgeWatermark(
  text: string,
  cfg: PollutionConfig,
  targetZ = 3.0,
  maxSubstitutions = 60,
): { text: string; subs: number; afterZ: number } {
  let current = text;
  let subs = 0;

  for (let pass = 0; pass < 4 && subs < maxSubstitutions; pass++) {
    const rawTokens = simpleTokenize(current);
    const texts = rawTokens.map(t => t.text);

    // Build replacement plan for this pass.
    const plan: Array<{ index: number; offset: number; original: string; replacement: string }> = [];

    for (let i = 1; i < texts.length && plan.length + subs < maxSubstitutions; i++) {
      const tok = texts[i];
      const lower = tok.toLowerCase();
      if (lower.length < 4) continue;
      if (isGreenList(computeTokenHash(lower, [texts[i - 1]], cfg.hashKey, 1), cfg.gamma)) continue;

      const alts = getSynonymAlternatives(lower);
      if (alts.length === 0) continue;

      for (const alt of alts.slice(0, 4)) {
        if (isGreenList(computeTokenHash(alt.text.toLowerCase(), [texts[i - 1]], cfg.hashKey, 1), cfg.gamma)) {
          let replacement = alt.text;
          if (/^[A-Z]/.test(tok)) {
            replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
          }
          plan.push({
            index: i,
            offset: rawTokens[i].offset,
            original: tok,
            replacement,
          });
          break;
        }
      }
    }

    if (plan.length === 0) break;

    // Apply plan back-to-front so offsets stay valid.
    plan.sort((a, b) => b.offset - a.offset);
    for (const p of plan) {
      current =
        current.slice(0, p.offset) +
        p.replacement +
        current.slice(p.offset + p.original.length);
      subs++;
    }

    if (measureZ(current, cfg) >= targetZ) break;
  }

  return { text: current, subs, afterZ: measureZ(current, cfg) };
}

/**
 * Full pollution pass: forge N alternative watermarks on top of the text.
 * Default forges two — enough to make any sweep report conflicting evidence.
 */
export function pollute(
  text: string,
  options: { configs?: number; targetZ?: number; excludeKeys?: number[] } = {},
): PollutionResult {
  const start = performance.now();
  const nConfigs = options.configs ?? 2;
  const targetZ = options.targetZ ?? 3.0;
  const excluded = new Set(options.excludeKeys ?? []);

  const chosen: PollutionConfig[] = ALTERNATIVE_KEYS.filter(k => !excluded.has(k))
    .slice(0, nConfigs)
    .map(k => ({ hashKey: k, gamma: 0.5 }));

  let current = text;
  let totalSubs = 0;
  const forged: PollutionResult['forgedConfigs'] = [];

  for (const cfg of chosen) {
    const beforeZ = measureZ(current, cfg);
    const res = forgeWatermark(current, cfg, targetZ);
    current = res.text;
    totalSubs += res.subs;
    forged.push({ config: cfg, beforeZ, afterZ: res.afterZ });
  }

  // Verify with the real sweep: how many configs are now significant?
  const sweep = sweepDetection(current);
  const significant = sweep.results.filter(r => r.isSignificant).length;

  const summary =
    `${forged.length} alternative watermark(s) forged ` +
    `(z: ${forged.map(f => f.afterZ.toFixed(1)).join(', ')}), ` +
    `${totalSubs} substitutions, sweep now flags ${significant} significant config(s)`;

  return {
    original: text,
    polluted: current,
    forgedConfigs: forged,
    substitutions: totalSubs,
    significantHitsAfter: significant,
    durationMs: performance.now() - start,
    summary,
  };
}
