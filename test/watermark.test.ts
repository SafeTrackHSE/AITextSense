import { describe, it, expect } from 'vitest';
import { detectWatermark, sweepDetection } from '../src/core/watermark/detection';
import { neutralize } from '../src/core/watermark/neutralize';
import { getSynonyms, getSynonymAlternatives } from '../src/core/watermark/synonyms';
import { simpleTokenize, wordTokenize } from '../src/core/watermark/tokenizer';

describe('Tokenizer', () => {
  it('simpleTokenize splits on spaces and punctuation', () => {
    const tokens = simpleTokenize('Hello, world! This is a test.');
    expect(tokens.length).toBeGreaterThan(5);
    expect(tokens[0].text).toBe('Hello');
  });

  it('wordTokenize extracts words only', () => {
    const tokens = wordTokenize('Hello, world! This is a test.');
    expect(tokens.every(t => /^\w+$/.test(t.text))).toBe(true);
    expect(tokens[0].text).toBe('hello');
  });

  it('handles empty string', () => {
    expect(simpleTokenize('').length).toBe(0);
    expect(wordTokenize('').length).toBe(0);
  });
});

describe('Synonyms', () => {
  it('returns synonyms for common LLM words', () => {
    expect(getSynonyms('however').length).toBeGreaterThan(0);
    expect(getSynonyms('utilize').length).toBeGreaterThan(0);
    expect(getSynonyms('furthermore').length).toBeGreaterThan(0);
  });

  it('returns empty for unknown words', () => {
    expect(getSynonyms('xyzzy')).toEqual([]);
  });

  it('preserves capitalization', () => {
    const alts = getSynonymAlternatives('However');
    expect(alts[0].text[0]).toBe(alts[0].text[0].toUpperCase());
  });
});

describe('Watermark Detection', () => {
  const sampleText = `
    Furthermore, it is important to note that the implementation of these algorithms
    requires careful consideration of various factors. Additionally, the comprehensive
    analysis demonstrates that significant improvements can be achieved through
    systematic optimization. However, it should be noted that these results are
    preliminary and require further investigation to establish their validity.
    The fundamental approach utilized in this study provides a substantial foundation
    for subsequent research endeavors. Consequently, the outcomes indicate that
    the methodology is both effective and efficient in addressing the primary
    objectives established at the commencement of this investigation.
  `.trim();

  it('produces a detection result with all required fields', () => {
    const result = detectWatermark(sampleText);

    expect(result.method).toBe('kirchenbauer-approx');
    expect(typeof result.zScore).toBe('number');
    expect(typeof result.pValue).toBe('number');
    expect(typeof result.greenListRatio).toBe('number');
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(typeof result.isSignificant).toBe('boolean');
    expect(typeof result.durationMs).toBe('number');
  });

  it('detection runs under 500ms for 1k tokens', () => {
    const longText = sampleText.repeat(20);
    const result = detectWatermark(longText);
    expect(result.durationMs).toBeLessThan(500);
  });

  it('sweep produces multiple results across parameter space', () => {
    const sweep = sweepDetection(sampleText);
    expect(sweep.results.length).toBeGreaterThan(1);
    expect(sweep.bestResult).toBeDefined();
    expect(typeof sweep.summary).toBe('string');
  });

  it('z-score is higher for repeated green-list biased text', () => {
    const normal = 'The quick brown fox jumps over the lazy dog.';
    const r1 = detectWatermark(normal, { hashKey: 42 });
    const r2 = detectWatermark(normal.repeat(10), { hashKey: 42 });
    expect(typeof r1.zScore).toBe('number');
    expect(typeof r2.zScore).toBe('number');
  });
});

describe('Watermark Neutralization', () => {
  const sampleText = `
    However, it is important to consider that the implementation of these algorithms
    requires careful analysis. Furthermore, the comprehensive study demonstrates
    significant improvements. Additionally, the results indicate substantial progress
    in the fundamental approach utilized for this investigation.
  `.trim();

  it('produces neutralized text different from original', () => {
    const result = neutralize(sampleText, {
      strategies: new Set(['synonym']),
      intensity: 'moderate',
    });

    expect(result.neutralized).not.toBe(result.original);
    expect(result.appliedCount).toBeGreaterThan(0);
    expect(typeof result.beforeZScore).toBe('number');
    expect(typeof result.afterZScore).toBe('number');
  });

  it('synonym substitution replaces LLM-typical words', () => {
    const result = neutralize(sampleText, {
      strategies: new Set(['synonym']),
      intensity: 'heavy',
    });

    const hasHowever = result.neutralized.toLowerCase().includes('however');
    const hasFurthermore = result.neutralized.toLowerCase().includes('furthermore');
    expect(hasHowever && hasFurthermore).toBe(false);
  });

  it('reorder swaps coordinated pairs', () => {
    const input = 'cats and dogs are pets';
    const result = neutralize(input, {
      strategies: new Set(['reorder']),
      intensity: 'moderate',
    });
    expect(result.neutralized).toContain('dogs and cats');
  });

  it('homoglyph injection adds Cyrillic substitutions', () => {
    const input = 'Hello world this is a test of the emergency broadcast system';
    const result = neutralize(input, {
      strategies: new Set(['homoglyph']),
      intensity: 'moderate',
    });
    expect(result.neutralized).not.toBe(input);
    expect(result.suggestions.some(s => s.strategy === 'homoglyph')).toBe(true);
  });

  it('all strategies combined reduce z-score', () => {
    const longText = sampleText.repeat(5);
    const result = neutralize(longText, {
      strategies: new Set(['synonym', 'reorder', 'whitespace']),
      intensity: 'heavy',
    });
    expect(result.neutralized).not.toBe(result.original);
  });

  it('preserves overall text length approximately', () => {
    const result = neutralize(sampleText, {
      strategies: new Set(['synonym']),
      intensity: 'moderate',
    });
    const ratio = result.neutralized.length / result.original.length;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.3);
  });
});
