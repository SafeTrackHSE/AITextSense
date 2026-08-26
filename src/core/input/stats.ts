import type { TextStats } from './types';

export function computeTextStats(text: string): TextStats {
  const encoder = new TextEncoder();
  const words = text.trim().length === 0
    ? 0
    : text.trim().split(/\s+/).length;

  const lines = text.split(/\r\n|\r|\n/).length;
  const paragraphs = text.split(/(?:\r\n|\r|\n){2,}/).filter(p => p.trim().length > 0).length || (text.trim().length > 0 ? 1 : 0);

  return {
    chars: Array.from(text).length,
    words,
    paragraphs,
    lines,
    bytes: encoder.encode(text).length,
  };
}
