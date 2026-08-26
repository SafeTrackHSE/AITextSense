/**
 * Deterministic, wording-preserving structurer. Turns a wall of cleaned text
 * into readable Markdown — paragraph breaks and (where the text clearly
 * enumerates) a numbered list — WITHOUT changing any words. Used as the
 * offline / on-device "Organize" action so the footprint cleaning is never undone.
 */

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [text]).map(s => s.trim()).filter(Boolean);
}

const ENUM_LEAD = /^(first(ly)?|second(ly)?|third(ly)?|fourth(ly)?|fifth(ly)?|next|then|finally|lastly|additionally|moreover|furthermore)\b[,:]?\s+/i;

export function organizeStructure(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Respect existing blank-line paragraphs if the author already made them.
  if (/\n\s*\n/.test(trimmed)) {
    return trimmed.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).join('\n\n');
  }

  const sentences = splitSentences(trimmed);
  if (sentences.length <= 2) return trimmed;

  // If at least three sentences start with sequential discourse markers,
  // present the whole thing as a numbered list (wording untouched).
  const leadCount = sentences.filter(s => ENUM_LEAD.test(s)).length;
  if (leadCount >= 3) {
    return sentences.map(s => `1. ${s}`).join('\n');
  }

  // Otherwise group ~3 sentences per paragraph for readability.
  const perPara = 3;
  const paras: string[] = [];
  for (let i = 0; i < sentences.length; i += perPara) {
    paras.push(sentences.slice(i, i + perPara).join(' '));
  }
  return paras.join('\n\n');
}
