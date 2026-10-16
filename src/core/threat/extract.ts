import type { ThreatVector } from './types';
import { MAX_CHARS } from '../input';

export interface ExtractedSpan {
  text: string;
  start: number;
  end: number;
  vector: ThreatVector;
}

/** Caps total spans considered, bounding cost on an adversarially large or repetitive paste. */
const MAX_SPANS = 500;

const FENCED_BLOCK_RE = /```[\w-]*\n([\s\S]*?)```|~~~[\w-]*\n([\s\S]*?)~~~/g;
const INLINE_CODE_RE = /`([^`\n]{4,})`/g;

/**
 * Known command/binary names. Deliberately does NOT include bare punctuation
 * (`#`, `>`) as a signal on its own — those are common markdown heading/blockquote
 * characters and would false-positive constantly on ordinary prose. A bare line
 * only qualifies when it matches this list AND shell-syntax shape (see below).
 */
const KNOWN_COMMANDS = /\b(curl|wget|bash|sh|zsh|powershell|pwsh|cmd(?:\.exe)?|certutil|rm|del|rmdir|format|iwr|iex|nc|ncat|netcat|python[23]?|perl|ruby|node|eval|child_process|os\.system|subprocess|Invoke-Expression|Invoke-WebRequest|reg\s+add|schtasks|crontab|chmod\s+\+x|mkfifo|base64\s+-d|certutil\s+-decode)\b/i;
const SHELL_SYNTAX_RE = /(\|\s*\S|&&|;\s*\S|>{1,2}\s*\S|<{1,2}\s*\S|\$\(|--?\w[\w-]*(?:=|\s))/;

function extractFencedBlocks(text: string): ExtractedSpan[] {
  const spans: ExtractedSpan[] = [];
  const re = new RegExp(FENCED_BLOCK_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1] ?? m[2] ?? '';
    if (!inner.trim()) continue;
    const innerStart = m.index + m[0].indexOf(inner);
    spans.push({ text: inner, start: innerStart, end: innerStart + inner.length, vector: 'fenced-code-block' });
  }
  return spans;
}

function extractInlineCode(text: string): ExtractedSpan[] {
  const spans: ExtractedSpan[] = [];
  const re = new RegExp(INLINE_CODE_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1];
    const innerStart = m.index + 1;
    spans.push({ text: inner, start: innerStart, end: innerStart + inner.length, vector: 'inline-code-span' });
  }
  return spans;
}

function extractBareCommandLines(text: string): ExtractedSpan[] {
  const spans: ExtractedSpan[] = [];
  const lines = text.split('\n');
  let offset = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Require BOTH a known command/binary name AND shell-syntax shape — punctuation
    // alone (markdown headings `#`, blockquotes `>`) never qualifies on its own.
    if (trimmed.length >= 4 && KNOWN_COMMANDS.test(trimmed) && SHELL_SYNTAX_RE.test(trimmed)) {
      const relStart = line.indexOf(trimmed);
      const start = offset + relStart;
      spans.push({ text: trimmed, start, end: start + trimmed.length, vector: 'bare-command-line' });
    }
    offset += line.length + 1; // +1 for the split '\n'
  }
  return spans;
}

/** Long alnum/symbol runs — candidate encoded blobs for decode.ts to try. Validity is decode.ts's job, not extraction's. */
const CANDIDATE_BLOB_RE = /[A-Za-z0-9+/_=%-]{20,}/g;

function extractCandidateBlobs(text: string): ExtractedSpan[] {
  const spans: ExtractedSpan[] = [];
  const re = new RegExp(CANDIDATE_BLOB_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    spans.push({ text: m[0], start: m.index, end: m.index + m[0].length, vector: 'encoded-blob' });
  }
  return spans;
}

/**
 * Pulls every candidate code/command/encoded-blob span out of raw text,
 * regardless of surrounding prose, with source offsets preserved for
 * highlighting. Runs unconditionally — no precondition on anything else
 * having been found first.
 */
export function extractCandidateSpans(text: string): ExtractedSpan[] {
  const bounded = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  const spans: ExtractedSpan[] = [
    ...extractFencedBlocks(bounded),
    ...extractInlineCode(bounded),
    ...extractBareCommandLines(bounded),
    ...extractCandidateBlobs(bounded),
  ];

  return spans.length > MAX_SPANS ? spans.slice(0, MAX_SPANS) : spans;
}
