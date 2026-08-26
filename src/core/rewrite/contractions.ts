/**
 * Contraction injection — one of the strongest human-writing signals.
 * LLM prose skews formal and expands contractions ("it is", "do not");
 * pulling them back to "it's" / "don't" shifts perplexity toward human baselines.
 */

// Ordered longest-first so multi-word forms match before their prefixes.
const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bit is not\b/gi, "it isn't"],
  [/\bthat is not\b/gi, "that isn't"],
  [/\bthere is not\b/gi, "there isn't"],
  [/\bwho is\b/gi, "who's"],
  [/\bit is\b/gi, "it's"],
  [/\bthat is\b/gi, "that's"],
  [/\bthere is\b/gi, "there's"],
  [/\bhere is\b/gi, "here's"],
  [/\bwhat is\b/gi, "what's"],
  [/\bhe is\b/gi, "he's"],
  [/\bshe is\b/gi, "she's"],
  [/\bit has\b/gi, "it's"],
  [/\bwe are\b/gi, "we're"],
  [/\bthey are\b/gi, "they're"],
  [/\byou are\b/gi, "you're"],
  [/\bwe have\b/gi, "we've"],
  [/\bthey have\b/gi, "they've"],
  [/\byou have\b/gi, "you've"],
  [/\bI have\b/g, "I've"],
  [/\bwe will\b/gi, "we'll"],
  [/\bthey will\b/gi, "they'll"],
  [/\byou will\b/gi, "you'll"],
  [/\bit will\b/gi, "it'll"],
  [/\bwe would\b/gi, "we'd"],
  [/\bthey would\b/gi, "they'd"],
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"],
  [/\bwas not\b/gi, "wasn't"],
  [/\bwere not\b/gi, "weren't"],
  [/\bhas not\b/gi, "hasn't"],
  [/\bhave not\b/gi, "haven't"],
  [/\bhad not\b/gi, "hadn't"],
  [/\bwill not\b/gi, "won't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bcannot\b/gi, "can't"],
  [/\bcan not\b/gi, "can't"],
];

/** Preserve the casing of the first letter of the matched span. */
function matchCase(replacement: string, original: string): string {
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export interface ContractionEdit {
  original: string;
  replacement: string;
  position: number;
}

/**
 * Applies up to `max` contractions. Returns the edited text plus the edits made.
 * Deterministic left-to-right scan so identical input yields identical output.
 */
export function applyContractions(text: string, max: number): { text: string; edits: ContractionEdit[] } {
  const edits: ContractionEdit[] = [];
  let result = text;

  for (const [pattern, base] of CONTRACTIONS) {
    if (edits.length >= max) break;
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(result)) !== null) {
      if (edits.length >= max) break;
      const original = m[0];
      const replacement = matchCase(base, original);
      const idx = m.index;
      result = result.slice(0, idx) + replacement + result.slice(idx + original.length);
      edits.push({ original, replacement, position: idx });
      re.lastIndex = idx + replacement.length;
    }
  }

  return { text: result, edits };
}
