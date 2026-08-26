import type { CharClass } from '../scanner/types';

export type CleanupMode = 'report-only' | 'conservative' | 'aggressive' | 'custom';

export interface CleanupOptions {
  mode: CleanupMode;
  customClasses?: Set<CharClass>;
  homoglyphNormalize?: boolean;
}

export interface CharChange {
  offset: number;
  original: string;
  replacement: string;
  codePoint: number;
  reason: string;
}

export interface CleanupResult {
  original: string;
  cleaned: string;
  changes: CharChange[];
  mode: CleanupMode;
  timestamp: string;
}

export interface Snapshot {
  id: string;
  text: string;
  timestamp: string;
  label: string;
}

export interface CleanupHistory {
  snapshots: Snapshot[];
  currentIndex: number;
}
