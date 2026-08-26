export interface SimpleToken {
  text: string;
  id: number;
  offset: number;
}

const WORD_SPLIT = /(\s+|[^\s\w]|\w+)/g;

export function simpleTokenize(text: string): SimpleToken[] {
  const tokens: SimpleToken[] = [];
  let match: RegExpExecArray | null;
  let id = 0;

  WORD_SPLIT.lastIndex = 0;
  while ((match = WORD_SPLIT.exec(text)) !== null) {
    const t = match[0];
    if (t.trim().length > 0) {
      tokens.push({ text: t, id: id++, offset: match.index });
    }
  }

  return tokens;
}

export function wordTokenize(text: string): SimpleToken[] {
  const tokens: SimpleToken[] = [];
  const regex = /\b\w+\b/g;
  let match: RegExpExecArray | null;
  let id = 0;

  while ((match = regex.exec(text)) !== null) {
    tokens.push({ text: match[0].toLowerCase(), id: id++, offset: match.index });
  }

  return tokens;
}
