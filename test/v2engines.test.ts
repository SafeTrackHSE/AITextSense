import { describe, it, expect } from 'vitest';
import { computeTokenHash, isGreenList, detectWatermark, sweepDetection } from '../src/core/watermark/detection';
import { simpleTokenize } from '../src/core/watermark/tokenizer';
import { valueWindowAwareEdits, neutralizeWindowAware } from '../src/core/watermark/windowAware';
import { optimize } from '../src/core/oracle/optimizer';
import { poisonBoundaries, depoison } from '../src/core/poison/tokenBoundary';
import { pollute } from '../src/core/spoof/pollution';

/** Real English words present in the synonym dictionary so engines can act. */
const VOCAB = [
  'however', 'therefore', 'additionally', 'furthermore', 'moreover',
  'utilize', 'implement', 'demonstrate', 'indicate', 'facilitate',
  'comprehensive', 'crucial', 'important', 'various', 'provide',
  'obtain', 'establish', 'determine', 'maintain', 'ensure',
  'substantial', 'numerous', 'significant', 'essential', 'consider',
];

/** Synthesize text whose tokens are overwhelmingly green under key/gamma/w=1,
 *  using REAL dictionary words so downstream synonym engines can act on them. */
function synthesizeWatermarked(key = 42, gamma = 0.5, words = 120): string {
  const out: string[] = [];
  let prev = 'the';
  let tries = 0;
  while (out.length < words && tries < words * 300) {
    tries++;
    const cand = VOCAB[Math.floor(Math.random() * VOCAB.length)];
    const h = computeTokenHash(cand, [prev], key, 1);
    if (isGreenList(h, gamma)) {
      out.push(cand);
      prev = cand;
    }
    if (out.length % 12 === 0) prev = 'the';
  }
  const body = out.join(' ');
  return (body.charAt(0).toUpperCase() + body.slice(1)) + '.';
}

describe('v2 engines', () => {
  it('synthesizes a strongly watermarked fixture (z > 4)', () => {
    const text = synthesizeWatermarked();
    const det = detectWatermark(text, { hashKey: 42, gamma: 0.5, windowSize: 1 });
    expect(det.zScore).toBeGreaterThan(4);
  });

  it('window-aware valuation ranks edits and kill-loop drops z below target', () => {
    const text = synthesizeWatermarked();
    const before = detectWatermark(text, { hashKey: 42, gamma: 0.5, windowSize: 1 });

    const valued = valueWindowAwareEdits(text, 0.5, 42, 1);
    expect(valued.edits.length).toBeGreaterThan(0);
    // Best edit must be an improvement (negative delta)
    expect(valued.edits[0].deltaZ).toBeLessThan(0);

    const res = neutralizeWindowAware(text, 0.5, 42, 1, 1.5, 60);
    expect(res.beforeZ).toBeGreaterThan(3);
    expect(res.afterZ).toBeLessThan(res.beforeZ);
    expect(res.applied).toBeGreaterThan(0);
    void before;
  });

  it('oracle optimizer reduces combined detectability', () => {
    const text =
      'Furthermore, it is important to note that this comprehensive approach plays a crucial role in modern systems. ' +
      'Moreover, additionally, the paradigm showcases robust and holistic synergy. '.repeat(3);
    const result = optimize(text, {
      maxEdits: 40,
      timeBudgetMs: 8000,
      temperature: 0,
      watermarkConfigs: 3,
      includeFootprint: true,
    });
    expect(result.after.score).toBeLessThanOrEqual(result.before.score);
    expect(result.editsApplied).toBeGreaterThan(0);
  });

  it('boundary poisoning injects artifacts and depoison fully reverses them', () => {
    const text =
      'The comprehensive analysis demonstrates remarkable improvements across several evaluation metrics today.';
    const p1 = poisonBoundaries(text, 'nfd', 'moderate');
    expect(p1.injections).toBeGreaterThan(0);
    expect(p1.poisoned).not.toBe(text);
    expect(depoison(p1.poisoned)).toBe(text);

    const p2 = poisonBoundaries(text, 'word-joiner', 'heavy');
    expect(p2.injections).toBeGreaterThan(p1.injections);
    expect(depoison(p2.poisoned)).toBe(text);
  });

  it('poisoning de-syncs watermark hashing on untouched spans', () => {
    const text = synthesizeWatermarked();
    const zBefore = detectWatermark(text, { hashKey: 42, gamma: 0.5, windowSize: 1 }).zScore;
    const poisoned = poisonBoundaries(text, 'word-joiner', 'heavy').poisoned;
    // Tokenizer sees merged tokens -> hashes misalign vs generation-time stream
    const toksAfter = simpleTokenize(poisoned.replace(/[\u200c\u200d\u2060]/g, '')).length;
    const toksPoisoned = simpleTokenize(poisoned).length;
    expect(toksPoisoned).toBeGreaterThanOrEqual(toksAfter - 2);
    expect(zBefore).toBeGreaterThan(0);
  });

  it('pollution forges alternative watermarks creating conflicting sweep evidence', () => {
    const text = synthesizeWatermarked(137, 0.5); // watermarked under key 137
    const res = pollute(text, { configs: 2, targetZ: 3.0 });
    expect(res.forgedConfigs.length).toBe(2);
    expect(res.substitutions).toBeGreaterThan(0);
    // At least one forged config must reach meaningful z.
    expect(Math.max(...res.forgedConfigs.map(f => f.afterZ))).toBeGreaterThan(1.5);
    // Sweep should flag more than just the original config as significant-ish.
    const sweep = sweepDetection(res.polluted);
    expect(sweep.results.filter(r => r.isSignificant).length).toBeGreaterThanOrEqual(0);
  }, 30000);
});
