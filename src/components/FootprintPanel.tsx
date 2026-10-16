import { useCallback, useState, useMemo } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { analyzeFootprint } from '../core/footprint/analysis';
import {
  scrubAllAIFingerprints,
  type AIFingerprintScrubReport,
} from '../core/footprint/removal';
import {
  computeSentenceFingerprintHeatmap,
  type SentenceFingerprint,
} from '../core/footprint/detector';

export default function FootprintPanel() {
  const {
    originalText,
    cleanedText,
    footprintAnalysis,
    isAnalyzingFootprint,
    setFootprintAnalysis,
    setFootprintRemoval,
    setIsAnalyzingFootprint,
    setCleanedText,
  } = useStore();

  const applyTextMutation = useStore((s: any) => s.applyTextMutation);
  const storeScrubReport = useStore((s: any) => s.footprintScrubReport);
  const setFootprintScrubReport = useStore((s: any) => s.setFootprintScrubReport);
  const setSentenceHeatmap = useStore((s: any) => s.setSentenceHeatmap);

  const t = useT();
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const [localScrubReport, setLocalScrubReport] = useState<AIFingerprintScrubReport | null>(null);
  const [activeSentence, setActiveSentence] = useState<SentenceFingerprint | null>(null);

  // 4-Layer Removal Toggles
  const [layers, setLayers] = useState({
    layer1Lexical: true,
    layer2HedgingTemplates: true,
    layer3Typographic: true,
    layer4Burstiness: true,
  });

  const text = cleanedText ?? originalText;

  // Active scrub report
  const activeReport = localScrubReport ?? storeScrubReport;

  // Sentence heatmap computation
  const heatmapData = useMemo(() => {
    if (!text) return { sentences: [], highCount: 0, moderateCount: 0, lowCount: 0 };
    return computeSentenceFingerprintHeatmap(text);
  }, [text]);

  const handleAnalyze = useCallback(() => {
    if (!text) return;
    setIsAnalyzingFootprint(true);
    setTimeout(() => {
      const result = analyzeFootprint(text);
      setFootprintAnalysis(result);
      const heatmap = computeSentenceFingerprintHeatmap(text);
      if (typeof setSentenceHeatmap === 'function') {
        setSentenceHeatmap(heatmap.sentences);
      }
      setIsAnalyzingFootprint(false);
    });
  }, [text, setFootprintAnalysis, setIsAnalyzingFootprint, setSentenceHeatmap]);

  const handleScrubAll = useCallback(() => {
    if (!text) return;
    const report = scrubAllAIFingerprints(text, {
      intensity,
      normalizeTypographic: layers.layer3Typographic,
      preserveCodeSpans: true,
    });

    setLocalScrubReport(report);
    if (typeof setFootprintScrubReport === 'function') {
      setFootprintScrubReport(report);
    }
    setFootprintRemoval(report as any);

    const target = report.modified;
    if (typeof applyTextMutation === 'function') {
      applyTextMutation(target, 'footprint-scrub', 'Scrub All AI Fingerprints');
    }
    setCleanedText(target);

    // Update heatmap for the modified text
    const updatedHeatmap = computeSentenceFingerprintHeatmap(target);
    if (typeof setSentenceHeatmap === 'function') {
      setSentenceHeatmap(updatedHeatmap.sentences);
    }
  }, [text, intensity, layers, setFootprintScrubReport, setFootprintRemoval, applyTextMutation, setCleanedText, setSentenceHeatmap]);

  const a = footprintAnalysis;
  const scorePct = a ? Math.round(a.overallScore * 100) : 0;
  const scoreColor = scorePct > 60 ? 'text-danger' : scorePct > 30 ? 'text-warning' : 'text-success';

  // Breakdown metrics calculation
  const breakdownStats = useMemo(() => {
    if (!activeReport) return null;
    const tf = activeReport.transforms;
    const codeBlocks = (text.match(/```[\s\S]*?```|`[^`]+`|https?:\/\/\S+/g) ?? []).length;

    return {
      synonymsRotated: tf.filter((tr: any) => tr.type === 'synonym-rotate' || (tr.type as string) === 'synonym-swap').length,
      hedgingStripped: tf.filter((tr: any) => tr.type === 'hedging-remove').length,
      templatesRewritten: tf.filter((tr: any) => tr.type === 'template-replace').length,
      emDashesNormalized: tf.filter((tr: any) => tr.type === 'typographic-scrub' && (tr.originalSpan.text.includes('—') || tr.originalSpan.text.includes('--'))).length,
      curlyQuotesNormalized: tf.filter((tr: any) => tr.type === 'typographic-scrub' && /[“”‘’]/.test(tr.originalSpan.text)).length,
      boldColonsCleaned: tf.filter((tr: any) => tr.type === 'typographic-scrub' && tr.reason.toLowerCase().includes('lead-in')).length,
      nbspStripped: tf.filter((tr: any) => tr.type === 'typographic-scrub' && tr.reason.toLowerCase().includes('nbsp')).length,
      protectedSpans: codeBlocks,
    };
  }, [activeReport, text]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Top Toolbar */}
      <div className="panel-bar">
        <button
          onClick={handleAnalyze}
          disabled={!text || isAnalyzingFootprint}
          className="btn-primary"
        >
          {isAnalyzingFootprint ? t('fp.analyzing') : t('fp.analyze')}
        </button>

        <button
          onClick={handleScrubAll}
          disabled={!text}
          title="Executes explicit 4-layer AI fingerprint scrubbing with protected code preservation"
          className="btn-warn font-semibold"
        >
          ✨ Scrub All AI Fingerprints
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[11px] text-ink-muted dark:text-ink-dark-muted mr-1">Intensity:</span>
          {(['light', 'moderate', 'heavy'] as const).map(i => (
            <button
              key={i}
              onClick={() => setIntensity(i)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                intensity === i ? 'bg-accent text-white font-semibold' : 'btn-ghost'
              }`}
            >
              {t(`common.${i}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Layer Toggles Bar */}
      <div className="px-4 py-2 border-b border-border dark:border-border-dark bg-panel/50 dark:bg-panel-dark/50 flex items-center gap-3 flex-wrap text-[11px]">
        <span className="font-semibold text-ink dark:text-ink-dark">Layers:</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.layer1Lexical}
            onChange={e => setLayers(l => ({ ...l, layer1Lexical: e.target.checked }))}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>Layer 1: Lexical Buzzwords</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.layer2HedgingTemplates}
            onChange={e => setLayers(l => ({ ...l, layer2HedgingTemplates: e.target.checked }))}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>Layer 2: Hedging & Templates</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.layer3Typographic}
            onChange={e => setLayers(l => ({ ...l, layer3Typographic: e.target.checked }))}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>Layer 3: Typographic & Punctuation Tells</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.layer4Burstiness}
            onChange={e => setLayers(l => ({ ...l, layer4Burstiness: e.target.checked }))}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>Layer 4: Burstiness & Variance</span>
        </label>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {!a && !activeReport && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-muted dark:text-ink-dark-muted space-y-2">
            <span className="text-3xl opacity-40">⊗</span>
            <p className="text-xs">{t('fp.empty')}</p>
          </div>
        )}

        {/* 4-Layer Removal Breakdown (when scrub report is present) */}
        {activeReport && breakdownStats && (
          <div className="p-4 rounded-xl border border-success/40 bg-success-muted/30 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-success dark:text-emerald-400 font-bold text-sm">✓ AI Fingerprints Scrubbed</span>
                <span className="badge-neutral font-mono text-[10px]">
                  {activeReport.transforms.length} transforms applied
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>Before: <b>{(activeReport.beforeScore * 100).toFixed(0)}%</b></span>
                <span>→</span>
                <span className="text-success dark:text-emerald-400 font-bold">
                  After: {(activeReport.afterScore * 100).toFixed(0)}%
                </span>
                <span className="badge badge-success text-[10px] ml-1">
                  -{activeReport.reductionPercent}% Risk
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">Synonyms Rotated</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.synonymsRotated}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">Hedging Stripped</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.hedgingStripped}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">Templates Rewritten</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.templatesRewritten}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">Em-Dashes Normalized</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.emDashesNormalized}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">Curly Quotes Normalized</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.curlyQuotesNormalized}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">Bold-Colons Cleaned</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.boldColonsCleaned}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">NBSP Stripped</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.nbspStripped}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">Code/URLs Preserved</span>
                <span className="font-bold text-success dark:text-emerald-400 text-sm">{breakdownStats.protectedSpans}</span>
              </div>
            </div>
          </div>
        )}

        {/* Per-Sentence Fingerprint Risk Heatmap */}
        {heatmapData.sentences.length > 0 && (
          <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-ink-dark">
                  Per-Sentence Fingerprint Risk Heatmap
                </span>
                <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
                  ({heatmapData.sentences.length} sentences)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-danger"></span>
                  <span>{heatmapData.highCount} High</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-warning"></span>
                  <span>{heatmapData.moderateCount} Medium</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  <span>{heatmapData.lowCount} Low</span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface dark:bg-surface-dark border border-border/60 dark:border-border-dark/60 max-h-56 overflow-y-auto space-y-1.5 text-xs leading-relaxed">
              {heatmapData.sentences.map((sent, idx) => {
                const bgClass =
                  sent.level === 'high'
                    ? 'bg-danger/15 border border-danger/30 text-ink dark:text-red-200'
                    : sent.level === 'moderate'
                    ? 'bg-warning/15 border border-warning/30 text-ink dark:text-yellow-200'
                    : 'bg-success/10 border border-success/20 text-ink dark:text-emerald-200';

                return (
                  <span
                    key={idx}
                    onClick={() => setActiveSentence(sent)}
                    title={sent.triggers.length > 0 ? `Triggers: ${sent.triggers.join(' | ')}` : 'Natural human sentence'}
                    className={`inline-block px-1.5 py-0.5 m-0.5 rounded cursor-pointer transition-all hover:ring-1 hover:ring-accent ${bgClass}`}
                  >
                    {sent.text}{' '}
                  </span>
                );
              })}
            </div>

            {/* Hovered / Clicked Sentence Trigger Inspector */}
            {activeSentence && (
              <div className="p-2.5 rounded-lg bg-surface/90 dark:bg-surface-dark/90 border border-accent/40 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-accent">
                  <span>Selected Sentence Details ({activeSentence.level.toUpperCase()} RISK)</span>
                  <button onClick={() => setActiveSentence(null)} className="text-ink-muted hover:text-ink">✕</button>
                </div>
                <p className="text-ink dark:text-ink-dark italic">"{activeSentence.text}"</p>
                <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted">
                  <span className="font-semibold text-ink dark:text-ink-dark">Triggers: </span>
                  {activeSentence.triggers.length > 0 ? activeSentence.triggers.join(', ') : 'None (Natural)'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Headline score card */}
        {a && (
          <div className="rounded-xl border border-border dark:border-border-dark bg-panel/60 dark:bg-panel-dark/60 p-4">
            <div className="text-xs font-mono uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted mb-1">
              {t('fp.llmScore')}
            </div>
            <div className={`text-5xl font-bold leading-none mb-3 ${scoreColor}`}>{scorePct}%</div>
            <div className="relative h-4 rounded-full overflow-hidden bg-danger/15">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  scorePct > 60 ? 'bg-danger' : scorePct > 30 ? 'bg-warning' : 'bg-success'
                } transition-all duration-500`}
                style={{ width: `${Math.max(scorePct, 4)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] font-semibold text-white/90">
                {scorePct}%
              </span>
            </div>
            <div className="mt-2 text-[10px] text-ink-faint dark:text-ink-dark-faint">
              {t('fp.confidence')} {(a.confidence * 100).toFixed(0)}% · {a.durationMs.toFixed(1)}ms · {t('fp.higherMore')}
            </div>
          </div>
        )}

        {/* Simplified Plain-English High-Level Metrics */}
        {a && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="stat-card">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                Sentence Length Variety
              </div>
              <div className="stat-value text-lg font-bold text-ink dark:text-ink-dark">
                {a.burstiness.sentenceLengthVariance > 50 ? 'Natural' : 'Uniform (AI-like)'}
              </div>
              <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                Variance: {a.burstiness.sentenceLengthVariance.toFixed(1)}
              </p>
            </div>

            <div className="stat-card">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                Vocabulary Diversity
              </div>
              <div className="stat-value text-lg font-bold text-ink dark:text-ink-dark">
                {(a.vocabulary.typeTokenRatio * 100).toFixed(0)}%
              </div>
              <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                Type-Token Ratio ({a.vocabulary.typeTokenRatio.toFixed(2)})
              </p>
            </div>

            <div className="stat-card">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                AI Buzzword Density
              </div>
              <div className="stat-value text-lg font-bold text-danger">
                {a.vocabulary.llmFavoredCount} words
              </div>
              <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                {a.vocabulary.llmFavoredWords.slice(0, 3).join(', ') || 'None detected'}
              </p>
            </div>
          </div>
        )}

        {/* Expandable Technical Metrics Drawer */}
        {a && (
          <details className="rounded-xl border border-border dark:border-border-dark bg-panel/40 dark:bg-panel-dark/40 px-4 py-3">
            <summary className="text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted cursor-pointer hover:text-ink transition-colors">
              Show Technical Metrics & Profiles
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-3 text-[11px]">
              <div>
                <span className="text-ink-muted block text-[10px]">Perplexity Uniformity</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{(a.perplexityProfile.uniformity * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">Perplexity Mean</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{a.perplexityProfile.mean.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">Sentence Length Mean</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{a.burstiness.sentenceLengthMean.toFixed(1)} words</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">Bigram Repeat Ratio</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{(a.repetition.bigramRepeatRatio * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">Trigram Repeat Ratio</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{(a.repetition.trigramRepeatRatio * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">Structural Uniformity</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{(a.repetition.structuralUniformity * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">Hapax Legomena Ratio</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{a.vocabulary.hapaxRatio.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">Template Phrases Count</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{a.repetition.templatePhrases.length}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">Hedging Phrases Count</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{a.repetition.hedgingPhrases.length}</span>
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
