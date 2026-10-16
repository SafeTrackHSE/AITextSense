import { describe, it, expect } from 'vitest';
import { getHelpContent } from '../src/i18n/helpData';
import { THREAT_SIGNATURES } from '../src/core/threat/signatures';
import type { Language } from '../src/i18n/strings';

const LANGS: Language[] = ['en', 'es', 'fr', 'pt-BR', 'it'];

describe('Glossary completeness (plan §7 / §8.2)', () => {
  it('every language defines the same set of glossary term ids as English', () => {
    const enIds = new Set(getHelpContent('en').glossary.map(g => g.id));
    expect(enIds.size).toBeGreaterThan(15);

    for (const lang of LANGS) {
      const ids = new Set(getHelpContent(lang).glossary.map(g => g.id));
      expect(ids, `language ${lang}`).toEqual(enIds);
    }
  });

  it('every glossary entry, in every language, has a non-empty term and plain definition', () => {
    for (const lang of LANGS) {
      for (const entry of getHelpContent(lang).glossary) {
        expect(entry.term.length, `${lang}/${entry.id} term`).toBeGreaterThan(1);
        expect(entry.plainDefinition.length, `${lang}/${entry.id} plainDefinition`).toBeGreaterThan(20);
      }
    }
  });

  it('no duplicate ids within a single language glossary', () => {
    for (const lang of LANGS) {
      const ids = getHelpContent(lang).glossary.map(g => g.id);
      expect(new Set(ids).size, lang).toBe(ids.length);
    }
  });

  it('every relatedGlossaryTerms id referenced by a static Threat signature resolves to a real English glossary entry', () => {
    const enIds = new Set(getHelpContent('en').glossary.map(g => g.id));
    const dangling: string[] = [];
    for (const sig of THREAT_SIGNATURES) {
      for (const termId of sig.explanation.relatedGlossaryTerms) {
        if (!enIds.has(termId)) dangling.push(`${sig.id} -> ${termId}`);
      }
    }
    expect(dangling).toEqual([]);
  });
});
