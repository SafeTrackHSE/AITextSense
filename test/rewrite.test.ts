import { describe, it, expect } from 'vitest';
import { humanize } from '../src/core/rewrite/humanize';
import { deparaphrase } from '../src/core/rewrite/deparaphrase';
import { applyContractions } from '../src/core/rewrite/contractions';

const LLM_SAMPLE = `Furthermore, it is important to note that artificial intelligence has fundamentally transformed the modern landscape of technology. Additionally, it is crucial to understand that these comprehensive systems demonstrate significant capabilities across numerous domains. Moreover, the intricate algorithms utilize robust methodologies that facilitate seamless integration. Consequently, organizations can leverage these powerful tools to streamline their operations. Nevertheless, it should be noted that careful consideration is essential. In addition, the multifaceted nature of these technologies underscores the paramount importance of thoughtful implementation. Because the systems are complex, practitioners must navigate an ever-evolving ecosystem. Ultimately, this holistic approach empowers stakeholders to cultivate meaningful outcomes.`;

describe('contractions', () => {
  it('contracts expanded forms', () => {
    const { text, edits } = applyContractions('It is not ready and we are late. They do not know.', 10);
    expect(text).toContain("isn't");
    expect(text).toContain("we're");
    expect(text).toContain("don't");
    expect(edits.length).toBeGreaterThan(0);
  });

  it('respects the max budget', () => {
    const { edits } = applyContractions('it is a it is b it is c it is d', 2);
    expect(edits.length).toBe(2);
  });

  it('preserves leading capitalization', () => {
    const { text } = applyContractions('It is fine.', 5);
    expect(text.startsWith("It's")).toBe(true);
  });
});

describe('humanize', () => {
  it('produces different text and records edits', () => {
    const r = humanize(LLM_SAMPLE, 'heavy');
    expect(r.rewritten).not.toBe(LLM_SAMPLE);
    expect(r.edits.length).toBeGreaterThan(0);
    expect(r.engine).toBe('local');
    expect(r.mode).toBe('humanize');
  });

  it('strips hedging phrases', () => {
    const r = humanize(LLM_SAMPLE, 'heavy');
    expect(r.rewritten.toLowerCase()).not.toContain('it is important to note that');
  });

  it('lowers the footprint score and cuts LLM-favored vocabulary', () => {
    const r = humanize(LLM_SAMPLE, 'heavy');
    expect(r.beforeScore).toBeGreaterThan(0);
    expect(r.afterScore).toBeLessThan(r.beforeScore);
  });

  it('is deterministic', () => {
    const a = humanize(LLM_SAMPLE, 'moderate');
    const b = humanize(LLM_SAMPLE, 'moderate');
    expect(a.rewritten).toBe(b.rewritten);
  });
});

describe('deparaphrase', () => {
  it('reorders a leading clause', () => {
    const r = deparaphrase(LLM_SAMPLE, 'heavy');
    expect(r.rewritten).not.toBe(LLM_SAMPLE);
    expect(r.edits.some(e => e.type === 'clause-reorder')).toBe(true);
  });

  it('swaps vocabulary to break lexical overlap', () => {
    const r = deparaphrase(LLM_SAMPLE, 'heavy');
    expect(r.edits.some(e => e.type === 'synonym')).toBe(true);
  });

  it('preserves rough length (no runaway growth)', () => {
    const r = deparaphrase(LLM_SAMPLE, 'heavy');
    expect(r.rewritten.length).toBeGreaterThan(LLM_SAMPLE.length * 0.6);
    expect(r.rewritten.length).toBeLessThan(LLM_SAMPLE.length * 1.6);
  });
});
