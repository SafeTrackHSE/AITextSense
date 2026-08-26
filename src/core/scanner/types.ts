export type CharClass =
  | 'zero-width'
  | 'bidi-control'
  | 'soft-hyphen'
  | 'variation-selector'
  | 'tag-char'
  | 'whitespace-anomaly'
  | 'homoglyph'
  | 'stego-pattern'
  | 'bom'
  | 'combining-mark'
  | 'format-char';

export type RiskLevel = 'security' | 'formatting' | 'info' | 'none';

export interface CharFinding {
  char: string;
  codePoint: number;
  codePointHex: string;
  name: string;
  category: string;
  script: string;
  charClass: CharClass;
  risk: RiskLevel;
  byteOffset: number;
  charOffset: number;
  graphemeIndex: number;
  safeToRemove: boolean;
  description: string;
  context: string;
}

export interface StegoPattern {
  startOffset: number;
  endOffset: number;
  codePoints: number[];
  decodedBits: string;
  decodedText: string | null;
}

export interface MixedScriptRun {
  word: string;
  offset: number;
  scripts: string[];
  confusableWith: string | null;
}

export interface BidiIssue {
  type: 'unbalanced-override' | 'unbalanced-embedding' | 'unbalanced-isolate';
  openOffset: number;
  closeOffset: number | null;
  controlChar: string;
}

export interface ScanResult {
  findings: CharFinding[];
  stegoPatterns: StegoPattern[];
  mixedScriptRuns: MixedScriptRun[];
  bidiIssues: BidiIssue[];
  stats: ScanStats;
  durationMs: number;
}

export interface ScanStats {
  totalChars: number;
  totalGraphemes: number;
  totalBytes: number;
  findingsByClass: Record<CharClass, number>;
  findingsByRisk: Record<RiskLevel, number>;
}

export interface ScanOptions {
  enabledClasses: Set<CharClass>;
  detectStego: boolean;
  detectMixedScript: boolean;
  detectBidiIssues: boolean;
  maxChars: number;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  enabledClasses: new Set<CharClass>([
    'zero-width',
    'bidi-control',
    'soft-hyphen',
    'variation-selector',
    'tag-char',
    'whitespace-anomaly',
    'homoglyph',
    'stego-pattern',
    'bom',
    'format-char',
  ]),
  detectStego: true,
  detectMixedScript: true,
  detectBidiIssues: true,
  maxChars: 1_000_000,
};
