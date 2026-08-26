/**
 * AI TextSense v2 — Token-Boundary Poisoning
 *
 * Watermark hashers tokenize the EDITED stream; generators watermarked the
 * ORIGINAL token stream. Any injected character that shifts token boundaries
 * de-syncs every downstream hash evaluation — including for tokens that were
 * never edited.
 *
 * Three injection classes, ordered by stealth:
 *   - 'word-joiner' : U+2060 / U+200C inside words. Invisible; stripped by
 *                     forensic cleaners but survives casual inspection.
 *   - 'nfd'         : Unicode NFD decomposition (base letter + combining
 *                     mark). Visually IDENTICAL in every renderer, survives
 *                     most invisible-char strippers, and still forces BPE /
 *                     word tokenizers to split differently.
 *   - 'aggressive'  : mixed ZWJ + NFD + soft-hyphen at maximum safe density.
 */

export type PoisonMode = 'word-joiner' | 'nfd' | 'aggressive';
export type PoisonDensity = 'light' | 'moderate' | 'heavy';

export interface PoisonResult {
  original: string;
  poisoned: string;
  injections: number;
  wordsCovered: number;
  totalWords: number;
  mode: PoisonMode;
  density: PoisonDensity;
}

const DENSITY_DIVISOR: Record<PoisonDensity, number> = {
  light: 8,
  moderate: 4,
  heavy: 2,
};

// Combining marks that render as visually-neutral accents on Latin letters.
const NFD_MARKS = ['\u0301', '\u0308', '\u0300', '\u0306'];
// Letters that combine safely with those marks without changing appearance much.
const NFD_BASES = new Set(['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U']);

interface WordSpan { text: string; start: number }

function findWords(text: string): WordSpan[] {
  const out: WordSpan[] = [];
  const re = /[A-Za-z][A-Za-z']{3,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ text: m[0], start: m.index });
  }
  return out;
}

/** Pick a spread of injection targets: longest words first, spaced apart. */
function selectTargets(words: WordSpan[], density: PoisonDensity): WordSpan[] {
  const divisor = DENSITY_DIVISOR[density];
  const targetCount = Math.max(1, Math.floor(words.length / divisor));
  // Sort by length descending to prefer long words (more token surface),
  // then thin out so injections are distributed across the document.
  const ranked = [...words].sort((a, b) => b.text.length - a.text.length);
  const chosen: WordSpan[] = [];
  const minGap = Math.max(8, Math.floor(text_spanGuess(ranked, words) / Math.max(targetCount, 1)));

  for (const w of ranked) {
    if (chosen.length >= targetCount) break;
    if (chosen.some(c => Math.abs(c.start - w.start) < minGap)) continue;
    chosen.push(w);
  }
  return chosen.sort((a, b) => a.start - b.start);
}

function text_spanGuess(_ranked: WordSpan[], words: WordSpan[]): number {
  if (words.length === 0) return 1;
  return words[words.length - 1].start;
}

function injectIntoWord(word: string, mode: PoisonMode, seedIdx: number): string {
  switch (mode) {
    case 'word-joiner': {
      // Split at ~40% into the word.
      const cut = Math.max(1, Math.floor(word.length * 0.4));
      return word.slice(0, cut) + '\u200c' + word.slice(cut);
    }
    case 'nfd': {
      // Decompose an interior vowel with a zero-width combining mark.
      for (let i = 1; i < word.length - 1; i++) {
        const ch = word[i];
        if (NFD_BASES.has(ch)) {
          const mark = NFD_MARKS[(seedIdx + i) % NFD_MARKS.length];
          return word.slice(0, i + 1) + mark + word.slice(i + 1);
        }
      }
      const cut = Math.max(1, Math.floor(word.length / 2));
      return word.slice(0, cut) + '\u2060' + word.slice(cut);
    }
    case 'aggressive': {
      const cut = Math.max(1, Math.floor(word.length * 0.35));
      return (
        word.slice(0, cut) +
        '\u200d' +
        word.slice(cut, cut + 1) +
        '\u0301' +
        word.slice(cut + 1)
      );
    }
  }
}

export function poisonBoundaries(
  text: string,
  mode: PoisonMode = 'nfd',
  density: PoisonDensity = 'moderate',
): PoisonResult {
  const words = findWords(text);
  if (words.length === 0) {
    return { original: text, poisoned: text, injections: 0, wordsCovered: 0, totalWords: 0, mode, density };
  }

  const targets = selectTargets(words, density);
  let result = text;
  let offset = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const poisonedWord = injectIntoWord(t.text, mode, i);
    result =
      result.slice(0, t.start + offset) +
      poisonedWord +
      result.slice(t.start + offset + t.text.length);
    offset += poisonedWord.length - t.text.length;
  }

  return {
    original: text,
    poisoned: result,
    injections: targets.length,
    wordsCovered: targets.length,
    totalWords: words.length,
    mode,
    density,
  };
}

/**
 * Strip all poisoning artifacts (inverse operation) — reuses the same
 * character classes the forensic scanner knows about.
 */
export function depoison(text: string): string {
  return text
    .replace(/[\u200c\u200d\u2060\u00ad]/g, '')
    .replace(/([aeiouAEIOU])[\u0300\u0301\u0306\u0308]/g, '$1');
}
