import { useState, useMemo } from 'react';
import { useStore, type MutationSource } from '../store';
import { useT } from '../i18n';
import { diffWordsWithSpace, type Change } from 'diff';

const COPY_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CHECK_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const UNDO_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
  </svg>
);

const REDO_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

function getSourceBadge(source: MutationSource, t: (k: any) => string) {
  switch (source) {
    case 'scanner-clean':
      return { label: t('diff.source.scanner'), color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    case 'injection-neutralize':
      return { label: t('diff.source.injection'), color: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' };
    case 'watermark-neutralize':
      return { label: t('diff.source.watermark'), color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' };
    case 'footprint-scrub':
      return { label: t('diff.source.footprint'), color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
    case 'roundtrip-regen':
      return { label: t('diff.source.regen'), color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };
    default:
      return { label: t('diff.mutations'), color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
  }
}

export default function DiffView() {
  const { originalText, cleanedText, mutationHistory, mutationRedoStack, undoMutation, redoMutation } = useStore();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [diffMode, setDiffMode] = useState<'split' | 'unified'>('unified');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  const textToCopy = cleanedText ?? originalText;

  const handleCopy = async () => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const wordDiff = useMemo<Change[]>(() => {
    if (!cleanedText || cleanedText === originalText) return [];
    return diffWordsWithSpace(originalText, cleanedText);
  }, [originalText, cleanedText]);

  const latestMutation = mutationHistory.length > 0 ? mutationHistory[mutationHistory.length - 1] : null;

  if (!cleanedText || cleanedText === originalText) {
    return (
      <div className="h-full flex flex-col select-text">
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-ink-faint dark:text-ink-dark-faint">{t('diff.title')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={undoMutation}
              disabled={mutationHistory.length === 0}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-border dark:border-border-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              title={t('diff.undo')}
            >
              {UNDO_ICON}
              <span>{t('diff.undo')}</span>
            </button>
            <button
              onClick={redoMutation}
              disabled={mutationRedoStack.length === 0}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-border dark:border-border-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              title={t('diff.redo')}
            >
              {REDO_ICON}
              <span>{t('diff.redo')}</span>
            </button>
            <button
              id="copy-cleaned-text"
              onClick={handleCopy}
              disabled={!originalText}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded transition-all duration-200 disabled:opacity-40 ${
                copied
                  ? 'bg-success-muted text-success dark:text-emerald-400'
                  : 'btn-ghost text-ink-muted dark:text-ink-dark-muted hover:text-accent'
              }`}
              title={t('diff.copyTitle')}
              aria-label="Copy text"
            >
              {copied ? CHECK_ICON : COPY_ICON}
              <span>{copied ? t('diff.copied') : t('diff.copy')}</span>
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-ink-faint dark:text-ink-dark-faint text-xs">
          <p>{t('diff.empty')}</p>
          <p className="text-[11px] mt-1 opacity-70">{t('diff.emptyHint')}</p>
        </div>
      </div>
    );
  }

  const origChars = Array.from(originalText);
  const cleanChars = Array.from(cleanedText);
  const removed = origChars.length - cleanChars.length;
  const badge = latestMutation ? getSourceBadge(latestMutation.source, t) : null;

  return (
    <div className="flex flex-col h-full select-text">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Latest mutation source badge */}
          {badge && (
            <div className="relative">
              <button
                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${badge.color} hover:opacity-90`}
                title={t('diff.historyTitle')}
              >
                <span>{badge.label}</span>
                <span className="opacity-70">({mutationHistory.length})</span>
              </button>

              {/* History dropdown */}
              {showHistoryDropdown && (
                <div className="absolute left-0 mt-1 z-30 w-64 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-md shadow-xl p-2 text-xs animate-scale-in">
                  <div className="font-semibold text-[10px] uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1.5 px-1 border-b border-border/50 pb-1">
                    {t('diff.mutations')} ({mutationHistory.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {mutationHistory.map((m, idx) => {
                      const b = getSourceBadge(m.source, t);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-1 p-1 rounded bg-panel dark:bg-panel-dark text-[11px]">
                          <span className="truncate text-ink dark:text-ink-dark font-mono">{idx + 1}. {m.label}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded border shrink-0 ${b.color}`}>{b.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Character counts */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-ink-faint dark:text-ink-dark-faint">
            <span>{origChars.length.toLocaleString()} → {cleanChars.length.toLocaleString()} {t('diff.chars')}</span>
            {removed !== 0 && (
              <span className={removed > 0 ? 'text-success dark:text-emerald-400 font-semibold' : 'text-danger dark:text-red-400 font-semibold'}>
                {removed > 0 ? `−${removed}` : `+${Math.abs(removed)}`}
              </span>
            )}
          </div>
        </div>

        {/* Controls: Mode toggle, Undo, Redo, Copy */}
        <div className="flex items-center gap-2">
          {/* Split vs Unified Diff Toggle */}
          <div className="flex bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded p-0.5 text-[10px]">
            <button
              onClick={() => setDiffMode('unified')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                diffMode === 'unified'
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark'
              }`}
            >
              {t('diff.mode.unified')}
            </button>
            <button
              onClick={() => setDiffMode('split')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                diffMode === 'split'
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark'
              }`}
            >
              {t('diff.mode.split')}
            </button>
          </div>

          <div className="h-4 w-px bg-border dark:border-border-dark" />

          {/* Undo / Redo */}
          <button
            id="diff-undo-btn"
            onClick={undoMutation}
            disabled={mutationHistory.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-border dark:border-border-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface dark:hover:bg-surface-dark transition-colors"
            title={t('diff.undo')}
          >
            {UNDO_ICON}
            <span className="hidden sm:inline">{t('diff.undo')}</span>
          </button>
          <button
            id="diff-redo-btn"
            onClick={redoMutation}
            disabled={mutationRedoStack.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-border dark:border-border-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface dark:hover:bg-surface-dark transition-colors"
            title={t('diff.redo')}
          >
            {REDO_ICON}
            <span className="hidden sm:inline">{t('diff.redo')}</span>
          </button>

          <button
            id="copy-cleaned-text"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded transition-all duration-200 ${
              copied
                ? 'bg-success-muted text-success dark:text-emerald-400'
                : 'btn-ghost text-ink-muted dark:text-ink-dark-muted hover:text-accent'
            }`}
            title={t('diff.copyTitle')}
            aria-label="Copy cleaned text"
          >
            {copied ? CHECK_ICON : COPY_ICON}
            <span>{copied ? t('diff.copied') : t('diff.copy')}</span>
          </button>
        </div>
      </div>

      {/* Diff Content View */}
      {diffMode === 'unified' ? (
        <div className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed bg-surface dark:bg-surface-dark">
          <div className="whitespace-pre-wrap break-words">
            {wordDiff.map((part, index) => {
              if (part.added) {
                return (
                  <span
                    key={index}
                    className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold px-0.5 rounded mx-0.5"
                    title="Added or rewritten content"
                  >
                    {part.value}
                  </span>
                );
              }
              if (part.removed) {
                return (
                  <span
                    key={index}
                    className="bg-red-500/20 text-red-800 dark:text-red-300 line-through decoration-red-500/60 font-semibold px-0.5 rounded mx-0.5"
                    title="Removed content"
                  >
                    {part.value}
                  </span>
                );
              }
              return (
                <span key={index} className="text-ink/80 dark:text-ink-dark/80">
                  {part.value}
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        /* Side-by-side diff */
        <div className="flex-1 overflow-auto grid grid-cols-2 divide-x divide-border dark:divide-border-dark text-xs">
          <div className="p-3 min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-faint dark:text-ink-dark-faint mb-2">
              {t('diff.original')}
            </div>
            <div className="font-mono whitespace-pre-wrap break-all leading-relaxed text-ink dark:text-ink-dark opacity-70">
              {originalText}
            </div>
          </div>
          <div className="p-3 min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-success dark:text-emerald-400 mb-2">
              {t('diff.cleaned')}
            </div>
            <div className="font-mono whitespace-pre-wrap break-all leading-relaxed text-ink dark:text-ink-dark">
              {cleanedText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
