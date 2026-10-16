/**
 * Shannon entropy + printable-character-ratio scoring. Used two ways:
 *  - decode.ts: decide whether a decoded candidate is real, meaningful text
 *    (garbage bytes decoded through base64→UTF-8 tank the printable ratio).
 *  - signatures.ts / risk.ts: weight findings higher when they're embedded
 *    in deliberately obfuscated content — obfuscation itself is a signal.
 */

/** Bits of entropy per character. English prose is typically ~3.5–4.3; base64/random data trends 5–6. */
export function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const len = s.length;
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Fraction of characters that are printable ASCII (or common whitespace). */
export function printableRatio(s: string): number {
  if (!s) return 0;
  let printable = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if ((cp >= 0x20 && cp <= 0x7e) || cp === 0x09 || cp === 0x0a || cp === 0x0d) printable++;
    // Also count common non-ASCII letters as printable so legitimate non-English decoded
    // text isn't penalized — a broad Unicode-letter check, not just ASCII.
    else if (/\p{L}/u.test(ch)) printable++;
  }
  return printable / s.length;
}

/**
 * Whether a decode attempt's output is worth accepting as a real finding rather
 * than noise. Deliberately conservative — false "we decoded something" claims
 * are worse for trust than missing a borderline one.
 */
export function looksLikeMeaningfulDecode(s: string, minLength = 4): boolean {
  if (s.length < minLength) return false;
  if (printableRatio(s) < 0.85) return false;
  // Reject a run of the Unicode replacement character — a telltale sign the bytes
  // weren't real UTF-8 text (e.g. we decoded random binary, not a hidden message).
  if (s.includes('�')) return false;
  return true;
}

/** Rough obfuscation-idiom check: high entropy + within a size range typical of encoded payloads (not a whole document). */
export function isHighEntropyBlob(s: string, threshold = 4.5): boolean {
  return s.length >= 16 && s.length <= 20_000 && shannonEntropy(s) >= threshold;
}
