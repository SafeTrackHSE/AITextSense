import type { CharClass, RiskLevel } from './types';

export interface CharClassDef {
  charClass: CharClass;
  risk: RiskLevel;
  safeToRemove: boolean;
  name: string;
  description: string;
}

const def = (
  charClass: CharClass,
  risk: RiskLevel,
  safeToRemove: boolean,
  name: string,
  description: string
): CharClassDef => ({ charClass, risk, safeToRemove, name, description });

export const CHAR_CLASS_MAP: Map<number, CharClassDef> = new Map([
  // BOM
  [0xfeff, def('bom', 'formatting', true, 'BYTE ORDER MARK', 'BOM / zero-width no-break space — often injected by editors')],

  // Zero-width characters
  [0x200b, def('zero-width', 'security', true, 'ZERO WIDTH SPACE', 'Invisible space used for steganography or line-break hints')],
  [0x200c, def('zero-width', 'info', false, 'ZERO WIDTH NON-JOINER', 'Prevents ligature formation — meaningful in Persian, Indic scripts')],
  [0x200d, def('zero-width', 'info', false, 'ZERO WIDTH JOINER', 'Joins characters — essential for emoji sequences and Indic scripts')],
  [0x2060, def('zero-width', 'formatting', true, 'WORD JOINER', 'Prevents line break — usually non-semantic')],
  [0x180e, def('zero-width', 'formatting', true, 'MONGOLIAN VOWEL SEPARATOR', 'Rare formatting char, often misused')],

  // Soft hyphen
  [0x00ad, def('soft-hyphen', 'formatting', true, 'SOFT HYPHEN', 'Optional hyphenation point — invisible unless line-breaking')],

  // Bidi controls
  [0x200e, def('bidi-control', 'formatting', false, 'LEFT-TO-RIGHT MARK', 'Explicit LTR direction — legitimate in mixed-direction text')],
  [0x200f, def('bidi-control', 'formatting', false, 'RIGHT-TO-LEFT MARK', 'Explicit RTL direction — legitimate in mixed-direction text')],
  [0x202a, def('bidi-control', 'security', true, 'LEFT-TO-RIGHT EMBEDDING', 'Bidi embedding override — risk of text spoofing (UAX #9)')],
  [0x202b, def('bidi-control', 'security', true, 'RIGHT-TO-LEFT EMBEDDING', 'Bidi embedding override — risk of text spoofing (UAX #9)')],
  [0x202c, def('bidi-control', 'formatting', true, 'POP DIRECTIONAL FORMATTING', 'Closes bidi embedding/override')],
  [0x202d, def('bidi-control', 'security', true, 'LEFT-TO-RIGHT OVERRIDE', 'Forces LTR rendering — can mask RTL text (Trojan Source)')],
  [0x202e, def('bidi-control', 'security', true, 'RIGHT-TO-LEFT OVERRIDE', 'Forces RTL rendering — can mask LTR text (Trojan Source)')],
  [0x2066, def('bidi-control', 'formatting', false, 'LEFT-TO-RIGHT ISOLATE', 'Modern bidi isolate — generally safe')],
  [0x2067, def('bidi-control', 'formatting', false, 'RIGHT-TO-LEFT ISOLATE', 'Modern bidi isolate — generally safe')],
  [0x2068, def('bidi-control', 'formatting', false, 'FIRST STRONG ISOLATE', 'Auto-detect direction isolate')],
  [0x2069, def('bidi-control', 'formatting', false, 'POP DIRECTIONAL ISOLATE', 'Closes bidi isolate')],

  // Whitespace anomalies
  [0x00a0, def('whitespace-anomaly', 'formatting', false, 'NO-BREAK SPACE', 'Prevents line break — legitimate in French punctuation, numbers')],
  [0x1680, def('whitespace-anomaly', 'formatting', true, 'OGHAM SPACE MARK', 'Ogham script space — suspicious outside Ogham text')],
  [0x2000, def('whitespace-anomaly', 'formatting', true, 'EN QUAD', 'Fixed-width space — may indicate formatting artifacts')],
  [0x2001, def('whitespace-anomaly', 'formatting', true, 'EM QUAD', 'Fixed-width space — may indicate formatting artifacts')],
  [0x2002, def('whitespace-anomaly', 'formatting', true, 'EN SPACE', 'Half-em width space')],
  [0x2003, def('whitespace-anomaly', 'formatting', true, 'EM SPACE', 'Full-em width space')],
  [0x2004, def('whitespace-anomaly', 'formatting', true, 'THREE-PER-EM SPACE', 'Third-em width space')],
  [0x2005, def('whitespace-anomaly', 'formatting', true, 'FOUR-PER-EM SPACE', 'Quarter-em width space')],
  [0x2006, def('whitespace-anomaly', 'formatting', true, 'SIX-PER-EM SPACE', 'Sixth-em width space')],
  [0x2007, def('whitespace-anomaly', 'formatting', true, 'FIGURE SPACE', 'Digit-width space for number alignment')],
  [0x2008, def('whitespace-anomaly', 'formatting', true, 'PUNCTUATION SPACE', 'Width of a period')],
  [0x2009, def('whitespace-anomaly', 'formatting', true, 'THIN SPACE', 'Narrow space — used in French, some number formats')],
  [0x200a, def('whitespace-anomaly', 'formatting', true, 'HAIR SPACE', 'Very narrow space')],
  [0x202f, def('whitespace-anomaly', 'formatting', false, 'NARROW NO-BREAK SPACE', 'Required in French before ; : ! ? and in Mongolian')],
  [0x205f, def('whitespace-anomaly', 'formatting', true, 'MEDIUM MATHEMATICAL SPACE', 'Math typesetting space')],
  [0x3000, def('whitespace-anomaly', 'formatting', false, 'IDEOGRAPHIC SPACE', 'Full-width space — standard in CJK text')],

  // Format characters
  [0x2028, def('format-char', 'formatting', true, 'LINE SEPARATOR', 'Unicode line separator — rarely intentional in web text')],
  [0x2029, def('format-char', 'formatting', true, 'PARAGRAPH SEPARATOR', 'Unicode paragraph separator — rarely intentional in web text')],
  [0x061c, def('format-char', 'formatting', false, 'ARABIC LETTER MARK', 'Arabic text direction control')],
  [0xfff9, def('format-char', 'formatting', true, 'INTERLINEAR ANNOTATION ANCHOR', 'Annotation formatting')],
  [0xfffa, def('format-char', 'formatting', true, 'INTERLINEAR ANNOTATION SEPARATOR', 'Annotation formatting')],
  [0xfffb, def('format-char', 'formatting', true, 'INTERLINEAR ANNOTATION TERMINATOR', 'Annotation formatting')],
  [0xfffc, def('format-char', 'info', false, 'OBJECT REPLACEMENT CHARACTER', 'Placeholder for an embedded object')],
]);

