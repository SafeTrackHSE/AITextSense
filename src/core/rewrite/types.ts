export type RewriteMode = 'humanize' | 'deparaphrase' | 'neutralize';
export type RewriteIntensity = 'light' | 'moderate' | 'heavy';

export interface RewriteEdit {
  type: string;
  original: string;
  replacement: string;
  position: number;
  reason: string;
}

export interface RewriteResult {
  mode: RewriteMode;
  engine: 'local' | 'llm' | 'device';
  original: string;
  rewritten: string;
  edits: RewriteEdit[];
  beforeScore: number;
  afterScore: number;
  durationMs: number;
}
