import { useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';

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

export default function DiffView() {
  const { originalText, cleanedText } = useStore();
  const t = useT();
  const [copied, setCopied] = useState(false);

  const textToCopy = cleanedText ?? originalText;

  const handleCopy = async () => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without Clipboard API
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

  if (!cleanedText || cleanedText === originalText) {
    return (
      <div className="h-full flex flex-col">
        {/* Copy bar — always visible, copies original if no cleaned text */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-ink-faint dark:text-ink-dark-faint">{t('diff.title')}</span>
          <button
            id="copy-cleaned-text"
            onClick={handleCopy}
            disabled={!originalText}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded transition-all duration-200 disabled:opacity-40 ${
              copied
                ? 'bg-success-muted text-success dark:text-emerald-400'
                : 'btn-ghost text-ink-muted dark:text-ink-dark-muted hover:text-accent'
            }`}
            title="Copy cleaned text to clipboard"
            aria-label="Copy cleaned text"
          >
            {copied ? CHECK_ICON : COPY_ICON}
            <span>{copied ? t('diff.copied') : t('diff.copy')}</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-ink-faint dark:text-ink-dark-faint text-xs">
          {t('diff.empty')}
        </div>
      </div>
    );
  }

  const origChars = Array.from(originalText);
  const cleanChars = Array.from(cleanedText);
  const removed = origChars.length - cleanChars.length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
        <div className="flex items-center gap-3 text-[10px] font-mono text-ink-faint dark:text-ink-dark-faint">
          <span>{origChars.length.toLocaleString()} → {cleanChars.length.toLocaleString()} {t('diff.chars')}</span>
          {removed !== 0 && (
            <span className={removed > 0 ? 'text-success dark:text-emerald-400' : 'text-danger dark:text-red-400'}>
              {removed > 0 ? `−${removed}` : `+${Math.abs(removed)}`} chars
            </span>
          )}
        </div>

        <button
          id="copy-cleaned-text"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded transition-all duration-200 ${
            copied
              ? 'bg-success-muted text-success dark:text-emerald-400'
              : 'btn-ghost text-ink-muted dark:text-ink-dark-muted hover:text-accent'
          }`}
          title="Copy cleaned text to clipboard"
          aria-label="Copy cleaned text"
        >
          {copied ? CHECK_ICON : COPY_ICON}
          <span>{copied ? t('diff.copied') : t('diff.copy')}</span>
        </button>
      </div>

      {/* Side-by-side diff */}
      <div className="flex-1 overflow-auto grid grid-cols-2 divide-x divide-border dark:divide-border-dark text-xs">
        <div className="p-3 min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-faint dark:text-ink-dark-faint mb-2">{t('diff.original')}</div>
          <div className="font-mono whitespace-pre-wrap break-all leading-relaxed text-ink dark:text-ink-dark opacity-70">
            {originalText}
          </div>
        </div>
        <div className="p-3 min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-success dark:text-emerald-400 mb-2">{t('diff.cleaned')}</div>
          <div className="font-mono whitespace-pre-wrap break-all leading-relaxed text-ink dark:text-ink-dark">
            {cleanedText}
          </div>
        </div>
      </div>
    </div>
  );
}
