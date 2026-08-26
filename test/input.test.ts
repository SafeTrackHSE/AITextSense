import { describe, it, expect } from 'vitest';
import { computeTextStats } from '../src/core/input/stats';
import { detectLanguage } from '../src/core/input/language';

describe('Text Stats', () => {
  it('computes correct stats for normal text', () => {
    const stats = computeTextStats('Hello world.\nThis is a test.');
    expect(stats.chars).toBe(28);
    expect(stats.words).toBe(6);
    expect(stats.lines).toBe(2);
    expect(stats.paragraphs).toBe(1);
  });

  it('counts paragraphs separated by blank lines', () => {
    const stats = computeTextStats('Paragraph one.\n\nParagraph two.\n\nParagraph three.');
    expect(stats.paragraphs).toBe(3);
  });

  it('handles empty string', () => {
    const stats = computeTextStats('');
    expect(stats.chars).toBe(0);
    expect(stats.words).toBe(0);
    expect(stats.paragraphs).toBe(0);
    expect(stats.lines).toBe(1);
  });

  it('counts Unicode chars correctly', () => {
    const stats = computeTextStats('café 🎉');
    expect(stats.chars).toBe(6);
    expect(stats.words).toBe(2);
  });

  it('computes bytes correctly', () => {
    const stats = computeTextStats('hello');
    expect(stats.bytes).toBe(5);
    const stats2 = computeTextStats('café');
    expect(stats2.bytes).toBe(5);
  });
});

describe('Language Detection', () => {
  it('detects English', async () => {
    const lang = await detectLanguage('This is a sample of English text that should be detected correctly.');
    expect(lang.code).toBe('eng');
  });

  it('returns unknown for short text', async () => {
    const lang = await detectLanguage('Hi');
    expect(lang.code).toBe('und');
    expect(lang.confidence).toBe(0);
  });

  it('returns unknown for empty text', async () => {
    const lang = await detectLanguage('');
    expect(lang.code).toBe('und');
  });
});
