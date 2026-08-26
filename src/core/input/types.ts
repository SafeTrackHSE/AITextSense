export interface ParsedInput {
  text: string;
  source: 'paste' | 'file';
  filename?: string;
  fileType?: string;
  stats: TextStats;
  language: DetectedLanguage;
}

export interface TextStats {
  chars: number;
  words: number;
  paragraphs: number;
  lines: number;
  bytes: number;
}

export interface DetectedLanguage {
  code: string;
  name: string;
  confidence: number;
}

export type SupportedFileType = 'txt' | 'md' | 'docx' | 'pdf';

export const SUPPORTED_EXTENSIONS: Record<string, SupportedFileType> = {
  '.txt': 'txt',
  '.text': 'txt',
  '.md': 'md',
  '.markdown': 'md',
  '.docx': 'docx',
  '.pdf': 'pdf',
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_CHARS = 1_000_000;
