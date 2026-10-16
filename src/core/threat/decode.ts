import { looksLikeMeaningfulDecode } from './entropy';
import { matchSignaturePatterns } from './signatures';
import type { DecodeHop, EncodingScheme } from './types';

export type { DecodeHop, EncodingScheme };

export interface DecodeResult {
  finalText: string;
  chain: DecodeHop[];
}

const MAX_DECODE_DEPTH = 2;
/** Bounds cost on adversarial input — independent of the depth cap. */
const MAX_TOTAL_DECODED_SIZE = 50_000;

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function tryBase64(s: string): { output: string; encoding: 'base64' | 'base64-utf16le' } | null {
  const trimmed = s.trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) || trimmed.length % 4 !== 0 || trimmed.length < 8) return null;
  try {
    const binary = atob(trimmed);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));

    // UTF-16LE check: bytes.length >= 16, bytes.length % 2 === 0, >= 45% of odd indices are 0x00, and >= 85% of even indices are printable ASCII (0x20-0x7E or \r\n\t)
    if (bytes.length >= 16 && bytes.length % 2 === 0) {
      let nullOddCount = 0;
      let printableEvenCount = 0;
      const pairs = bytes.length / 2;
      for (let i = 0; i < bytes.length; i += 2) {
        const evenByte = bytes[i];
        const oddByte = bytes[i + 1];
        if (oddByte === 0x00) nullOddCount++;
        if ((evenByte >= 0x20 && evenByte <= 0x7e) || evenByte === 0x0a || evenByte === 0x0d || evenByte === 0x09) {
          printableEvenCount++;
        }
      }
      if (nullOddCount / pairs >= 0.45 && printableEvenCount / pairs >= 0.85) {
        const decoded = new TextDecoder('utf-16le').decode(bytes);
        return { output: decoded, encoding: 'base64-utf16le' };
      }
    }

    const utf8 = utf8Decode(bytes);
    return { output: utf8, encoding: 'base64' };
  } catch {
    return null;
  }
}

function tryBase64Url(s: string): { output: string; encoding: 'base64url' } | null {
  const trimmed = s.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed) || trimmed.length < 8 || !/[_-]/.test(trimmed)) return null;
  const standard = trimmed.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
  const res = tryBase64(padded);
  if (!res) return null;
  return { output: res.output, encoding: 'base64url' };
}

function tryHex(s: string): string | null {
  const trimmed = s.trim().replace(/\s+/g, '');
  if (!/^[0-9a-fA-F]+$/.test(trimmed) || trimmed.length % 2 !== 0 || trimmed.length < 8) return null;
  try {
    const bytes = new Uint8Array(trimmed.length / 2);
    for (let i = 0; i < trimmed.length; i += 2) bytes[i / 2] = parseInt(trimmed.slice(i, i + 2), 16);
    return utf8Decode(bytes);
  } catch {
    return null;
  }
}

function tryPercentDecode(s: string): string | null {
  if (!/%[0-9a-fA-F]{2}/.test(s)) return null;
  try {
    const out = decodeURIComponent(s);
    return out === s ? null : out;
  } catch {
    return null;
  }
}

function tryCharCode(s: string): string | null {
  const jsMatch = s.match(/(?:String\.(?:fromCharCode|fromCodePoint)|\[char\])\s*\(([^)]+)\)/i);
  if (jsMatch) {
    const numbers = jsMatch[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
    if (numbers.length >= 3) {
      return String.fromCodePoint(...numbers);
    }
  }
  const pyChrs = [...s.matchAll(/chr\s*\(\s*(\d+)\s*\)/gi)];
  if (pyChrs.length >= 3) {
    return pyChrs.map(m => String.fromCharCode(parseInt(m[1], 10))).join('');
  }
  return null;
}

function tryEscapeHex(s: string): string | null {
  if (/(?:\\x[0-9a-fA-F]{2}){3,}/.test(s)) {
    try {
      const decoded = s.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      return decoded !== s ? decoded : null;
    } catch { return null; }
  }
  if (/(?:\\u[0-9a-fA-F]{4}){3,}/.test(s)) {
    try {
      const decoded = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      return decoded !== s ? decoded : null;
    } catch { return null; }
  }
  return null;
}

function tryConcatLadder(s: string): string | null {
  if (/(?:['"][^'"]*['"]\s*\+\s*)+['"][^'"]*['"]/.test(s)) {
    const concatenated = s.replace(/['"]\s*\+\s*['"]/g, '');
    const stripped = concatenated.replace(/^['"]|['"]$/g, '');
    if (stripped !== s && stripped.length >= 4) {
      return stripped;
    }
  }
  return null;
}

function tryPsBacktick(s: string): string | null {
  if (s.includes('`')) {
    const unbackticked = s.replace(/`([a-zA-Z])/g, '$1');
    if (unbackticked !== s && matchSignaturePatterns(unbackticked).length > 0) {
      return unbackticked;
    }
  }
  return null;
}

function rot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/**
 * Recursively tries each encoding, stopping the moment a hop's decoded
 * content matches a dangerous signature.
 */
export function decodeRecursive(span: string, depth = 0, chain: DecodeHop[] = [], totalSize = 0): DecodeResult {
  if (depth >= MAX_DECODE_DEPTH || totalSize > MAX_TOTAL_DECODED_SIZE) {
    return { finalText: span, chain };
  }

  const b64 = tryBase64(span);
  const b64Url = tryBase64Url(span);
  const structuralAttempts: Array<{ encoding: EncodingScheme; output: string | null }> = [
    ...(b64 ? [{ encoding: b64.encoding, output: b64.output }] : []),
    ...(b64Url ? [{ encoding: b64Url.encoding, output: b64Url.output }] : []),
    { encoding: 'hex', output: tryHex(span) },
    { encoding: 'percent', output: tryPercentDecode(span) },
    { encoding: 'charcode', output: tryCharCode(span) },
    { encoding: 'escape-hex', output: tryEscapeHex(span) },
    { encoding: 'concat-ladder', output: tryConcatLadder(span) },
    { encoding: 'ps-backtick', output: tryPsBacktick(span) },
  ];

  for (const attempt of structuralAttempts) {
    if (!attempt.output || attempt.output === span) continue;
    if (!looksLikeMeaningfulDecode(attempt.output)) continue;

    const newChain: DecodeHop[] = [...chain, { encoding: attempt.encoding, input: span, output: attempt.output }];
    const newTotalSize = totalSize + attempt.output.length;

    if (matchSignaturePatterns(attempt.output).length > 0) {
      return { finalText: attempt.output, chain: newChain };
    }

    return decodeRecursive(attempt.output, depth + 1, newChain, newTotalSize);
  }

  // ROT13 last resort: only "counts" if it directly reveals a dangerous pattern.
  const rotated = rot13(span);
  if (rotated !== span && matchSignaturePatterns(rotated).length > 0) {
    return { finalText: rotated, chain: [...chain, { encoding: 'rot13', input: span, output: rotated }] };
  }

  return { finalText: span, chain };
}
