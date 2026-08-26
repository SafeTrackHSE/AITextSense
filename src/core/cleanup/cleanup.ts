import type { CleanupOptions, CleanupResult, CharChange } from './types';
import {
  CHAR_CLASS_MAP, isVariationSelector, isTagChar,
  CONFUSABLES, isCombiningMark,
} from '../scanner/char-classes';


const CONSERVATIVE_REMOVE_POINTS = new Set([
  0x200b, 0x2060, 0x180e, 0xfeff,
  0x00ad,
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
  0x2028, 0x2029,
  0xfff9, 0xfffa, 0xfffb,
]);

const AGGRESSIVE_REMOVE_WHITESPACE = new Set([
  0x00a0, 0x1680,
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
  0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
  0x202f, 0x205f, 0x3000,
]);

function isEmojiContext(codePoints: number[], idx: number): boolean {
  const cp = codePoints[idx];
  if (cp !== 0x200d) return false;
  const prev = idx > 0 ? codePoints[idx - 1] : -1;
  const next = idx < codePoints.length - 1 ? codePoints[idx + 1] : -1;
  const isEm = (c: number) => c > 0x7f && (
    (c >= 0x1f600 && c <= 0x1f64f) || (c >= 0x1f300 && c <= 0x1f5ff) ||
    (c >= 0x1f680 && c <= 0x1f6ff) || (c >= 0x1f900 && c <= 0x1f9ff) ||
    (c >= 0x1fa00 && c <= 0x1faff) || (c >= 0x2600 && c <= 0x26ff) ||
    (c >= 0x2700 && c <= 0x27bf) || (c >= 0x1f1e6 && c <= 0x1f1ff) ||
    (c >= 0x1f3fb && c <= 0x1f3ff) || c === 0xfe0f
  );
  const prevCp = (idx > 1 && (prev === 0xfe0f || prev === 0xfe0e)) ? codePoints[idx - 2] : prev;
  return isEm(prevCp) || isEm(next);
}

export function cleanup(text: string, options: CleanupOptions): CleanupResult {
  if (options.mode === 'report-only') {
    return {
      original: text, cleaned: text, changes: [],
      mode: 'report-only', timestamp: new Date().toISOString(),
    };
  }

  const cpArray: number[] = [];
  const cpChars: string[] = [];
  for (const ch of text) {
    cpArray.push(ch.codePointAt(0)!);
    cpChars.push(ch);
  }

  const changes: CharChange[] = [];
  const outputChars: string[] = [];

  for (let i = 0; i < cpArray.length; i++) {
    const cp = cpArray[i];
    const char = cpChars[i];

    if (isVariationSelector(cp)) {
      const action = shouldRemove(cp, options, cpArray, i);
      if (action === 'remove') {
        changes.push({
          offset: i, original: char, replacement: '', codePoint: cp,
          reason: `VARIATION SELECTOR U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
        });
        continue;
      }
      outputChars.push(char);
      continue;
    }

    if (isCombiningMark(cp)) {
      outputChars.push(char);
      continue;
    }

    if (cp === 0x200d && isEmojiContext(cpArray, i)) {
      outputChars.push(char);
      continue;
    }

    const action = shouldRemove(cp, options, cpArray, i);

    if (action === 'remove') {
      const classDef = CHAR_CLASS_MAP.get(cp);
      changes.push({
        offset: i,
        original: char,
        replacement: '',
        codePoint: cp,
        reason: classDef?.name ?? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
      });
    } else if (action === 'normalize' && CONFUSABLES.has(cp)) {
      const conf = CONFUSABLES.get(cp)!;
      const replacement = String.fromCodePoint(conf.target);
      changes.push({
        offset: i,
        original: char,
        replacement,
        codePoint: cp,
        reason: `Homoglyph normalized: ${char} → ${replacement}`,
      });
      outputChars.push(replacement);
    } else if (action === 'space') {
      changes.push({
        offset: i,
        original: char,
        replacement: ' ',
        codePoint: cp,
        reason: `Whitespace normalized to standard space`,
      });
      outputChars.push(' ');
    } else {
      outputChars.push(char);
    }
  }

  return {
    original: text,
    cleaned: outputChars.join(''),
    changes,
    mode: options.mode,
    timestamp: new Date().toISOString(),
  };
}

type RemoveAction = 'keep' | 'remove' | 'normalize' | 'space';

function shouldRemove(
  cp: number, opts: CleanupOptions, _cpArray: number[], _idx: number,
): RemoveAction {
  if (opts.mode === 'conservative') {
    if (CONSERVATIVE_REMOVE_POINTS.has(cp)) return 'remove';
    return 'keep';
  }

  if (opts.mode === 'aggressive') {
    if (CONSERVATIVE_REMOVE_POINTS.has(cp)) return 'remove';

    const classDef = CHAR_CLASS_MAP.get(cp);
    if (classDef) {
      if (classDef.charClass === 'zero-width' && classDef.safeToRemove) return 'remove';
      if (classDef.charClass === 'bidi-control') return 'remove';
      if (classDef.charClass === 'format-char') return 'remove';
    }

    if (cp === 0x200c || cp === 0x200d) return 'remove';
    if (isVariationSelector(cp)) return 'remove';
    if (isTagChar(cp)) return 'remove';
    if (AGGRESSIVE_REMOVE_WHITESPACE.has(cp)) return 'space';
    if (CONFUSABLES.has(cp)) return 'normalize';

    return 'keep';
  }

  if (opts.mode === 'custom' && opts.customClasses) {
    const classDef = CHAR_CLASS_MAP.get(cp);
    if (classDef && opts.customClasses.has(classDef.charClass)) {
      if (classDef.safeToRemove) return 'remove';
    }
    if (opts.customClasses.has('variation-selector') && isVariationSelector(cp)) return 'remove';
    if (opts.customClasses.has('tag-char') && isTagChar(cp)) return 'remove';
    if (opts.customClasses.has('homoglyph') && CONFUSABLES.has(cp) && opts.homoglyphNormalize) {
      return 'normalize';
    }
    if (opts.customClasses.has('whitespace-anomaly') && AGGRESSIVE_REMOVE_WHITESPACE.has(cp)) {
      return 'space';
    }
    return 'keep';
  }

  return 'keep';
}
