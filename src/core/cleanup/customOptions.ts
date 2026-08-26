import type { CharClass } from '../scanner/types';

/** The character classes a custom-options file may enable for removal. */
export const ALL_CHAR_CLASSES: CharClass[] = [
  'zero-width', 'bidi-control', 'soft-hyphen', 'variation-selector', 'tag-char',
  'whitespace-anomaly', 'homoglyph', 'stego-pattern', 'bom', 'combining-mark', 'format-char',
];

export interface CustomOptionsFile {
  enabledClasses: CharClass[];
  detectStego?: boolean;
  detectMixedScript?: boolean;
  detectBidiIssues?: boolean;
}

export class CustomOptionsError extends Error {}

/** Parse + validate a user-supplied custom-options JSON string. */
export function parseCustomOptions(json: string): { classes: Set<CharClass>; raw: CustomOptionsFile } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new CustomOptionsError('The file is not valid JSON.');
  }
  if (!data || typeof data !== 'object') throw new CustomOptionsError('Expected a JSON object.');
  const obj = data as Record<string, unknown>;
  const list = obj.enabledClasses;
  if (!Array.isArray(list)) throw new CustomOptionsError('Missing "enabledClasses" array.');

  const valid = new Set<CharClass>();
  const invalid: string[] = [];
  for (const item of list) {
    if (typeof item === 'string' && (ALL_CHAR_CLASSES as string[]).includes(item)) valid.add(item as CharClass);
    else invalid.push(String(item));
  }
  if (valid.size === 0) throw new CustomOptionsError('No valid character classes found in "enabledClasses".');
  if (invalid.length) throw new CustomOptionsError(`Ignored unknown classes: ${invalid.join(', ')}. Loaded ${valid.size} valid.`);

  return {
    classes: valid,
    raw: {
      enabledClasses: [...valid],
      detectStego: obj.detectStego !== false,
      detectMixedScript: obj.detectMixedScript !== false,
      detectBidiIssues: obj.detectBidiIssues !== false,
    },
  };
}

/** A documented template the user can download, edit, and re-load. */
export function customOptionsTemplate(): string {
  return JSON.stringify({
    _comment: 'AI TextSense custom scan/cleanup options. List the character classes to remove in Custom mode.',
    _availableClasses: ALL_CHAR_CLASSES,
    enabledClasses: ['zero-width', 'bom', 'bidi-control', 'tag-char', 'variation-selector'],
    detectStego: true,
    detectMixedScript: true,
    detectBidiIssues: true,
  }, null, 2);
}
