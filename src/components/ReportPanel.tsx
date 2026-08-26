import { useCallback } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { buildReport, exportJSON, exportCSV, exportPDF, downloadText, downloadBlob } from '../core/report';

export default function ReportPanel() {
  const {
    originalText, cleanedText, scanResult, cleanupResult,
    watermarkResult, footprintAnalysis, history, report, setReport,
    optimizerResult, pollutionResult, poisonResult, lmScore,
    injectionResult,
  } = useStore();
  const t = useT();

  const handleGenerate = useCallback(async () => {
    const r = await buildReport({
      originalText,
      cleanedText: cleanedText ?? undefined,
      scanResult: scanResult ?? undefined,
      cleanupResult: cleanupResult ?? undefined,
      watermarkResult: watermarkResult ?? undefined,
      footprintResult: footprintAnalysis ?? undefined,
      injectionResult: injectionResult ?? undefined,
      optimizerResult: optimizerResult ?? undefined,
      pollutionResult: pollutionResult ?? undefined,
      poisonResult: poisonResult ?? undefined,
      lmScoreResult: lmScore ?? undefined,
      history: history ?? undefined,
    });
    setReport(r);
  }, [originalText, cleanedText, scanResult, cleanupResult, watermarkResult, footprintAnalysis, history, setReport, optimizerResult, pollutionResult, poisonResult, lmScore, injectionResult]);

  const handleExportJSON = useCallback(() => {
    if (!report) return;
    downloadText(exportJSON(report), 'tii-report.json', 'application/json');
  }, [report]);

  const handleExportCSV = useCallback(() => {
    if (!report) return;
    downloadText(exportCSV(report), 'tii-report.csv', 'text/csv');
  }, [report]);

  const handleExportPDF = useCallback(async () => {
    if (!report) return;
    const blob = await exportPDF(report);
    downloadBlob(blob, 'tii-report.pdf');
  }, [report]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border dark:border-border-dark">
        <button onClick={handleGenerate} disabled={!originalText}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors">
          {t('report.generate')}
        </button>
        <div className="flex gap-1 ml-auto">
          <button onClick={handleExportJSON} disabled={!report}
            className="px-2 py-1 text-xs bg-panel dark:bg-panel-dark rounded disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700">
            JSON
          </button>
          <button onClick={handleExportCSV} disabled={!report}
            className="px-2 py-1 text-xs bg-panel dark:bg-panel-dark rounded disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700">
            CSV
          </button>
          <button onClick={handleExportPDF} disabled={!report}
            className="px-2 py-1 text-xs bg-panel dark:bg-panel-dark rounded disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700">
            PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 text-sm">
        {report ? (
          <pre className="text-xs font-mono whitespace-pre-wrap bg-panel dark:bg-panel-dark p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(report, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-400 text-sm">{t('report.empty')}</p>
        )}
      </div>
    </div>
  );
}
