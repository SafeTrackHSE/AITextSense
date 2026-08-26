export interface CorpusEntry {
  id: string;
  description: string;
  input: string;
  expectedClasses: string[];
  expectedCount: number;
  shouldFlagRemovable: boolean;
}

export const GOLDEN_CORPUS: CorpusEntry[] = [
  // === Zero-width characters ===
  {
    id: 'zwsp-between-letters',
    description: 'ZWSP inserted between visible letters',
    input: 'hel​lo',
    expectedClasses: ['zero-width'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },
  {
    id: 'zwnj-standalone',
    description: 'ZWNJ — meaningful in Persian/Indic, not safe to auto-remove',
    input: 'می‌خواهم',
    expectedClasses: ['zero-width'],
    expectedCount: 1,
    shouldFlagRemovable: false,
  },
  {
    id: 'zwj-in-emoji',
    description: 'ZWJ in emoji family sequence — must NOT be flagged as removable',
    input: '👨‍👩‍👧‍👦',
    expectedClasses: [],
    expectedCount: 0,
    shouldFlagRemovable: false,
  },
  {
    id: 'word-joiner',
    description: 'Word joiner between words',
    input: 'no⁠break',
    expectedClasses: ['zero-width'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },
  {
    id: 'bom-mid-text',
    description: 'BOM in middle of text (not at start)',
    input: 'hello﻿world',
    expectedClasses: ['bom'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },
  {
    id: 'bom-at-start',
    description: 'BOM at start of text',
    input: '﻿hello',
    expectedClasses: ['bom'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },

  // === Soft hyphen ===
  {
    id: 'soft-hyphen',
    description: 'Soft hyphen in a word',
    input: 'hyphen­ation',
    expectedClasses: ['soft-hyphen'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },

  // === Bidi controls ===
  {
    id: 'bidi-lro-unbalanced',
    description: 'Unbalanced LRO override — security risk (Trojan Source)',
    input: 'hello‭world',
    expectedClasses: ['bidi-control'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },
  {
    id: 'bidi-rlo-balanced',
    description: 'Balanced RLO + PDF — still flagged but detected as balanced',
    input: '‮مرحبا‬',
    expectedClasses: ['bidi-control'],
    expectedCount: 2,
    shouldFlagRemovable: true,
  },
  {
    id: 'bidi-lrm-rtl-text',
    description: 'LRM in mixed-direction text — legitimate use',
    input: 'Hello ‎مرحبا',
    expectedClasses: ['bidi-control'],
    expectedCount: 1,
    shouldFlagRemovable: false,
  },

  // === Whitespace anomalies ===
  {
    id: 'nbsp-standalone',
    description: 'NBSP — legitimate in French punctuation, flagged but not removable',
    input: 'Bonjour !',
    expectedClasses: ['whitespace-anomaly'],
    expectedCount: 1,
    shouldFlagRemovable: false,
  },
  {
    id: 'em-space',
    description: 'EM SPACE instead of regular space',
    input: 'hello world',
    expectedClasses: ['whitespace-anomaly'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },
  {
    id: 'ideographic-space',
    description: 'Ideographic space — standard in CJK, not auto-removable',
    input: '你好　世界',
    expectedClasses: ['whitespace-anomaly'],
    expectedCount: 1,
    shouldFlagRemovable: false,
  },
  {
    id: 'hair-space',
    description: 'Hair space between words',
    input: 'tight spacing',
    expectedClasses: ['whitespace-anomaly'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },

  // === Variation selectors ===
  {
    id: 'variation-selector-text',
    description: 'VS15 text presentation selector on emoji',
    input: '☺︎',
    expectedClasses: ['variation-selector'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },
  {
    id: 'variation-selector-emoji',
    description: 'VS16 emoji presentation selector',
    input: '☺️',
    expectedClasses: ['variation-selector'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },

  // === Tag characters ===
  {
    id: 'tag-chars-flag',
    description: 'Tag characters (used in subdivision flags)',
    input: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    expectedClasses: ['tag-char'],
    expectedCount: 6,
    shouldFlagRemovable: true,
  },

  // === Homoglyphs / confusables ===
  {
    id: 'cyrillic-a-in-latin',
    description: 'Cyrillic А (U+0410) mixed with Latin text',
    input: 'pаypal',
    expectedClasses: ['homoglyph'],
    expectedCount: 1,
    shouldFlagRemovable: false,
  },
  {
    id: 'cyrillic-o-in-url',
    description: 'Cyrillic о (U+043E) in what looks like a domain',
    input: 'gооgle.com',
    expectedClasses: ['homoglyph'],
    expectedCount: 2,
    shouldFlagRemovable: false,
  },

  // === Steganographic patterns ===
  {
    id: 'stego-zwsp-sequence',
    description: 'Sequence of 4+ zero-width chars encoding hidden data',
    input: 'hello​‌‍​‌‍world',
    expectedClasses: ['zero-width'],
    expectedCount: 6,
    shouldFlagRemovable: false,
  },

  // === Clean text (no findings) ===
  {
    id: 'clean-ascii',
    description: 'Plain ASCII text — no findings',
    input: 'Hello, world! This is a normal sentence.',
    expectedClasses: [],
    expectedCount: 0,
    shouldFlagRemovable: false,
  },
  {
    id: 'clean-emoji',
    description: 'Standard emoji without suspicious chars',
    input: 'Great job! 🎉🎊👍',
    expectedClasses: [],
    expectedCount: 0,
    shouldFlagRemovable: false,
  },
  {
    id: 'clean-accented',
    description: 'Accented Latin characters (precomposed NFC)',
    input: 'café résumé naïve',
    expectedClasses: [],
    expectedCount: 0,
    shouldFlagRemovable: false,
  },
  {
    id: 'clean-arabic',
    description: 'Pure Arabic text — no findings expected',
    input: 'مرحبا بالعالم',
    expectedClasses: [],
    expectedCount: 0,
    shouldFlagRemovable: false,
  },
  {
    id: 'clean-devanagari',
    description: 'Hindi text with combining marks — marks must NOT be flagged',
    input: 'नमस्ते दुनिया',
    expectedClasses: [],
    expectedCount: 0,
    shouldFlagRemovable: false,
  },
  {
    id: 'clean-hebrew',
    description: 'Hebrew text — no findings expected',
    input: 'שלום עולם',
    expectedClasses: [],
    expectedCount: 0,
    shouldFlagRemovable: false,
  },

  // === Mixed script runs ===
  {
    id: 'mixed-script-cyrillic-latin',
    description: 'Word mixing Cyrillic and Latin characters',
    input: 'pауpal',
    expectedClasses: ['homoglyph'],
    expectedCount: 2,
    shouldFlagRemovable: false,
  },

  // === Format characters ===
  {
    id: 'line-separator',
    description: 'Unicode line separator in text',
    input: 'line one line two',
    expectedClasses: ['format-char'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },
  {
    id: 'paragraph-separator',
    description: 'Unicode paragraph separator in text',
    input: 'para one para two',
    expectedClasses: ['format-char'],
    expectedCount: 1,
    shouldFlagRemovable: true,
  },

  // === Edge cases ===
  {
    id: 'empty-string',
    description: 'Empty input — no crash',
    input: '',
    expectedClasses: [],
    expectedCount: 0,
    shouldFlagRemovable: false,
  },
  {
    id: 'only-zwsp',
    description: 'Input is only zero-width spaces',
    input: '​​​',
    expectedClasses: ['zero-width'],
    expectedCount: 3,
    shouldFlagRemovable: true,
  },
  {
    id: 'surrogate-pairs',
    description: 'Text with supplementary plane chars (no false positives)',
    input: '𝕳𝖊𝖑𝖑𝖔',
    expectedClasses: [],
    expectedCount: 0,
    shouldFlagRemovable: false,
  },
];
