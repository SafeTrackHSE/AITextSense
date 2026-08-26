import type { SupportedFileType } from './types';
import { MAX_FILE_SIZE, MAX_CHARS } from './types';

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export async function parseFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ParseError(
      `File exceeds ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`
    );
  }

  const ext = getExtension(file.name);
  const type = getFileType(ext);

  if (!type) {
    throw new ParseError(
      `Unsupported file type: ${ext || 'unknown'}. Supported: .txt, .md, .docx, .pdf`
    );
  }

  switch (type) {
    case 'txt':
    case 'md':
      return parseText(file);
    case 'docx':
      return parseDocx(file);
    case 'pdf':
      return parsePdf(file);
  }
}

async function parseText(file: File): Promise<string> {
  const text = await file.text();
  validateLength(text);
  return text;
}

async function parseDocx(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    validateLength(result.value);
    return result.value;
  } catch (e) {
    if (e instanceof ParseError) throw e;
    throw new ParseError(`Failed to parse DOCX: ${e instanceof Error ? e.message : 'unknown error'}`);
  }
}

async function parsePdf(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .filter((item: Record<string, unknown>) => 'str' in item)
        .map((item: Record<string, unknown>) => item.str as string)
        .join(' ');
      pages.push(text);
    }

    const fullText = pages.join('\n\n');
    validateLength(fullText);
    return fullText;
  } catch (e) {
    if (e instanceof ParseError) throw e;
    throw new ParseError(`Failed to parse PDF: ${e instanceof Error ? e.message : 'unknown error'}`);
  }
}

function validateLength(text: string): void {
  const len = Array.from(text).length;
  if (len > MAX_CHARS) {
    throw new ParseError(
      `Text exceeds ${(MAX_CHARS / 1000).toFixed(0)}k character limit (${(len / 1000).toFixed(0)}k chars)`
    );
  }
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

function getFileType(ext: string): SupportedFileType | null {
  const map: Record<string, SupportedFileType> = {
    '.txt': 'txt', '.text': 'txt',
    '.md': 'md', '.markdown': 'md',
    '.docx': 'docx',
    '.pdf': 'pdf',
  };
  return map[ext] ?? null;
}
