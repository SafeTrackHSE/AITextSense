import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { useStore } from '../store';
import { organizeStructure } from '../core/rewrite/organize';
import { rewriteWithLLM, ORGANIZE_PROMPT } from '../core/llm/client';
import { exportAs, type ExportFormat } from '../core/export/document';
import { useT } from '../i18n';

type EditorMode = 'markdown' | 'rich';

marked.setOptions({ breaks: true });
function mdToHtml(md: string): string {
  return marked.parse(md) as string;
}

export default function CleanedEditor() {
  const { originalText, cleanedText, setCleanedText, appMode, llmConfig } = useStore();
  const t = useT();
  const value = cleanedText ?? originalText ?? '';

  const [mode, setMode] = useState<EditorMode>('markdown');
  const [showPreview, setShowPreview] = useState(true);
  const [organizing, setOrganizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const richRef = useRef<HTMLDivElement>(null);
  const lastMd = useRef<string>(value);

  const td = useMemo(() => new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' }), []);

  // Keep the WYSIWYG surface in sync when the markdown changes from outside
  // (cleanup, neutralize, organize) — but not while the user is typing in it.
  useEffect(() => {
    if (mode === 'rich' && richRef.current && value !== lastMd.current) {
      richRef.current.innerHTML = mdToHtml(value);
      lastMd.current = value;
    }
  }, [mode, value]);

  // On entering rich mode, render current markdown into the editable surface.
  useEffect(() => {
    if (mode === 'rich' && richRef.current) {
      richRef.current.innerHTML = mdToHtml(value);
      lastMd.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const commit = useCallback((md: string) => {
    lastMd.current = md;
    setCleanedText(md);
  }, [setCleanedText]);

  /* ---------- Markdown-mode toolbar ---------- */
  const wrap = useCallback((before: string, after: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.slice(s, e) || 'text';
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    commit(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length); });
  }, [value, commit]);

  const linePrefix = useCallback((make: (i: number) => string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const startLine = value.lastIndexOf('\n', s - 1) + 1;
    const block = value.slice(startLine, e);
    const prefixed = block.split('\n').map((ln, i) => make(i) + ln).join('\n');
    const next = value.slice(0, startLine) + prefixed + value.slice(e);
    commit(next);
    requestAnimationFrame(() => ta.focus());
  }, [value, commit]);

  /* ---------- Rich-mode toolbar ---------- */
  const exec = useCallback((command: string, arg?: string) => {
    richRef.current?.focus();
    document.execCommand(command, false, arg);
    if (richRef.current) commit(td.turndown(richRef.current.innerHTML));
  }, [commit, td]);

  const onRichInput = useCallback(() => {
    if (richRef.current) commit(td.turndown(richRef.current.innerHTML));
  }, [commit, td]);

  /* ---------- toolbar action router ---------- */
  const act = {
    bold: () => mode === 'markdown' ? wrap('**', '**') : exec('bold'),
    italic: () => mode === 'markdown' ? wrap('*', '*') : exec('italic'),
    heading: () => mode === 'markdown' ? linePrefix(() => '## ') : exec('formatBlock', 'H2'),
    bullet: () => mode === 'markdown' ? linePrefix(() => '- ') : exec('insertUnorderedList'),
    numbered: () => mode === 'markdown' ? linePrefix(i => `${i + 1}. `) : exec('insertOrderedList'),
    paragraph: () => mode === 'markdown' ? wrap('\n\n', '') : exec('formatBlock', 'P'),
  };

  /* ---------- Organize (structure-only) ---------- */
  const handleOrganize = useCallback(async () => {
    if (!value.trim()) return;
    const useLLM = appMode === 'online' && llmConfig.provider !== 'local';
    setOrganizing(true);
    try {
      let md: string;
      if (useLLM) {
        const r = await rewriteWithLLM(value, ORGANIZE_PROMPT, llmConfig);
        md = r.text?.trim() || organizeStructure(value);
      } else {
        // Offline & on-device: deterministic structurer guarantees wording is preserved.
        md = organizeStructure(value);
      }
      commit(md);
      if (mode === 'rich' && richRef.current) richRef.current.innerHTML = mdToHtml(md);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Organize failed');
    } finally {
      setOrganizing(false);
    }
  }, [value, appMode, llmConfig, mode, commit]);

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }, [value]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!value.trim()) return;
    setExporting(true);
    setExportOpen(false);
    try {
      await exportAs(format, value);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [value]);

  const EXPORT_FORMATS: Array<[ExportFormat, string]> = [
    ['docx', t('export.docx')],
    ['pdf', t('export.pdf')],
    ['html', t('export.html')],
    ['markdown', t('export.md')],
    ['text', t('export.txt')],
  ];

  const btn = 'px-2 py-1 text-[11px] rounded hover:bg-panel2 dark:hover:bg-panel2-dark text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark transition-colors';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0 flex-wrap">
        <button className={btn} onClick={act.bold} title={t('editor.bold')}><b>B</b></button>
        <button className={btn} onClick={act.italic} title={t('editor.italic')}><i>I</i></button>
        <button className={btn} onClick={act.heading} title={t('editor.heading')}>H</button>
        <button className={btn} onClick={act.bullet} title={t('editor.bullet')}>•</button>
        <button className={btn} onClick={act.numbered} title={t('editor.numbered')}>1.</button>
        <button className={btn} onClick={act.paragraph} title={t('editor.paragraph')}>¶</button>

        <span className="w-px h-4 bg-border dark:bg-border-dark mx-1" />

        {/* Mode toggle */}
        <div className="flex rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark overflow-hidden">
          {(['markdown', 'rich'] as EditorMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2 py-0.5 text-[10px] font-semibold ${mode === m ? 'bg-accent text-white' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
              {t(m === 'markdown' ? 'editor.markdown' : 'editor.rich')}
            </button>
          ))}
        </div>

        {mode === 'markdown' && (
          <button className={btn} onClick={() => setShowPreview(p => !p)} title={t('editor.togglePreview')}>
            {showPreview ? t('editor.hidePreview') : t('editor.preview')}
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleOrganize}
            disabled={organizing || !value.trim()}
            title={t('editor.organizeTitle')}
            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40 transition-colors"
          >
            {organizing ? t('output.organize') + '…' : t('output.organize')}
          </button>
          <div className="relative">
            <button
              onClick={() => setExportOpen(o => !o)}
              disabled={exporting || !value.trim()}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-panel2 dark:bg-panel2-dark text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark disabled:opacity-40 transition-colors"
              title={t('editor.exportTitle')}
            >
              {exporting ? t('output.export') + '…' : t('output.export') + ' ▾'}
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 mt-1 z-20 w-36 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-lg py-1">
                  {EXPORT_FORMATS.map(([fmt, label]) => (
                    <button key={fmt} onClick={() => handleExport(fmt)}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-ink dark:text-ink-dark hover:bg-panel dark:hover:bg-panel-dark">
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={handleCopy} className={`${btn} ${copied ? 'text-success dark:text-emerald-400' : ''}`} title="Copy">
            {copied ? t('output.copied') : t('output.copy')}
          </button>
        </div>
      </div>

      {/* Body */}
      {!value.trim() ? (
        <div className="flex-1 flex items-center justify-center text-xs text-ink-faint dark:text-ink-dark-faint">
          {t('editor.empty')}
        </div>
      ) : mode === 'markdown' ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 divide-x divide-border dark:divide-border-dark">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => commit(e.target.value)}
            spellCheck={false}
            className="w-full h-full resize-none p-3 bg-transparent text-xs font-mono leading-relaxed text-ink dark:text-ink-dark focus:outline-none select-text"
            aria-label="Markdown editor"
          />
          {showPreview && (
            <div className="h-full overflow-auto p-3 rich-content text-xs select-text" dangerouslySetInnerHTML={{ __html: mdToHtml(value) }} />
          )}
        </div>
      ) : (
        <div
          ref={richRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onRichInput}
          spellCheck={false}
          className="flex-1 min-h-0 overflow-auto p-3 rich-content text-xs leading-relaxed text-ink dark:text-ink-dark focus:outline-none select-text"
          aria-label="Rich text editor"
        />
      )}
    </div>
  );
}
