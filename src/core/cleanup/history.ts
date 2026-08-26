import type { CleanupHistory } from './types';

let counter = 0;

function uid(): string {
  return `snap_${Date.now()}_${++counter}`;
}

export function createHistory(originalText: string): CleanupHistory {
  return {
    snapshots: [{
      id: uid(),
      text: originalText,
      timestamp: new Date().toISOString(),
      label: 'Original',
    }],
    currentIndex: 0,
  };
}

export function pushSnapshot(
  history: CleanupHistory,
  text: string,
  label: string,
): CleanupHistory {
  const truncated = history.snapshots.slice(0, history.currentIndex + 1);
  truncated.push({
    id: uid(),
    text,
    timestamp: new Date().toISOString(),
    label,
  });
  return {
    snapshots: truncated,
    currentIndex: truncated.length - 1,
  };
}

export function undo(history: CleanupHistory): CleanupHistory {
  if (history.currentIndex <= 0) return history;
  return { ...history, currentIndex: history.currentIndex - 1 };
}

export function redo(history: CleanupHistory): CleanupHistory {
  if (history.currentIndex >= history.snapshots.length - 1) return history;
  return { ...history, currentIndex: history.currentIndex + 1 };
}

export function currentText(history: CleanupHistory): string {
  return history.snapshots[history.currentIndex].text;
}

export function canUndo(history: CleanupHistory): boolean {
  return history.currentIndex > 0;
}

export function canRedo(history: CleanupHistory): boolean {
  return history.currentIndex < history.snapshots.length - 1;
}

export function restoreOriginal(history: CleanupHistory): CleanupHistory {
  return { ...history, currentIndex: 0 };
}

export function getOriginal(history: CleanupHistory): string {
  return history.snapshots[0].text;
}
