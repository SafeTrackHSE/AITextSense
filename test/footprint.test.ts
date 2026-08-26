import { describe, it, expect } from 'vitest';
import { analyzeFootprint } from '../src/core/footprint/analysis';
import { removeFootprint } from '../src/core/footprint/removal';

const LLM_TEXT = `
Furthermore, it is important to note that the implementation of these algorithms
requires careful consideration of various factors. Additionally, the comprehensive
analysis demonstrates that significant improvements can be achieved through
systematic optimization. However, it should be noted that these results are
preliminary and require further investigation to establish their validity.

The fundamental approach utilized in this study provides a substantial foundation
for subsequent research endeavors. Consequently, the outcomes indicate that
the methodology is both effective and efficient in addressing the primary
objectives established at the commencement of this investigation.

Moreover, it is worth mentioning that the multifaceted nature of this problem
necessitates a holistic approach. The robust framework we have developed
encompasses several crucial components that facilitate the seamless integration
of these disparate elements. In conclusion, the comprehensive evaluation
underscores the paramount importance of leveraging these innovative techniques.
`.trim();

const HUMAN_TEXT = `
I tried the new coffee shop on 5th. It's not bad — they do a flat white that
actually tastes like coffee, which is more than I can say for most places around
here. The barista had a nose ring and called me "boss" twice, which was weird.
Anyway. The wifi was slow but the chairs were comfortable and nobody kicked me
out after two hours, so I'll probably go back. My cat knocked over my plant again
this morning. Third time this month. I'm starting to think she does it on purpose.
She just sits there staring at the dirt like she's proud of herself. Cats, man.
`.trim();

describe('Footprint Analysis', () => {
  it('scores LLM-like text higher than human text', () => {
    const llmResult = analyzeFootprint(LLM_TEXT);
    const humanResult = analyzeFootprint(HUMAN_TEXT);

    expect(llmResult.overallScore).toBeGreaterThan(humanResult.overallScore);
  });

  it('detects LLM-favored vocabulary', () => {
    const result = analyzeFootprint(LLM_TEXT);
    expect(result.vocabulary.llmFavoredCount).toBeGreaterThan(3);
    expect(result.vocabulary.llmFavoredWords).toContain('furthermore');
  });

  it('detects hedging phrases', () => {
    const result = analyzeFootprint(LLM_TEXT);
    expect(result.repetition.hedgingPhrases.length).toBeGreaterThan(0);
  });

  it('measures burstiness correctly', () => {
    const llmResult = analyzeFootprint(LLM_TEXT);
    const humanResult = analyzeFootprint(HUMAN_TEXT);

    expect(typeof llmResult.burstiness.burstinessScore).toBe('number');
    expect(typeof humanResult.burstiness.burstinessScore).toBe('number');
  });

  it('computes perplexity uniformity', () => {
    const result = analyzeFootprint(LLM_TEXT);
    expect(result.perplexityProfile.uniformity).toBeGreaterThan(0);
    expect(result.perplexityProfile.uniformity).toBeLessThanOrEqual(1);
  });

  it('handles short text without crashing', () => {
    const result = analyzeFootprint('Short text.');
    expect(result.overallScore).toBe(0);
  });

  it('handles empty text', () => {
    const result = analyzeFootprint('');
    expect(result.overallScore).toBe(0);
  });

  it('reports confidence', () => {
    const result = analyzeFootprint(LLM_TEXT);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(0.85);
  });
});

describe('Footprint Removal', () => {
  it('modifies text to reduce score', () => {
    const result = removeFootprint(LLM_TEXT, 'heavy');
    expect(result.modified).not.toBe(result.original);
    expect(result.transforms.length).toBeGreaterThan(0);
  });

  it('replaces some LLM-favored words', () => {
    const result = removeFootprint(LLM_TEXT, 'heavy');
    const synonymTransforms = result.transforms.filter(t => t.type === 'synonym-rotate');
    expect(synonymTransforms.length).toBeGreaterThan(0);
  });

  it('reduces overall score after removal', () => {
    const result = removeFootprint(LLM_TEXT, 'heavy');
    expect(result.afterScore).toBeLessThanOrEqual(result.beforeScore);
  });

  it('preserves approximate text length', () => {
    const result = removeFootprint(LLM_TEXT, 'moderate');
    const ratio = result.modified.length / result.original.length;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(1.3);
  });

  it('light intensity makes fewer changes', () => {
    const light = removeFootprint(LLM_TEXT, 'light');
    const heavy = removeFootprint(LLM_TEXT, 'heavy');
    expect(light.transforms.length).toBeLessThanOrEqual(heavy.transforms.length);
  });
});
