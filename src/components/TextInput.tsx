import { useCallback, useRef } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { parseFile } from '../core/input/parsers';
import { computeTextStats } from '../core/input/stats';
import { detectLanguage } from '../core/input/language';

const UPLOAD_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

const CLEAR_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

interface TextInputProps {
  onCollapse?: () => void;
}

export default function TextInput({ onCollapse }: TextInputProps) {
  const { originalText, setOriginalText, setTextStats, setLanguage, textStats, language } = useStore();
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleTextChange = useCallback(async (text: string) => {
    setOriginalText(text);
    if (text.length > 0) {
      setTextStats(computeTextStats(text));
      const lang = await detectLanguage(text);
      setLanguage(lang);
    }
  }, [setOriginalText, setTextStats, setLanguage]);

  const handleClearInput = useCallback(() => {
    setOriginalText('');
    setTextStats(computeTextStats(''));
    setLanguage({ code: 'und', name: '', confidence: 0 });
  }, [setOriginalText, setTextStats, setLanguage]);

  const handleFile = useCallback(async (file: File) => {
    try {
      const text = await parseFile(file);
      handleTextChange(text);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to parse file');
    }
  }, [handleTextChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove('ring-2', 'ring-accent');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.add('ring-2', 'ring-accent');
  }, []);

  const handleDragLeave = useCallback(() => {
    dropRef.current?.classList.remove('ring-2', 'ring-accent');
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface dark:bg-surface-dark">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
        <div className="flex items-center gap-1.5">
          {onCollapse && (
            <button
              onClick={onCollapse}
              title={t('input.collapseTitle')}
              aria-label={t('input.collapseTitle')}
              className="px-1 text-ink-muted dark:text-ink-dark-muted hover:text-accent transition-colors"
            >
              ▴
            </button>
          )}
          <span className="text-[10px] font-semibold tracking-widest uppercase text-ink-muted dark:text-ink-dark-muted">{t('input.title')}</span>
        </div>
        <div className="flex items-center gap-3">
          {textStats && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-ink-faint dark:text-ink-dark-faint">
              <span>{textStats.chars.toLocaleString()} ch</span>
              <span className="text-border dark:text-border-dark">·</span>
              <span>{textStats.words.toLocaleString()} w</span>
              <span className="text-border dark:text-border-dark">·</span>
              <span>{textStats.paragraphs} ¶</span>
            </div>
          )}
          {language && language.code !== 'und' && (
            <span className="badge badge-neutral">{language.name}</span>
          )}
          <button
            id="upload-file"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 btn-ghost text-ink-muted dark:text-ink-dark-muted"
            title={t('input.uploadTitle')}
          >
            {UPLOAD_ICON}
            <span className="text-[10px] font-medium tracking-wide">{t('input.upload')}</span>
          </button>
          <button
            id="clear-input"
            onClick={handleClearInput}
            disabled={!originalText}
            className="flex items-center gap-1.5 px-2.5 py-1 btn-ghost text-ink-muted dark:text-ink-dark-muted hover:text-danger disabled:opacity-40"
            title={t('input.clearTitle')}
          >
            {CLEAR_ICON}
            <span className="text-[10px] font-medium tracking-wide">{t('input.clear')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.docx,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      </div>

      {/* Drop zone + textarea */}
      <div
        ref={dropRef}
        className="flex-1 transition-all ring-inset"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <textarea
          value={originalText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={t('input.placeholder')}
          className="w-full h-full p-4 bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed
                     text-ink dark:text-ink-dark placeholder:text-ink-faint dark:placeholder:text-ink-dark-faint
                     selection:bg-accent/20"
          spellCheck={false}
          aria-label="Text input area"
        />
      </div>
    </div>
  );
}