export function isVariationSelector(cp: number): boolean {
  return (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef);
}

export function isTagChar(cp: number): boolean {
  return cp >= 0xe0000 && cp <= 0xe007f;
}

export function getVariationSelectorDef(cp: number): CharClassDef {
  if (cp >= 0xfe00 && cp <= 0xfe0f) {
    const n = cp - 0xfe00 + 1;
    return def('variation-selector', 'formatting', true,
      `VARIATION SELECTOR-${n}`,
      `Text presentation selector VS${n} — can alter glyph rendering`);
  }
  const n = cp - 0xe0100 + 17;
  return def('variation-selector', 'formatting', true,
    `VARIATION SELECTOR-${n}`,
    `Ideographic variation selector VS${n} — CJK glyph variant`);
}

export function getTagCharDef(cp: number): CharClassDef {
  const mapped = cp - 0xe0000;
  const visible = mapped >= 0x20 && mapped <= 0x7e ? String.fromCharCode(mapped) : '';
  return def('tag-char', 'security', true,
    `TAG ${visible ? `'${visible}'` : `U+${cp.toString(16).toUpperCase()}`}`,
    'Tag character — used in emoji flag sequences, suspicious elsewhere');
}

export function isCombiningMark(cp: number): boolean {
  const cat = getGeneralCategory(cp);
  return cat === 'Mn' || cat === 'Mc' || cat === 'Me';
}

