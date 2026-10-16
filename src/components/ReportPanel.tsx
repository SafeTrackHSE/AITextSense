import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import {
  buildReport,
  exportJSON,
  exportCSV,
  exportPDF,
  downloadText,
  downloadBlob,
} from '../core/report';
import { exportReportAsDocx } from '../core/report/export';
import logoHorizontal from '../assets/AITextSense_Horizontal.png';

export default function ReportPanel() {
  const {
    originalText,
    cleanedText,
    scanResult,
    cleanupResult,
    watermarkResult,
    footprintAnalysis,
    footprintRemoval,
    history,
    report,
    setReport,
    optimizerResult,
    pollutionResult,
    poisonResult,
    lmScore,
    injectionResult,
    threatResult,
  } = useStore();

  const plagiarismResult = useStore((s: any) => s.plagiarismResult);
  const footprintScrubReport = useStore((s: any) => s.footprintScrubReport);

  const t = useT();
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleGenerate = useCallback(async () => {
    const r = await buildReport({
      originalText,
      cleanedText: cleanedText ?? undefined,
      scanResult: scanResult ?? undefined,
      cleanupResult: cleanupResult ?? undefined,
      watermarkResult: watermarkResult ?? undefined,
      footprintResult: footprintAnalysis ?? undefined,
      footprintRemoval: footprintRemoval ?? undefined,
      footprintScrubReport: footprintScrubReport ?? undefined,
      injectionResult: injectionResult ?? undefined,
      threatResult: threatResult ?? undefined,
      optimizerResult: optimizerResult ?? undefined,
      pollutionResult: pollutionResult ?? undefined,
      poisonResult: poisonResult ?? undefined,
      lmScoreResult: lmScore ?? undefined,
      plagiarismResult: plagiarismResult ?? undefined,
      history: history ?? undefined,
    });
    setReport(r);
  }, [
    originalText,
    cleanedText,
    scanResult,
    cleanupResult,
    watermarkResult,
    footprintAnalysis,
    footprintRemoval,
    footprintScrubReport,
    injectionResult,
    threatResult,
    optimizerResult,
    pollutionResult,
    poisonResult,
    lmScore,
    plagiarismResult,
    history,
    setReport,
  ]);

  const handleExportJSON = useCallback(() => {
    if (!report) return;
    downloadText(exportJSON(report), 'aitextsense-report.json', 'application/json');
  }, [report]);

  const handleExportCSV = useCallback(() => {
    if (!report) return;
    downloadText(exportCSV(report), 'aitextsense-report.csv', 'text/csv');
  }, [report]);

  const handleExportPDF = useCallback(async () => {
    if (!report) return;
    setIsExportingPdf(true);
    try {
      const blob = await exportPDF(report);
      downloadBlob(blob, 'aitextsense-report.pdf');
    } finally {
      setIsExportingPdf(false);
    }
  }, [report]);

  const handleExportDOCX = useCallback(async () => {
    if (!report) return;
    setIsExportingDocx(true);
    try {
      const blob = await exportReportAsDocx(report);
      downloadBlob(blob, 'aitextsense-report.docx');
    } finally {
      setIsExportingDocx(false);
    }
  }, [report]);

  const severityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'badge-danger';
      case 'MEDIUM':
      case 'LOW':
        return 'badge-warning';
      default:
        return 'badge-success';
    }
  };

  const overallRisk =
    threatResult?.severity ??
    injectionResult?.severity ??
    report?.threatResult?.severity ??
    report?.injectionResult?.severity ??
    'CLEAN';

  const scanFindingsCount = report?.scanResult ? report.scanResult.findings.length : (scanResult?.findings.length ?? 0);
  const scanStegoCount = report?.scanResult ? report.scanResult.stegoPatterns.length : (scanResult?.stegoPatterns.length ?? 0);
  const scanBidiCount = report?.scanResult ? report.scanResult.bidiIssues.length : (scanResult?.bidiIssues.length ?? 0);
  const scanMixedCount = report?.scanResult ? report.scanResult.mixedScriptRuns.length : (scanResult?.mixedScriptRuns.length ?? 0);

  const injSeverity = report?.injectionResult?.severity ?? injectionResult?.severity ?? 'CLEAN';
  const injRiskScore = report?.injectionResult?.riskScore ?? injectionResult?.riskScore ?? 0;
  const injPayloadCount = report?.injectionResult?.decodedPayloadCount ?? injectionResult?.decodedPayloads.length ?? 0;
  const injFindingsCount = report?.injectionResult?.findingsCount ?? injectionResult?.findings.length ?? 0;

  const threatSeverity = report?.threatResult?.severity ?? threatResult?.severity ?? 'CLEAN';
  const threatRiskScore = report?.threatResult?.riskScore ?? threatResult?.riskScore ?? 0;
  const threatFindingsCount = report?.threatResult?.findingsCount ?? threatResult?.findings.length ?? 0;
  const threatSpansCount = report?.threatResult?.spansExtracted ?? threatResult?.spansExtracted ?? 0;
  const threatDecodedCount = report?.threatResult?.decodedSpanCount ?? threatResult?.decodedSpanCount ?? 0;
  const killChainCount = (report as any)?.killChain?.chainsDetected ?? 0;

  const wmIsSignificant = report?.watermarkResult?.isSignificant ?? watermarkResult?.isSignificant ?? false;
  const wmZScore = report?.watermarkResult?.zScore ?? watermarkResult?.zScore ?? 0;
  const wmPValue = report?.watermarkResult?.pValue ?? watermarkResult?.pValue ?? 1;

  const scrubData = (report as any)?.footprintScrubReport ?? footprintScrubReport;
  const plagiarismData = (report as any)?.plagiarism ?? plagiarismResult;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Top Toolbar */}
      <div className="panel-bar">
        <button
          onClick={handleGenerate}
          disabled={!originalText}
          className="btn-primary"
        >
          {t('report.generate')}
        </button>

        {/* View Toggle */}
        <div className="flex bg-panel dark:bg-panel-dark rounded p-0.5 border border-border dark:border-border-dark text-xs">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'visual'
                ? 'bg-accent text-white font-semibold'
                : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink'
            }`}
          >
            Visual Executive Report
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'json'
                ? 'bg-accent text-white font-semibold'
                : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink'
            }`}
          >
            Raw JSON
          </button>
        </div>

        {/* 4 Export Buttons */}
        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={handleExportPDF}
            disabled={!report || isExportingPdf}
            className="btn-ghost text-xs"
            title="Export forensic report as PDF"
          >
            {isExportingPdf ? 'Exporting...' : 'Export PDF'}
          </button>

          <button
            onClick={handleExportDOCX}
            disabled={!report || isExportingDocx}
            className="btn-ghost text-xs font-medium"
            title="Export forensic report as Microsoft Word (.docx)"
          >
            {isExportingDocx ? 'Exporting...' : 'Export Word (DOCX)'}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!report}
            className="btn-ghost text-xs"
            title="Export summary metrics as CSV"
          >
            Export CSV
          </button>

          <button
            onClick={handleExportJSON}
            disabled={!report}
            className="btn-ghost text-xs"
            title="Export machine-readable JSON"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {!report ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-muted dark:text-ink-dark-muted space-y-3">
            <span className="text-3xl opacity-40 font-mono">≡</span>
            <div className="max-w-md">
              <h3 className="text-sm font-semibold text-ink dark:text-ink-dark mb-1">
                Forensic Executive Report
              </h3>
              <p className="text-xs">{t('report.empty')}</p>
            </div>
          </div>
        ) : viewMode === 'json' ? (
          <pre className="text-xs font-mono whitespace-pre-wrap bg-panel dark:bg-panel-dark p-4 rounded-xl border border-border dark:border-border-dark overflow-x-auto select-text leading-relaxed">
            {JSON.stringify(report, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto pb-6">
            {/* Executive Report Brand Header */}
            <div className="p-5 rounded-2xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark shadow-sm flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1.5">
                <img
                  src={logoHorizontal}
                  alt="AI TextSense"
                  className="h-9 w-auto object-contain dark:brightness-110"
                />
                <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted font-medium">
                  Executive Document Integrity & Forensic Security Audit
                </div>
              </div>

              <div className="text-right text-[11px] space-y-0.5 font-mono text-ink-muted dark:text-ink-dark-muted">
                <div>
                  <span className="font-semibold text-ink dark:text-ink-dark">App Version: </span>
                  v{report.version}
                </div>
                <div>
                  <span className="font-semibold text-ink dark:text-ink-dark">Generated: </span>
                  {new Date(report.timestamp).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold text-ink dark:text-ink-dark">SHA-256: </span>
                  {report.hashes.originalSha256.slice(0, 16)}...
                </div>
              </div>
            </div>

            {/* Overall Risk & Forensic Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted mb-1">
                  Overall Risk Verdict
                </div>
                <div>
                  <span className={severityBadgeClass(overallRisk)}>
                    {overallRisk}
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted mb-1">
                  Word / Char Count
                </div>
                <div className="stat-value text-base font-bold text-ink dark:text-ink-dark">
                  {report.textStats.originalChars} chars
                </div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted mb-1">
                  AI Fingerprint Level
                </div>
                <div className="stat-value text-base font-bold text-ink dark:text-ink-dark">
                  {report.footprintResult ? `${Math.round(report.footprintResult.overallScore * 100)}%` : (footprintAnalysis ? `${Math.round(footprintAnalysis.overallScore * 100)}%` : 'Not Analyzed')}
                </div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted mb-1">
                  Plagiarism Originality
                </div>
                <div className="stat-value text-base font-bold text-success dark:text-emerald-400">
                  {plagiarismData ? `${plagiarismData.originalityScore}%` : '100%'}
                </div>
              </div>
            </div>

            {/* Discipline Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1. Scanner Card */}
              <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">◈</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      Unicode & Steganography Scanner
                    </h4>
                  </div>
                  <span className={`badge ${scanFindingsCount > 0 ? 'badge-danger' : 'badge-success'}`}>
                    {scanFindingsCount > 0 ? `${scanFindingsCount} Anomalies` : 'Clean'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  Stego Patterns: {scanStegoCount} · Bidi Issues: {scanBidiCount} · Mixed-Script Runs: {scanMixedCount}
                </p>
              </div>

              {/* 2. Prompt Injection Card */}
              <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⛨</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      Prompt Injection & Covert Channels
                    </h4>
                  </div>
                  <span className={severityBadgeClass(injSeverity)}>
                    {injSeverity}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  {injPayloadCount > 0 || injFindingsCount > 0
                    ? `Risk Score: ${injRiskScore}/100 · Decoded Hidden Payloads: ${injPayloadCount} · Findings: ${injFindingsCount}`
                    : 'No prompt injection signatures or covert tags identified.'}
                </p>
              </div>

              {/* 3. Threat & Kill-Chain Defense Card */}
              <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">☠</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      Threat Analysis & Kill-Chain Defense
                    </h4>
                  </div>
                  <span className={severityBadgeClass(threatSeverity)}>
                    {threatSeverity}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  {threatFindingsCount > 0
                    ? `Risk: ${threatRiskScore}/100 · Payloads: ${threatFindingsCount} · Spans: ${threatSpansCount} · Decoded: ${threatDecodedCount} · Chains: ${killChainCount}`
                    : 'No shell execution commands or destructive payload signatures detected.'}
                </p>
              </div>

              {/* 4. Watermarks Card */}
              <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⊕</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      Statistical Token Watermarking
                    </h4>
                  </div>
                  <span className={`badge ${wmIsSignificant ? 'badge-danger' : 'badge-success'}`}>
                    {wmIsSignificant ? 'Watermark Detected' : 'No Signal'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  {report.watermarkResult || watermarkResult
                    ? `Statistical z-score: ${wmZScore.toFixed(2)} · p-value: ${wmPValue < 0.0001 ? '< 0.0001' : wmPValue.toFixed(4)}`
                    : 'Statistical watermark analysis not performed on document.'}
                </p>
              </div>

              {/* 5. AI Fingerprint Removal Suite Card */}
              <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⊗</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      AI Fingerprint Removal Breakdown
                    </h4>
                  </div>
                  <span className="badge-neutral font-mono text-[10px]">
                    {scrubData?.transformsApplied ?? (footprintRemoval?.transforms.length ?? 0)} Transforms
                  </span>
                </div>
                <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted space-y-1">
                  {scrubData ? (
                    <div>
                      Before: <b>{Math.round((scrubData.beforeScore ?? 1) * 100)}%</b> → After: <b className="text-success">{Math.round((scrubData.afterScore ?? 0) * 100)}%</b>
                      <div className="mt-1 text-[10px] text-ink-muted">
                        LLM Words Removed: {scrubData.llmWordsRemoved ?? 0} · Hedging: {scrubData.hedgingRemoved ?? 0} · Typographic Tells: {scrubData.typographicFixed ?? 0}
                      </div>
                    </div>
                  ) : report.footprintResult ? (
                    `Stylometric Score: ${Math.round(report.footprintResult.overallScore * 100)}% · LLM Words: ${report.footprintResult.llmFavoredWords.length}`
                  ) : (
                    'AI Fingerprint audit not run.'
                  )}
                </div>
              </div>

              {/* 6. Plagiarism & Originality Card */}
              <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">§</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      Plagiarism & Originality Suite
                    </h4>
                  </div>
                  <span className="badge-success text-[10px]">
                    {plagiarismData?.originalityScore ?? 100}% Original
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  {plagiarismData ? (
                    `Plagiarism Score: ${plagiarismData.plagiarismScore}% · Top Match: ${plagiarismData.highestMatchSource ?? plagiarismData.summary?.highestMatchSource ?? 'None'} (${plagiarismData.highestMatchPercent ?? plagiarismData.summary?.highestMatchPercent ?? 0}%) · Paraphrases: ${plagiarismData.paraphraseCount ?? plagiarismData.summary?.paraphraseCount ?? 0} · Style Shifts: ${plagiarismData.styleShiftCount ?? plagiarismData.summary?.styleShiftCount ?? 0}`
                  ) : (
                    'No reference comparison performed.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
