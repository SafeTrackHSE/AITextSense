import type { CharFinding } from './types';

export interface StripCharactersOptions {
  findings?: CharFinding[];
  codePointOffsets?: number[] | Set<number>;
  utf16Offsets?: number[] | Set<number>;
}

/**
 * Selectively removes characters by CharFinding[], code-point offsets, or UTF-16 offsets
 * using [...text] code-point indexing without UTF-16 surrogate drift.
 */
export function stripCharacters(
  text: string,
  target: CharFinding[] | StripCharactersOptions | number[] | Set<number>
): string {
  if (!text) return '';

  const codePoints = [...text];
  let offsetsToRemove: Set<number>;

  if (Array.isArray(target)) {
    if (target.length === 0) return text;
    if (typeof target[0] === 'object' && target[0] !== null) {
      // Array of CharFinding
      offsetsToRemove = new Set(
        (target as CharFinding[]).map(f => f.codePointOffset ?? f.charOffset)
      );
    } else {
      // Array of number offsets
      offsetsToRemove = new Set(target as number[]);
    }
  } else if (target instanceof Set) {
    offsetsToRemove = target as Set<number>;
  } else if (typeof target === 'object' && target !== null) {
    const opts = target as StripCharactersOptions;
    if (opts.codePointOffsets) {
      offsetsToRemove = new Set(opts.codePointOffsets);
    } else if (opts.utf16Offsets) {
      const u16Set = new Set(opts.utf16Offsets);
      offsetsToRemove = new Set<number>();
      let u16Pos = 0;
      for (let i = 0; i < codePoints.length; i++) {
        if (u16Set.has(u16Pos)) {
          offsetsToRemove.add(i);
        }
        u16Pos += codePoints[i].length;
      }
    } else if (opts.findings) {
      offsetsToRemove = new Set(
        opts.findings.map(f => f.codePointOffset ?? f.charOffset)
      );
    } else {
      offsetsToRemove = new Set<number>();
    }
  } else {
    offsetsToRemove = new Set<number>();
  }

  if (offsetsToRemove.size === 0) return text;

  return codePoints
    .filter((_, idx) => !offsetsToRemove.has(idx))
    .join('');
}