const GC_RANGES: Array<[number, number, string]> = [
  [0x0300, 0x036f, 'Mn'], // Combining Diacritical Marks
  [0x0483, 0x0489, 'Mn'], // Cyrillic combining
  [0x0591, 0x05bd, 'Mn'], // Hebrew combining
  [0x05bf, 0x05bf, 'Mn'],
  [0x05c1, 0x05c2, 'Mn'],
  [0x05c4, 0x05c5, 'Mn'],
  [0x05c7, 0x05c7, 'Mn'],
  [0x0610, 0x061a, 'Mn'], // Arabic combining
  [0x064b, 0x065f, 'Mn'],
  [0x0670, 0x0670, 'Mn'],
  [0x06d6, 0x06dc, 'Mn'],
  [0x06df, 0x06e4, 'Mn'],
  [0x06e7, 0x06e8, 'Mn'],
  [0x06ea, 0x06ed, 'Mn'],
  [0x0711, 0x0711, 'Mn'], // Syriac
  [0x0730, 0x074a, 'Mn'],
  [0x0900, 0x0903, 'Mn'], // Devanagari
  [0x093a, 0x094f, 'Mn'],
  [0x0951, 0x0957, 'Mn'],
  [0x0962, 0x0963, 'Mn'],
  [0x0981, 0x0983, 'Mn'], // Bengali
  [0x09bc, 0x09bc, 'Mn'],
  [0x09be, 0x09cd, 'Mn'],
  [0x09d7, 0x09d7, 'Mc'],
  [0x09e2, 0x09e3, 'Mn'],
  [0x0a01, 0x0a03, 'Mn'], // Gurmukhi
  [0x0a3c, 0x0a3c, 'Mn'],
  [0x0a3e, 0x0a42, 'Mn'],
  [0x0a47, 0x0a48, 'Mn'],
  [0x0a4b, 0x0a4d, 'Mn'],
  [0x0a70, 0x0a71, 'Mn'],
  [0x0a75, 0x0a75, 'Mn'],
  [0x1ab0, 0x1ace, 'Mn'], // Combining Diacritical Marks Extended
  [0x1dc0, 0x1dff, 'Mn'], // Combining Diacritical Marks Supplement
  [0x20d0, 0x20f0, 'Mn'], // Combining Diacritical Marks for Symbols
  [0xfe20, 0xfe2f, 'Mn'], // Combining Half Marks
];

export function getGeneralCategory(cp: number): string {
  for (const [start, end, cat] of GC_RANGES) {
    if (cp >= start && cp <= end) return cat;
  }
  if (CHAR_CLASS_MAP.has(cp)) return 'Cf';
  if (isVariationSelector(cp)) return 'Mn';
  if (isTagChar(cp)) return 'Cf';
  return 'Lo';
}

const SCRIPT_RANGES: Array<[number, number, string]> = [
  [0x0000, 0x007f, 'Latin'],
  [0x0080, 0x00ff, 'Latin'],
  [0x0100, 0x024f, 'Latin'],
  [0x0250, 0x02af, 'Latin'],
  [0x0300, 0x036f, 'Inherited'],
  [0x0370, 0x03ff, 'Greek'],
  [0x0400, 0x04ff, 'Cyrillic'],
  [0x0500, 0x052f, 'Cyrillic'],
  [0x0530, 0x058f, 'Armenian'],
  [0x0590, 0x05ff, 'Hebrew'],
  [0x0600, 0x06ff, 'Arabic'],
  [0x0700, 0x074f, 'Syriac'],
  [0x0900, 0x097f, 'Devanagari'],
  [0x0980, 0x09ff, 'Bengali'],
  [0x0a00, 0x0a7f, 'Gurmukhi'],
  [0x0a80, 0x0aff, 'Gujarati'],
  [0x0b00, 0x0b7f, 'Oriya'],
  [0x0b80, 0x0bff, 'Tamil'],
  [0x0c00, 0x0c7f, 'Telugu'],
  [0x0c80, 0x0cff, 'Kannada'],
  [0x0d00, 0x0d7f, 'Malayalam'],
  [0x0e00, 0x0e7f, 'Thai'],
  [0x0e80, 0x0eff, 'Lao'],
  [0x1000, 0x109f, 'Myanmar'],
  [0x10a0, 0x10ff, 'Georgian'],
  [0x1100, 0x11ff, 'Hangul'],
  [0x1200, 0x137f, 'Ethiopic'],
  [0x13a0, 0x13ff, 'Cherokee'],
  [0x1400, 0x167f, 'Canadian_Aboriginal'],
  [0x1680, 0x169f, 'Ogham'],
  [0x16a0, 0x16ff, 'Runic'],
  [0x1780, 0x17ff, 'Khmer'],
  [0x1800, 0x18af, 'Mongolian'],
  [0x2e80, 0x2eff, 'Han'],
  [0x3000, 0x303f, 'Common'],
  [0x3040, 0x309f, 'Hiragana'],
  [0x30a0, 0x30ff, 'Katakana'],
  [0x3100, 0x312f, 'Bopomofo'],
  [0x3130, 0x318f, 'Hangul'],
  [0x31a0, 0x31bf, 'Bopomofo'],
  [0x3400, 0x4dbf, 'Han'],
  [0x4e00, 0x9fff, 'Han'],
  [0xa000, 0xa48f, 'Yi'],
  [0xac00, 0xd7af, 'Hangul'],
  [0xf900, 0xfaff, 'Han'],
  [0x10000, 0x1007f, 'LinearB'],
  [0x1f000, 0x1f9ff, 'Common'],
];

