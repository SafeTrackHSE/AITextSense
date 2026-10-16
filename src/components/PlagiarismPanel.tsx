import { useState, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { parseFile } from '../core/input/parsers';
import {
  analyzePlagiarism,
  type ReferenceDocument,
  type PlagiarismAnalysisResult,
} from '../core/plagiarism';

export default function PlagiarismPanel() {
  const { originalText, cleanedText, appMode } = useStore();

  const storeReferences = useStore((s: any) => s.referenceDocuments);
  const addRefDoc = useStore((s: any) => s.addReferenceDocument);
  const removeRefDoc = useStore((s: any) => s.removeReferenceDocument);
  const clearRefDocs = useStore((s: any) => s.clearReferenceDocuments);

  const storePlagiarismResult = useStore((s: any) => s.plagiarismResult);
  const setStorePlagiarismResult = useStore((s: any) => s.setPlagiarismResult);
  const isAnalyzingPlagiarism = useStore((s: any) => s.isAnalyzingPlagiarism);
  const setIsAnalyzingPlagiarism = useStore((s: any) => s.setIsAnalyzingPlagiarism);

  // Local state fallbacks if store actions are pending
  const [localReferences, setLocalReferences] = useState<ReferenceDocument[]>([]);
  const [localResult, setLocalResult] = useState<PlagiarismAnalysisResult | null>(null);
  const [localAnalyzing, setLocalAnalyzing] = useState(false);

  const references: ReferenceDocument[] = storeReferences ?? localReferences;
  const result: PlagiarismAnalysisResult | null = storePlagiarismResult ?? localResult;
  const isRunning = Boolean(isAnalyzingPlagiarism || localAnalyzing);

  // Mode tab selection
  const [activeTab, setActiveTab] = useState<'shingle' | 'semantic' | 'intrinsic' | 'online'>('shingle');

  // Options
  const [useNeuralEmbeddings, setUseNeuralEmbeddings] = useState(false);
  const [enableOnline, setEnableOnline] = useState(appMode === 'online');

  // Paste Reference modal/drawer
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedName, setPastedName] = useState('');
  const [pastedText, setPastedText] = useState('');

  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const text = cleanedText ?? originalText;

  // Add reference helper
  const handleAddDocument = useCallback((doc: ReferenceDocument) => {
    if (typeof addRefDoc === 'function') {
      addRefDoc(doc);
    } else {
      setLocalReferences(prev => [...prev, doc]);
    }
  }, [addRefDoc]);

  // Remove reference helper
  const handleRemoveDocument = useCallback((id: string) => {
    if (typeof removeRefDoc === 'function') {
      removeRefDoc(id);
    } else {
      setLocalReferences(prev => prev.filter(r => r.id !== id));
    }
  }, [removeRefDoc]);

  // Clear references helper
  const handleClearDocuments = useCallback(() => {
    if (typeof clearRefDocs === 'function') {
      clearRefDocs();
    } else {
      setLocalReferences([]);
    }
  }, [clearRefDocs]);

  // File upload handler
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let content = '';
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'html' || ext === 'htm' || ext === 'json') {
          content = await file.text();
        } else {
          content = await parseFile(file);
        }

        const trimmed = content.trim();
        if (trimmed) {
          const doc: ReferenceDocument = {
            id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            text: trimmed,
            sourceType: 'file',
            charCount: trimmed.length,
            wordCount: trimmed.split(/\s+/).filter(w => w.length > 0).length,
          };
          handleAddDocument(doc);
        }
      } catch (err) {
        setUploadError(`Failed to load ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [handleAddDocument]);

  // Submit pasted reference text
  const handlePasteSubmit = useCallback(() => {
    const trimmed = pastedText.trim();
    if (!trimmed) return;
    const name = pastedName.trim() || `Pasted Reference (${new Date().toLocaleTimeString()})`;
    const doc: ReferenceDocument = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      text: trimmed,
      sourceType: 'pasted',
      charCount: trimmed.length,
      wordCount: trimmed.split(/\s+/).filter(w => w.length > 0).length,
    };
    handleAddDocument(doc);
    setPastedName('');
    setPastedText('');
    setShowPasteModal(false);
  }, [pastedName, pastedText, handleAddDocument]);

  // Run analysis
  const handleAnalyze = useCallback(async () => {
    if (!text || text.trim().length === 0) return;

    if (typeof setIsAnalyzingPlagiarism === 'function') {
      setIsAnalyzingPlagiarism(true);
    }
    setLocalAnalyzing(true);

    try {
      const res = await analyzePlagiarism(text, references, {
        enableSemantic: true,
        useNeuralEmbeddings,
        enableIntrinsic: true,
        enableOnline: enableOnline && appMode === 'online',
        offlineMode: appMode === 'offline',
      });

      if (typeof setStorePlagiarismResult === 'function') {
        setStorePlagiarismResult(res);
      }
      setLocalResult(res);
    } finally {
      if (typeof setIsAnalyzingPlagiarism === 'function') {
        setIsAnalyzingPlagiarism(false);
      }
      setLocalAnalyzing(false);
    }
  }, [text, references, useNeuralEmbeddings, enableOnline, appMode, setIsAnalyzingPlagiarism, setStorePlagiarismResult]);

  // Gauge colors
  const originalityScore = result ? result.originalityScore : 100;
  const gaugeColor =
    originalityScore >= 80 ? '#10B981' : originalityScore >= 50 ? '#F59E0B' : '#EF4444';

  const circumference = 2 * Math.PI * 40; // r=40
  const strokeDashoffset = circumference - (originalityScore / 100) * circumference;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Top Toolbar */}
      <div className="panel-bar">
        <button
          onClick={handleAnalyze}
          disabled={!text || isRunning}
          className="btn-primary"
        >
          {isRunning ? 'Analyzing Plagiarism...' : '§ Analyze Originality & Plagiarism'}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-ghost"
          title="Upload reference files (TXT, MD, DOCX, PDF, HTML, JSON)"
        >
          📁 Add Reference Files
        </button>

        <button
          onClick={() => setShowPasteModal(true)}
          className="btn-ghost"
          title="Paste reference text directly"
        >
          📋 Paste Reference
        </button>

        {references.length > 0 && (
          <button
            onClick={handleClearDocuments}
            className="btn-ghost text-ink-muted hover:text-danger ml-auto text-xs"
            title="Remove all reference documents"
          >
            Clear References ({references.length})
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.docx,.pdf,.html,.htm,.json"
          className="hidden"
          onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }}
        />
      </div>

      {uploadError && (
        <div className="px-4 py-2 bg-danger/10 border-b border-danger/20 text-xs text-danger dark:text-red-400 flex items-center justify-between">
          <span>⚠ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-ink-muted hover:text-ink">✕</button>
        </div>
      )}

      {/* Paste Reference Drawer / Form */}
      {showPasteModal && (
        <div className="p-4 border-b border-border dark:border-border-dark bg-panel/70 dark:bg-panel-dark/70 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold">
            <span>Paste Reference Document Text</span>
            <button onClick={() => setShowPasteModal(false)} className="text-ink-muted hover:text-ink">✕</button>
          </div>
          <input
            type="text"
            placeholder="Document Title (e.g. 'Source Article 2026')"
            value={pastedName}
            onChange={e => setPastedName(e.target.value)}
            className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded px-2.5 py-1.5 text-xs text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <textarea
            rows={4}
            placeholder="Paste reference text content here..."
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded p-2.5 text-xs text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowPasteModal(false)} className="btn-ghost">Cancel</button>
            <button onClick={handlePasteSubmit} disabled={!pastedText.trim()} className="btn-primary">
              Add Reference
            </button>
          </div>
        </div>
      )}

      {/* Settings / Mode Option Toggles */}
      <div className="px-4 py-2 border-b border-border dark:border-border-dark bg-panel/30 dark:bg-panel-dark/30 flex items-center gap-4 flex-wrap text-[11px]">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={useNeuralEmbeddings}
            onChange={e => setUseNeuralEmbeddings(e.target.checked)}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>Neural Embeddings (all-MiniLM-L6-v2)</span>
        </label>

        <label className={`flex items-center gap-1.5 cursor-pointer ${appMode === 'offline' ? 'opacity-40 cursor-not-allowed' : ''}`}>
          <input
            type="checkbox"
            disabled={appMode === 'offline'}
            checked={enableOnline && appMode === 'online'}
            onChange={e => setEnableOnline(e.target.checked)}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>Web & Academic Verification (CrossRef & Wikipedia)</span>
        </label>
        {appMode === 'offline' && (
          <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
            [Offline Mode Active]
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Reference Document Vault Row */}
        <div className="p-3.5 rounded-xl border border-border dark:border-border-dark bg-panel/50 dark:bg-panel-dark/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted text-[10px]">
              <span>📚 Reference Document Vault</span>
              <span className="badge-neutral font-mono">{references.length}</span>
            </div>
            {references.length === 0 && (
              <span className="text-[11px] text-ink-muted dark:text-ink-dark-muted">
                Zero reference documents loaded. (Mode 3 Intrinsic will still analyze self-plagiarism)
              </span>
            )}
          </div>

          {references.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
              {references.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/80 dark:border-border-dark/80 bg-surface dark:bg-surface-dark shrink-0 text-xs shadow-sm"
                >
                  <span className="text-ink-muted">📄</span>
                  <div className="min-w-0 max-w-[150px]">
                    <div className="truncate font-semibold text-ink dark:text-ink-dark" title={doc.name}>
                      {doc.name}
                    </div>
                    <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted">
                      {doc.wordCount ?? 0} words
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDocument(doc.id)}
                    title="Remove reference"
                    className="text-ink-muted hover:text-danger ml-1 p-0.5 rounded text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results Header (SVG Radial Gauge + Stat Cards) */}
        {result && (
          <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-4">
            <div className="flex items-center gap-6 flex-wrap">
              {/* SVG Radial Gauge */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-border dark:text-border-dark opacity-30"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={gaugeColor}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black tabular-nums text-ink dark:text-ink-dark">
                    {result.originalityScore}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-ink-muted dark:text-ink-dark-muted">
                    Originality
                  </span>
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 min-w-[200px]">
                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    Plagiarism Score
                  </div>
                  <div className={`text-base font-bold tabular-nums ${result.plagiarismScore > 20 ? 'text-danger' : 'text-success'}`}>
                    {result.plagiarismScore}%
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    Max Match Coverage
                  </div>
                  <div className="text-base font-bold tabular-nums text-ink dark:text-ink-dark">
                    {result.summary.highestMatchPercent}%
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    Top Source
                  </div>
                  <div className="text-xs font-semibold text-ink dark:text-ink-dark truncate" title={result.summary.highestMatchSource ?? 'None'}>
                    {result.summary.highestMatchSource ?? 'None'}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    Exact Matches
                  </div>
                  <div className="text-base font-bold tabular-nums text-ink dark:text-ink-dark">
                    {result.shingleMatches.length}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    Paraphrases
                  </div>
                  <div className="text-base font-bold tabular-nums text-ink dark:text-ink-dark">
                    {result.summary.paraphraseCount}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    Intrinsic Shifts
                  </div>
                  <div className="text-base font-bold tabular-nums text-ink dark:text-ink-dark">
                    {result.summary.styleShiftCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Segmented Mode Tabs */}
            <div className="flex border-b border-border dark:border-border-dark gap-1 text-xs">
              <button
                onClick={() => setActiveTab('shingle')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'shingle'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                <span>Exact & Near-Copy Matches</span>
                <span className="badge-neutral font-mono text-[9px]">{result.shingleMatches.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('semantic')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'semantic'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                <span>Semantic Paraphrases</span>
                <span className="badge-neutral font-mono text-[9px]">{result.semanticMatches.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('intrinsic')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'intrinsic'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                <span>Intrinsic Style-Shift & Self-Plagiarism</span>
                <span className="badge-neutral font-mono text-[9px]">
                  {result.intrinsicAnomalies.length + result.internalDuplicates.length + result.orphanCitations.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('online')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'online'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                <span>Online Web & Academic Verification</span>
                <span className="badge-neutral font-mono text-[9px]">{result.onlineHits.length}</span>
              </button>
            </div>

            {/* Tab 1: Exact Shingle Matches */}
            {activeTab === 'shingle' && (
              <div className="space-y-3 pt-1">
                {result.shingleMatches.length === 0 ? (
                  <div className="p-4 text-center text-xs text-success dark:text-emerald-400 bg-success-muted rounded-lg">
                    ✓ No verbatim or near-copy text matches detected against reference documents.
                  </div>
                ) : (
                  result.shingleMatches.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-danger/30 bg-surface dark:bg-surface-dark space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="badge-danger font-mono text-[10px]">
                            {Math.round(m.similarity * 100)}% Match
                          </span>
                          <span className="font-semibold text-ink dark:text-ink-dark">
                            Source: {m.referenceName}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
                          Shingle: {m.shingleSize}-gram
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded bg-danger/5 dark:bg-danger/10 border border-danger/20 space-y-1">
                          <span className="font-semibold text-danger dark:text-red-300 block">Your Document:</span>
                          <p className="font-mono text-ink dark:text-ink-dark break-words">{m.sourceText}</p>
                        </div>
                        <div className="p-2 rounded bg-panel dark:bg-panel-dark border border-border/60 dark:border-border-dark/60 space-y-1">
                          <span className="font-semibold text-ink-muted dark:text-ink-dark-muted block">Reference Match:</span>
                          <p className="font-mono text-ink dark:text-ink-dark break-words">{m.referenceText}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Semantic Paraphrases */}
            {activeTab === 'semantic' && (
              <div className="space-y-3 pt-1">
                {result.semanticMatches.length === 0 ? (
                  <div className="p-4 text-center text-xs text-success dark:text-emerald-400 bg-success-muted rounded-lg">
                    ✓ No semantic paraphrases or rewritten passages detected against reference documents.
                  </div>
                ) : (
                  result.semanticMatches.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-warning/30 bg-surface dark:bg-surface-dark space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="badge-warning font-mono text-[10px]">
                            Cosine: {(m.similarity * 100).toFixed(0)}%
                          </span>
                          <span className="badge-neutral font-mono text-[10px]">
                            {m.method === 'embedding-neural' ? 'all-MiniLM-L6-v2' : 'TF-IDF Pre-Filter'}
                          </span>
                          <span className="font-semibold text-ink dark:text-ink-dark">
                            Source: {m.referenceName}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
                          Lexical Jaccard: {(m.jaccard * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded bg-warning/5 dark:bg-warning/10 border border-warning/20 space-y-1">
                          <span className="font-semibold text-warning dark:text-yellow-400 block">Your Document Sentence:</span>
                          <p className="text-ink dark:text-ink-dark leading-relaxed">{m.sourceSentence}</p>
                        </div>
                        <div className="p-2 rounded bg-panel dark:bg-panel-dark border border-border/60 dark:border-border-dark/60 space-y-1">
                          <span className="font-semibold text-ink-muted dark:text-ink-dark-muted block">Reference Sentence:</span>
                          <p className="text-ink dark:text-ink-dark leading-relaxed">{m.referenceSentence}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Intrinsic Style-Shift & Self-Plagiarism */}
            {activeTab === 'intrinsic' && (
              <div className="space-y-4 pt-1">
                {/* 3a: Patchwriting / Style shifts */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted flex items-center gap-2">
                    <span>Mosaic Patchwriting & Style Shifts (|z| &gt; 2.0)</span>
                    <span className="badge-neutral font-mono">{result.intrinsicAnomalies.length}</span>
                  </h4>
                  {result.intrinsicAnomalies.length === 0 ? (
                    <div className="p-3 text-xs text-success dark:text-emerald-400 bg-success-muted rounded-lg">
                      ✓ Uniform stylistic voice maintained across all paragraphs (no severe style anomalies).
                    </div>
                  ) : (
                    result.intrinsicAnomalies.map((anom, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg border border-warning/30 bg-surface dark:bg-surface-dark space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-warning dark:text-yellow-400">
                            Paragraph #{anom.paragraphIndex + 1} (z = {anom.zScore.toFixed(2)})
                          </span>
                          <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
                            FK Grade: {anom.metrics.fleschKincaidGrade.toFixed(1)}
                          </span>
                        </div>
                        <p className="p-2 rounded bg-panel dark:bg-panel-dark text-[11px] text-ink dark:text-ink-dark italic leading-relaxed">
                          "{anom.text.slice(0, 240)}{anom.text.length > 240 ? '...' : ''}"
                        </p>
                        <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted">
                          <span className="font-semibold text-ink dark:text-ink-dark">Deviating features: </span>
                          {anom.deviatingFeatures.join(', ')}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 3b: Internal Duplications */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted flex items-center gap-2">
                    <span>Internal Self-Plagiarism & Duplications</span>
                    <span className="badge-neutral font-mono">{result.internalDuplicates.length}</span>
                  </h4>
                  {result.internalDuplicates.length === 0 ? (
                    <div className="p-3 text-xs text-success dark:text-emerald-400 bg-success-muted rounded-lg">
                      ✓ No duplicated passages or self-plagiarized paragraphs within the document.
                    </div>
                  ) : (
                    result.internalDuplicates.map((dup, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-1 text-xs"
                      >
                        <div className="font-semibold text-ink dark:text-ink-dark">
                          Repeated text snippet (@{dup.firstStart} and @{dup.secondStart}):
                        </div>
                        <p className="p-2 rounded bg-surface dark:bg-surface-dark text-[11px] font-mono text-ink-muted">
                          "{dup.firstText.slice(0, 180)}"
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* 3c: Orphan Citations */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted flex items-center gap-2">
                    <span>Orphan Citations (Missing in References)</span>
                    <span className="badge-neutral font-mono">{result.orphanCitations.length}</span>
                  </h4>
                  {result.orphanCitations.length === 0 ? (
                    <div className="p-3 text-xs text-success dark:text-emerald-400 bg-success-muted rounded-lg">
                      ✓ No orphan citations without bibliography references detected.
                    </div>
                  ) : (
                    result.orphanCitations.map((cit, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-warning/20 bg-warning/5 dark:bg-warning/10 space-y-1 text-xs"
                      >
                        <div className="flex items-center gap-2 font-bold text-warning dark:text-yellow-400">
                          <span>Marker: {cit.marker}</span>
                          <span className="text-[10px] text-ink-muted font-normal font-mono">@{cit.offset}</span>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          Context: "...{cit.surroundingContext}..."
                        </p>
                        <p className="text-[10px] text-danger dark:text-red-300">
                          {cit.reason}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Online Web & Academic Verification */}
            {activeTab === 'online' && (
              <div className="space-y-3 pt-1">
                {appMode === 'offline' ? (
                  <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark text-center space-y-2">
                    <span className="text-xl">🔒</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      Offline Mode Active
                    </h4>
                    <p className="text-xs text-ink-muted dark:text-ink-dark-muted max-w-md mx-auto">
                      Online queries to CrossRef DOI and Wikipedia are disabled to guarantee zero outbound network requests and total privacy. Switch to Online Mode in the header to run live academic verification.
                    </p>
                  </div>
                ) : result.onlineHits.length === 0 ? (
                  <div className="p-4 text-center text-xs text-ink-muted dark:text-ink-dark-muted bg-panel dark:bg-panel-dark rounded-lg">
                    No web or academic matches discovered on CrossRef or Wikipedia for extracted distinctive phrases.
                  </div>
                ) : (
                  result.onlineHits.map((hit, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-2 text-xs shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="badge badge-neutral text-[9px] uppercase font-mono">
                            {hit.source}
                          </span>
                          <a
                            href={hit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-accent hover:underline text-xs"
                          >
                            {hit.title} ↗
                          </a>
                        </div>
                        <span className="badge-warning font-mono text-[10px]">
                          Similarity: {Math.round(hit.similarityScore * 100)}%
                        </span>
                      </div>

                      {hit.authors && hit.authors.length > 0 && (
                        <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted">
                          Authors: {hit.authors.join(', ')} {hit.year ? `(${hit.year})` : ''}
                        </div>
                      )}

                      {hit.snippet && (
                        <p className="p-2 rounded bg-panel dark:bg-panel-dark text-[11px] text-ink dark:text-ink-dark leading-relaxed">
                          {hit.snippet}
                        </p>
                      )}

                      <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono truncate">
                        Query Phrase: "{hit.queryPhrase}"
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {!result && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-muted dark:text-ink-dark-muted space-y-2">
            <span className="text-3xl opacity-40 font-mono">§</span>
            <p className="text-xs">
              Load reference documents and click Analyze to verify originality, detect semantic paraphrasing, and scan for style shifts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
