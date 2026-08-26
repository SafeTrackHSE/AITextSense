/**
 * Sentence-level restructuring used by humanize / deparaphrase.
 * These transforms attack burstiness (sentence-length uniformity) and
 * n-gram overlap — the two statistical signals detectors weight most.
 */
import type { RewriteEdit } from './types';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.length > 0);
}

const WORD = /\s+/;

/**
 * Break long sentences (> threshold words) at a coordinating conjunction or
 * semicolon into two shorter sentences. Raises burstiness (variance) toward human range.
 */
export function splitLongSentences(text: string, thresholdWords: number, max: number, edits: RewriteEdit[]): string {
  const sentences = splitSentences(text);
  let result = text;
  let done = 0;

  // Any of these can serve as a split seam; we pick the one whose character
  // position is closest to the sentence midpoint (so both halves stay substantial).
  const seam = /(;\s+)|(,\s+(?:and|but|so|yet|because|although)\s+)|(\s+(?:which|while|whereas)\s+)|(,\s+)/gi;
  const MIN_HALF_WORDS = 4;

  for (const s of sentences) {
    if (done >= max) break;
    const words = s.trim().split(WORD);
    if (words.length <= thresholdWords) continue;

    const mid = s.length / 2;
    let bestPos = -1;
    let bestLen = 0;
    let bestDist = Infinity;

    const re = new RegExp(seam.source, seam.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      const pos = m.index;
      const matchLen = m[0].length;
      const headWords = s.slice(0, pos).trim().split(WORD).length;
      const tailWords = s.slice(pos + matchLen).trim().split(WORD).length;
      if (headWords < MIN_HALF_WORDS || tailWords < MIN_HALF_WORDS) continue;
      const dist = Math.abs(pos - mid);
      if (dist < bestDist) { bestDist = dist; bestPos = pos; bestLen = matchLen; }
      if (m.index === re.lastIndex) re.lastIndex++;
    }

    if (bestPos === -1) continue;

    const head = s.slice(0, bestPos).trim().replace(/[,;]$/, '');
    let tail = s.slice(bestPos + bestLen).trim();
    if (!tail) continue;
    tail = tail.charAt(0).toUpperCase() + tail.slice(1);
    const rebuilt = head.replace(/[.!?]*$/, '') + '. ' + tail;

    const at = result.indexOf(s);
    if (at === -1) continue;
    result = result.slice(0, at) + rebuilt + result.slice(at + s.length);
    edits.push({ type: 'sentence-split', original: s, replacement: rebuilt, position: at, reason: 'Long sentence split to raise burstiness' });
    done++;
  }

  return result;
}

/** Transitional-phrase swaps that break formulaic paragraph openers and n-grams. */
const TRANSITION_SWAPS: Record<string, string> = {
  'furthermore': 'on top of that',
  'moreover': 'and',
  'additionally': 'also',
  'consequently': 'as a result',
  'nevertheless': 'even so',
  'nonetheless': 'still',
  'however': 'but',
  'therefore': 'so',
  'thus': 'so',
  'hence': 'so',
  'in addition': 'plus',
  'in conclusion': 'in the end',
  'to summarize': 'in short',
  'as a result': 'so',
  'for instance': 'say',
  'for example': 'like',
  'in particular': 'especially',
  'subsequently': 'later',
  'accordingly': 'so',
};

export function swapTransitions(text: string, max: number, edits: RewriteEdit[]): string {
  let result = text;
  let done = 0;
  for (const [from, to] of Object.entries(TRANSITION_SWAPS)) {
    if (done >= max) break;
    const re = new RegExp(`\\b${escapeRegex(from)}\\b`, 'i');
    const m = result.match(re);
    if (!m || m.index === undefined) continue;
    const original = m[0];
    const idx = m.index;
    // Match case of first letter.
    let replacement = to;
    if (original[0] === original[0].toUpperCase()) replacement = to.charAt(0).toUpperCase() + to.slice(1);
    result = result.slice(0, idx) + replacement + result.slice(idx + original.length);
    edits.push({ type: 'transition-swap', original, replacement, position: idx, reason: 'Formulaic transition replaced' });
    done++;
  }
  return result;
}

/**
 * Reorder leading subordinate clauses: "Because X, Y." -> "Y because X."
 * Shifts n-gram windows and sentence openers, breaking template structure.
 */
export function reorderClauses(text: string, max: number, edits: RewriteEdit[]): string {
  const sentences = splitSentences(text);
  let result = text;
  let done = 0;

  const lead = /^(Because|Since|Although|While|When|If|As)\s+([^,]+),\s+(.+)$/;
  for (const s of sentences) {
    if (done >= max) break;
    const m = s.trim().match(lead);
    if (!m) continue;
    const conj = m[1].toLowerCase();
    const sub = m[2].trim();
    let main = m[3].trim();
    const endMatch = main.match(/[.!?]$/);
    const endPunct = endMatch ? endMatch[0] : '.';
    main = main.replace(/[.!?]$/, '');
    main = main.charAt(0).toUpperCase() + main.slice(1);
    const rebuilt = `${main} ${conj} ${sub}${endPunct}`;

    const at = result.indexOf(s);
    if (at === -1) continue;
    result = result.slice(0, at) + rebuilt + result.slice(at + s.length);
    edits.push({ type: 'clause-reorder', original: s, replacement: rebuilt, position: at, reason: 'Leading clause moved to break opener pattern' });
    done++;
  }
  return result;
}