export function getScript(cp: number): string {
  for (const [start, end, script] of SCRIPT_RANGES) {
    if (cp >= start && cp <= end) return script;
  }
  return 'Unknown';
}

export const CONFUSABLES: Map<number, { target: number; targetScript: string }> = new Map([
  // Cyrillic → Latin
  [0x0410, { target: 0x0041, targetScript: 'Latin' }], // А → A
  [0x0412, { target: 0x0042, targetScript: 'Latin' }], // В → B
  [0x0421, { target: 0x0043, targetScript: 'Latin' }], // С → C
  [0x0415, { target: 0x0045, targetScript: 'Latin' }], // Е → E
  [0x041d, { target: 0x0048, targetScript: 'Latin' }], // Н → H
  [0x0406, { target: 0x0049, targetScript: 'Latin' }], // І → I
  [0x041a, { target: 0x004b, targetScript: 'Latin' }], // К → K
  [0x041c, { target: 0x004d, targetScript: 'Latin' }], // М → M
  [0x041e, { target: 0x004f, targetScript: 'Latin' }], // О → O
  [0x0420, { target: 0x0050, targetScript: 'Latin' }], // Р → P
  [0x0422, { target: 0x0054, targetScript: 'Latin' }], // Т → T
  [0x0425, { target: 0x0058, targetScript: 'Latin' }], // Х → X
  [0x0430, { target: 0x0061, targetScript: 'Latin' }], // а → a
  [0x0435, { target: 0x0065, targetScript: 'Latin' }], // е → e
  [0x043e, { target: 0x006f, targetScript: 'Latin' }], // о → o
  [0x0440, { target: 0x0070, targetScript: 'Latin' }], // р → p
  [0x0441, { target: 0x0063, targetScript: 'Latin' }], // с → c
  [0x0443, { target: 0x0079, targetScript: 'Latin' }], // у → y
  [0x0445, { target: 0x0078, targetScript: 'Latin' }], // х → x
  [0x0455, { target: 0x0073, targetScript: 'Latin' }], // ѕ → s
  [0x0456, { target: 0x0069, targetScript: 'Latin' }], // і → i
  [0x0458, { target: 0x006a, targetScript: 'Latin' }], // ј → j

  // Greek → Latin
  [0x0391, { target: 0x0041, targetScript: 'Latin' }], // Α → A
  [0x0392, { target: 0x0042, targetScript: 'Latin' }], // Β → B
  [0x0395, { target: 0x0045, targetScript: 'Latin' }], // Ε → E
  [0x0396, { target: 0x005a, targetScript: 'Latin' }], // Ζ → Z
  [0x0397, { target: 0x0048, targetScript: 'Latin' }], // Η → H
  [0x0399, { target: 0x0049, targetScript: 'Latin' }], // Ι → I
  [0x039a, { target: 0x004b, targetScript: 'Latin' }], // Κ → K
  [0x039c, { target: 0x004d, targetScript: 'Latin' }], // Μ → M
  [0x039d, { target: 0x004e, targetScript: 'Latin' }], // Ν → N
  [0x039f, { target: 0x004f, targetScript: 'Latin' }], // Ο → O
  [0x03a1, { target: 0x0050, targetScript: 'Latin' }], // Ρ → P
  [0x03a4, { target: 0x0054, targetScript: 'Latin' }], // Τ → T
  [0x03a5, { target: 0x0059, targetScript: 'Latin' }], // Υ → Y
  [0x03a7, { target: 0x0058, targetScript: 'Latin' }], // Χ → X
  [0x03bf, { target: 0x006f, targetScript: 'Latin' }], // ο → o
  [0x03b1, { target: 0x0061, targetScript: 'Latin' }], // α → a (visual only)
]);

export function isEmojiModifier(cp: number): boolean {
  return cp >= 0x1f3fb && cp <= 0x1f3ff;
}

export function isRegionalIndicator(cp: number): boolean {
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}
