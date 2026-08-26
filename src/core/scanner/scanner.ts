import type {
  CharFinding, StegoPattern, MixedScriptRun, BidiIssue,
  ScanResult, ScanStats, ScanOptions, CharClass, RiskLevel,
} from './types';
import { DEFAULT_SCAN_OPTIONS } from './types';
import {
  CHAR_CLASS_MAP, isVariationSelector, isTagChar,
  getVariationSelectorDef, getTagCharDef, isCombiningMark,
  getGeneralCategory, getScript, CONFUSABLES,
} from './char-classes';

const STEGO_CHARS = new Set([0x200b, 0x200c, 0x200d, 0xfeff]);
const BIDI_OPENERS: Record<number, 'embedding' | 'override' | 'isolate'> = {
  0x202a: 'embedding', 0x202b: 'embedding',
  0x202d: 'override', 0x202e: 'override',
  0x2066: 'isolate', 0x2067: 'isolate', 0x2068: 'isolate',
};
const BIDI_CLOSERS = new Set([0x202c, 0x2069]);

function isEmoji(cp: number): boolean {
  return (cp >= 0x1f600 && cp <= 0x1f64f) ||
    (cp >= 0x1f300 && cp <= 0x1f5ff) ||
    (cp >= 0x1f680 && cp <= 0x1f6ff) ||
    (cp >= 0x1f900 && cp <= 0x1f9ff) ||
    (cp >= 0x1fa00 && cp <= 0x1fa6f) ||
    (cp >= 0x1fa70 && cp <= 0x1faff) ||
    (cp >= 0x2600 && cp <= 0x26ff) ||
    (cp >= 0x2700 && cp <= 0x27bf) ||
    (cp >= 0x1f1e6 && cp <= 0x1f1ff) ||
    (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
    (cp >= 0x200d && cp <= 0x200d) ||
    cp === 0x2640 || cp === 0x2642 || cp === 0x2695 ||
    cp === 0x2696 || cp === 0x2708 || cp === 0x2764 ||
    cp === 0xfe0f || cp === 0x200d;
}

function isZwjInEmojiSequence(codePoints: number[], idx: number): boolean {
  const cp = codePoints[idx];
  if (cp !== 0x200d) return false;
  const prev = idx > 0 ? codePoints[idx - 1] : -1;
  const next = idx < codePoints.length - 1 ? codePoints[idx + 1] : -1;
  const prevIsVs = idx > 1 && (codePoints[idx - 1] === 0xfe0f || codePoints[idx - 1] === 0xfe0e);
  const emojiPrev = prevIsVs ? (idx > 1 ? codePoints[idx - 2] : -1) : prev;
  return (emojiPrev > 0x7f && isEmoji(emojiPrev)) || (next > 0x7f && isEmoji(next));
}

export function scan(text: string, options: Partial<ScanOptions> = {}): ScanResult {
  const opts: ScanOptions = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const start = performance.now();

  const findings: CharFinding[] = [];
  const stegoPatterns: StegoPattern[] = [];
  const bidiIssues: BidiIssue[] = [];

  const cpArray: number[] = [];
  const cpChars: string[] = [];
  for (const ch of text) {
    cpArray.push(ch.codePointAt(0)!);
    cpChars.push(ch);
  }
  const cpLen = cpArray.length;

  const fullBytes = new TextEncoder().encode(text);
  const totalBytes = fullBytes.length;

  const byteOffsets: number[] = new Array(cpLen);
  let bOff = 0;
  for (let i = 0; i < cpLen; i++) {
    byteOffsets[i] = bOff;
    const cp = cpArray[i];
    if (cp <= 0x7f) bOff += 1;
    else if (cp <= 0x7ff) bOff += 2;
    else if (cp <= 0xffff) bOff += 3;
    else bOff += 4;
  }

  const bidiStack: Array<{ cp: number; type: string; offset: number }> = [];
  let stegoRun: number[] = [];
  let stegoStart = -1;

  const graphemeSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
  const graphemeMap = buildGraphemeMap(text, graphemeSegmenter);

  for (let i = 0; i < cpLen; i++) {
    const cp = cpArray[i];
    const char = cpChars[i];
    const currentByteOffset = byteOffsets[i];

    if (isVariationSelector(cp) && opts.enabledClasses.has('variation-selector')) {
      const vsDef = getVariationSelectorDef(cp);
      findings.push(makeFinding(char, cp, 'variation-selector', vsDef.risk,
        vsDef.safeToRemove, vsDef.name, vsDef.description,
        currentByteOffset, i, graphemeMap.get(i) ?? i, cpChars, i));
    } else if (isCombiningMark(cp)) {
      continue;
    } else if (cp === 0x200d && isZwjInEmojiSequence(cpArray, i)) {
      continue;
    } else {
      const classDef = CHAR_CLASS_MAP.get(cp);
      if (classDef && opts.enabledClasses.has(classDef.charClass)) {
        findings.push(makeFinding(char, cp, classDef.charClass, classDef.risk,
          classDef.safeToRemove, classDef.name, classDef.description,
          currentByteOffset, i, graphemeMap.get(i) ?? i, cpChars, i));
      } else if (isTagChar(cp) && opts.enabledClasses.has('tag-char')) {
        const tagDef = getTagCharDef(cp);
        findings.push(makeFinding(char, cp, 'tag-char', tagDef.risk,
          tagDef.safeToRemove, tagDef.name, tagDef.description,
          currentByteOffset, i, graphemeMap.get(i) ?? i, cpChars, i));
      } else if (opts.enabledClasses.has('homoglyph') && CONFUSABLES.has(cp)) {
        const conf = CONFUSABLES.get(cp)!;
        findings.push(makeFinding(char, cp, 'homoglyph', 'security', false,
          `CONFUSABLE: ${String.fromCodePoint(cp)} → ${String.fromCodePoint(conf.target)}`,
          `Looks like ${conf.targetScript} '${String.fromCodePoint(conf.target)}' but is ${getScript(cp)}`,
          currentByteOffset, i, graphemeMap.get(i) ?? i, cpChars, i));
      }
    }

    if (opts.detectStego) {
      if (STEGO_CHARS.has(cp) && !isZwjInEmojiSequence(cpArray, i)) {
        if (stegoRun.length === 0) stegoStart = i;
        stegoRun.push(cp);
      } else if (stegoRun.length >= 3) {
        stegoPatterns.push(decodeStegoRun(stegoRun, stegoStart, i - 1));
        stegoRun = [];
        stegoStart = -1;
      } else {
        stegoRun = [];
        stegoStart = -1;
      }
    }

    if (opts.detectBidiIssues) {
      if (cp in BIDI_OPENERS) {
        bidiStack.push({ cp, type: BIDI_OPENERS[cp], offset: i });
      } else if (BIDI_CLOSERS.has(cp)) {
        const expectedType = cp === 0x202c ? ['embedding', 'override'] : ['isolate'];
        const idx = findLastIndex(bidiStack, e => expectedType.includes(e.type));
        if (idx >= 0) {
          bidiStack.splice(idx, 1);
        }
      }
    }
  }

  if (stegoRun.length >= 3) {
    stegoPatterns.push(decodeStegoRun(stegoRun, stegoStart, cpLen - 1));
  }

  for (const unclosed of bidiStack) {
    bidiIssues.push({
      type: `unbalanced-${unclosed.type}` as BidiIssue['type'],
      openOffset: unclosed.offset,
      closeOffset: null,
      controlChar: String.fromCodePoint(unclosed.cp),
    });
  }

  const mixedScriptRuns = opts.detectMixedScript
    ? detectMixedScripts(text)
    : [];

  const stats = computeStats(findings, cpLen, totalBytes, text, graphemeSegmenter);
  const durationMs = performance.now() - start;

  return { findings, stegoPatterns, mixedScriptRuns, bidiIssues, stats, durationMs };
}

function makeFinding(
  char: string, cp: number, charClass: CharClass, risk: RiskLevel,
  safeToRemove: boolean, name: string, description: string,
  byteOffset: number, charOffset: number, graphemeIndex: number,
  cpChars: string[], idx: number,
): CharFinding {
  const ctxStart = Math.max(0, idx - 5);
  const ctxEnd = Math.min(cpChars.length, idx + 6);
  const context = cpChars.slice(ctxStart, ctxEnd).join('');

  return {
    char, codePoint: cp,
    codePointHex: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
    name, category: getGeneralCategory(cp), script: getScript(cp),
    charClass, risk, byteOffset, charOffset, graphemeIndex,
    safeToRemove, description, context,
  };
}

function decodeStegoRun(run: number[], startOffset: number, endOffset: number): StegoPattern {
  const bitMap: Record<number, string> = {
    0x200b: '00', 0x200c: '01', 0x200d: '10', 0xfeff: '11',
  };
  const bits = run.map(cp => bitMap[cp] ?? '').join('');

  let decoded: string | null = null;
  try {
    const bytes: number[] = [];
    for (let i = 0; i + 7 < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    const raw = new Uint8Array(bytes);
    const t = new TextDecoder('utf-8', { fatal: true }).decode(raw);
    if (/^[\x20-\x7e]+$/.test(t)) decoded = t;
  } catch { /* not valid UTF-8 text */ }

  return {
    startOffset, endOffset,
    codePoints: [...run],
    decodedBits: bits,
    decodedText: decoded,
  };
}

function detectMixedScripts(text: string): MixedScriptRun[] {
  const results: MixedScriptRun[] = [];
  const wordRegex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const scripts = new Set<string>();

    for (const ch of word) {
      const cp = ch.codePointAt(0)!;
      if (cp < 0x80) continue;
      const s = getScript(cp);
      if (s !== 'Common' && s !== 'Inherited' && s !== 'Unknown') {
        scripts.add(s);
      }
    }

    const hasLatin = /[a-zA-Z]/.test(word);
    if (hasLatin) scripts.add('Latin');

    if (scripts.size > 1) {
      let confusable: string | null = null;
      const normalized = Array.from(word).map(ch => {
        const cp = ch.codePointAt(0)!;
        const conf = CONFUSABLES.get(cp);
        return conf ? String.fromCodePoint(conf.target) : ch;
      }).join('');
      if (normalized !== word) confusable = normalized;

      results.push({
        word,
        offset: match.index,
        scripts: [...scripts],
        confusableWith: confusable,
      });
    }
  }

  return results;
}

function buildGraphemeMap(
  text: string,
  segmenter: Intl.Segmenter | null,
): Map<number, number> {
  const map = new Map<number, number>();
  if (!segmenter) return map;

  let graphemeIdx = 0;
  let cpIdx = 0;

  for (const segment of segmenter.segment(text)) {
    const len = Array.from(segment.segment).length;
    for (let i = 0; i < len; i++) {
      map.set(cpIdx + i, graphemeIdx);
    }
    cpIdx += len;
    graphemeIdx++;
  }

  return map;
}

function findLastIndex<T>(arr: T[], pred: (v: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}

function computeStats(
  findings: CharFinding[],
  totalChars: number,
  totalBytes: number,
  text: string,
  segmenter: Intl.Segmenter | null,
): ScanStats {
  const findingsByClass = {} as Record<CharClass, number>;
  const findingsByRisk = {} as Record<RiskLevel, number>;

  for (const f of findings) {
    findingsByClass[f.charClass] = (findingsByClass[f.charClass] ?? 0) + 1;
    findingsByRisk[f.risk] = (findingsByRisk[f.risk] ?? 0) + 1;
  }

  const totalGraphemes = segmenter
    ? [...segmenter.segment(text)].length
    : totalChars;

  return {
    totalChars,
    totalGraphemes,
    totalBytes,
    findingsByClass,
    findingsByRisk,
  };
}
