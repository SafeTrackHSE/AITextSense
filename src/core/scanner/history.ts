export interface Snapshot<T = string> {
  id: string;
  text: T;
  timestamp: string;
  label: string;
}

export interface CleanupHistory<T = string> {
  snapshots: Snapshot<T>[];
  currentIndex: number;
}

let counter = 0;

function uid(): string {
  return `snap_${Date.now()}_${++counter}`;
}

export function createHistory<T = string>(initialContent: T): CleanupHistory<T> {
  return {
    snapshots: [{
      id: uid(),
      text: initialContent,
      timestamp: new Date().toISOString(),
      label: 'Original',
    }],
    currentIndex: 0,
  };
}

export function pushSnapshot<T = string>(
  history: CleanupHistory<T>,
  text: T,
  label: string,
): CleanupHistory<T> {
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

export function undo<T = string>(history: CleanupHistory<T>): CleanupHistory<T> {
  if (history.currentIndex <= 0) return history;
  return { ...history, currentIndex: history.currentIndex - 1 };
}

export function redo<T = string>(history: CleanupHistory<T>): CleanupHistory<T> {
  if (history.currentIndex >= history.snapshots.length - 1) return history;
  return { ...history, currentIndex: history.currentIndex + 1 };
}

export function currentText<T = string>(history: CleanupHistory<T>): T {
  return history.snapshots[history.currentIndex].text;
}

export function canUndo<T = string>(history: CleanupHistory<T>): boolean {
  return history.currentIndex > 0;
}

export function canRedo<T = string>(history: CleanupHistory<T>): boolean {
  return history.currentIndex < history.snapshots.length - 1;
}

export function restoreOriginal<T = string>(history: CleanupHistory<T>): CleanupHistory<T> {
  return { ...history, currentIndex: 0 };
}

export function getOriginal<T = string>(history: CleanupHistory<T>): T {
  return history.snapshots[0].text;
}
