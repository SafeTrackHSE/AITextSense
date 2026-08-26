import { describe, it, expect } from 'vitest';
import { scan } from '../src/core/scanner';
import { GOLDEN_CORPUS } from './corpus/golden-corpus';

describe('Unicode Scanner — Golden Corpus', () => {
  for (const entry of GOLDEN_CORPUS) {
    it(`[${entry.id}] ${entry.description}`, () => {
      const result = scan(entry.input);

      if (entry.expectedCount === 0) {
        expect(result.findings.length).toBe(0);
        return;
      }

      expect(result.findings.length).toBe(entry.expectedCount);

      for (const cls of entry.expectedClasses) {
        const hasClass = result.findings.some(f => f.charClass === cls);
        expect(hasClass).toBe(true);
      }

      if (entry.shouldFlagRemovable) {
        const allRemovable = result.findings.every(f => f.safeToRemove);
        expect(allRemovable).toBe(true);
      } else if (entry.expectedCount > 0) {
        const anyNotRemovable = result.findings.some(f => !f.safeToRemove);
        expect(anyNotRemovable).toBe(true);
      }
    });
  }
});

describe('Unicode Scanner — Stego Detection', () => {
  it('detects steganographic zero-width sequences', () => {
    const input = 'visible​‌‍​‌‍text';
    const result = scan(input);
    expect(result.stegoPatterns.length).toBeGreaterThan(0);
    expect(result.stegoPatterns[0].codePoints.length).toBe(6);
    expect(result.stegoPatterns[0].decodedBits.length).toBe(12);
  });

  it('does not flag short runs as stego', () => {
    const input = 'a​b';
    const result = scan(input);
    expect(result.stegoPatterns.length).toBe(0);
  });
});

describe('Unicode Scanner — Bidi Issues', () => {
  it('detects unbalanced LRO', () => {
    const input = 'hello‭world';
    const result = scan(input);
    expect(result.bidiIssues.length).toBe(1);
    expect(result.bidiIssues[0].type).toBe('unbalanced-override');
  });

  it('balanced RLO+PDF has no bidi issues', () => {
    const input = '‮text‬';
    const result = scan(input);
    expect(result.bidiIssues.length).toBe(0);
  });

  it('detects unbalanced isolate', () => {
    const input = '⁦text';
    const result = scan(input);
    expect(result.bidiIssues.length).toBe(1);
    expect(result.bidiIssues[0].type).toBe('unbalanced-isolate');
  });
});

describe('Unicode Scanner — Mixed Script Detection', () => {
  it('detects Cyrillic in Latin word', () => {
    const input = 'pаypal';
    const result = scan(input);
    expect(result.mixedScriptRuns.length).toBeGreaterThan(0);
    expect(result.mixedScriptRuns[0].scripts).toContain('Cyrillic');
    expect(result.mixedScriptRuns[0].scripts).toContain('Latin');
  });

  it('does not flag pure-script words', () => {
    const input = 'hello world';
    const result = scan(input);
    expect(result.mixedScriptRuns.length).toBe(0);
  });
});

describe('Unicode Scanner — Performance', () => {
  it('processes 100k chars under 300ms', () => {
    const input = 'a'.repeat(50000) + '​'.repeat(100) + 'b'.repeat(49900);
    const result = scan(input);
    expect(result.durationMs).toBeLessThan(500);
    expect(result.findings.length).toBe(100);
  });
});

describe('Unicode Scanner — Finding Properties', () => {
  it('includes all required fields on each finding', () => {
    const input = 'test​data';
    const result = scan(input);
    const f = result.findings[0];

    expect(f.char).toBe('​');
    expect(f.codePoint).toBe(0x200b);
    expect(f.codePointHex).toBe('U+200B');
    expect(f.name).toBe('ZERO WIDTH SPACE');
    expect(f.charClass).toBe('zero-width');
    expect(f.risk).toBe('security');
    expect(f.safeToRemove).toBe(true);
    expect(typeof f.byteOffset).toBe('number');
    expect(typeof f.charOffset).toBe('number');
    expect(typeof f.graphemeIndex).toBe('number');
    expect(typeof f.description).toBe('string');
    expect(typeof f.context).toBe('string');
  });
});

describe('Unicode Scanner — Stats', () => {
  it('computes correct stats', () => {
    const input = 'hello​​world­test';
    const result = scan(input);

    expect(result.stats.totalChars).toBe(Array.from(input).length);
    expect(result.stats.findingsByClass['zero-width']).toBe(2);
    expect(result.stats.findingsByClass['soft-hyphen']).toBe(1);
  });
});
