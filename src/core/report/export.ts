import type { IntegrityReport } from './types';
import type { ScanResult } from '../scanner/types';
import type { CleanupResult } from '../cleanup/types';
import type { CleanupHistory } from '../cleanup/types';
import type { WatermarkDetectionResult } from '../watermark/types';
import type { FootprintAnalysis } from '../footprint/types';
import type { OptimizerResult } from '../oracle/optimizer';
import type { PollutionResult } from '../spoof/pollution';
import type { PoisonResult } from '../poison/tokenBoundary';
import type { LMScanResult } from '../lm/scorer';
import type { InjectionAnalysisResult } from '../injection/types';
import { sha256 } from './hash';

export async function buildReport(params: {
  originalText: string;
  cleanedText?: string;
  scanResult?: ScanResult;
  cleanupResult?: CleanupResult;
  watermarkResult?: WatermarkDetectionResult;
  footprintResult?: FootprintAnalysis;
  injectionResult?: InjectionAnalysisResult;
  optimizerResult?: OptimizerResult;
  pollutionResult?: PollutionResult;
  poisonResult?: PoisonResult;
  lmScoreResult?: LMScanResult;
  history?: CleanupHistory;
}): Promise<IntegrityReport> {
  const originalHash = await sha256(params.originalText);
  const cleanedHash = params.cleanedText ? await sha256(params.cleanedText) : null;

  const words = params.originalText.trim().split(/\s+/).filter(w => w.length > 0).length;

  return {
    version: '2.1.0',
    application: 'AI TextSense v2.1 — Forensic Text & Prompt Injection Inspector',
    author: 'Wilson Volpe',
    copyright: '© 2026 Wilson Volpe. All rights reserved.',
    timestamp: new Date().toISOString(),
    hashes: {
      originalSha256: originalHash,
      cleanedSha256: cleanedHash,
    },
    textStats: {
      originalChars: Array.from(params.originalText).length,
      cleanedChars: params.cleanedText ? Array.from(params.cleanedText).length : null,
      words,
    },
    scanResult: params.scanResult ?? null,
    cleanupResult: params.cleanupResult ? {
      mode: params.cleanupResult.mode,
      changesCount: params.cleanupResult.changes.length,
      charsRemoved: params.cleanupResult.changes.filter(c => c.replacement === '').length,
      charsNormalized: params.cleanupResult.changes.filter(c => c.replacement !== '').length,
    } : null,
    watermarkResult: params.watermarkResult ? {
      method: params.watermarkResult.method,
      zScore: params.watermarkResult.zScore,
      pValue: params.watermarkResult.pValue,
      isSignificant: params.watermarkResult.isSignificant,
      greenListRatio: params.watermarkResult.greenListRatio,
    } : null,
    footprintResult: params.footprintResult ? {
      overallScore: params.footprintResult.overallScore,
      confidence: params.footprintResult.confidence,
      llmFavoredWords: params.footprintResult.vocabulary.llmFavoredWords,
      hedgingPhraseCount: params.footprintResult.repetition.hedgingPhrases.length,
    } : null,
    injectionResult: params.injectionResult ? {
      riskScore: params.injectionResult.riskScore,
      severity: params.injectionResult.severity,
      decodedPayloadCount: params.injectionResult.decodedPayloads.length,
      findingsCount: params.injectionResult.findings.length,
      hiddenTokensCount: params.injectionResult.tokenizerImpact.tokenDifference,
      topFindings: params.injectionResult.findings.map(f => f.title),
    } : null,
    optimizerResult: params.optimizerResult ? {
      editsApplied: params.optimizerResult.editsApplied,
      rejectedCount: params.optimizerResult.rejectedCount,
      beforeScore: params.optimizerResult.before.score,
      afterScore: params.optimizerResult.after.score,
      durationMs: params.optimizerResult.durationMs,
      summary: params.optimizerResult.summary,
    } : null,
    pollutionResult: params.pollutionResult ? {
      forgedConfigs: params.pollutionResult.forgedConfigs.length,
      substitutions: params.pollutionResult.substitutions,
      significantHitsAfter: params.pollutionResult.significantHitsAfter,
      summary: params.pollutionResult.summary,
    } : null,
    poisonResult: params.poisonResult ? {
      mode: params.poisonResult.mode,
      density: params.poisonResult.density,
      injections: params.poisonResult.injections,
      wordsCovered: params.poisonResult.wordsCovered,
    } : null,
    lmScoreResult: params.lmScoreResult ? {
      meanNll: params.lmScoreResult.meanNll,
      stdNll: params.lmScoreResult.stdNll,
      uniformity: params.lmScoreResult.uniformity,
      machineLikelihood: params.lmScoreResult.machineLikelihood,
      totalTokens: params.lmScoreResult.totalTokens,
    } : null,
    cleanupHistory: params.history?.snapshots.map(s => ({
      label: s.label,
      timestamp: s.timestamp,
    })) ?? [],
  };
}

export function exportJSON(report: IntegrityReport): string {
  return JSON.stringify(report, null, 2);
}

export function exportCSV(report: IntegrityReport): string {
  const rows: string[][] = [
    ['Field', 'Value'],
    ['Application', report.application],
    ['Author', report.author],
    ['Copyright', report.copyright],
    ['Version', report.version],
    ['Timestamp', report.timestamp],
    ['Original SHA-256', report.hashes.originalSha256],
    ['Cleaned SHA-256', report.hashes.cleanedSha256 ?? 'N/A'],
    ['Original Chars', String(report.textStats.originalChars)],
    ['Cleaned Chars', String(report.textStats.cleanedChars ?? 'N/A')],
    ['Words', String(report.textStats.words)],
  ];

  if (report.scanResult) {
    rows.push(
      ['Findings Count', String(report.scanResult.findings.length)],
      ['Stego Patterns', String(report.scanResult.stegoPatterns.length)],
      ['Mixed Script Runs', String(report.scanResult.mixedScriptRuns.length)],
      ['Bidi Issues', String(report.scanResult.bidiIssues.length)],
      ['Scan Duration (ms)', String(report.scanResult.durationMs.toFixed(1))],
    );
  }

  if (report.cleanupResult) {
    rows.push(
      ['Cleanup Mode', report.cleanupResult.mode],
      ['Changes Count', String(report.cleanupResult.changesCount)],
      ['Chars Removed', String(report.cleanupResult.charsRemoved)],
      ['Chars Normalized', String(report.cleanupResult.charsNormalized)],
    );
  }

  if (report.watermarkResult) {
    rows.push(
      ['Watermark Method', report.watermarkResult.method],
      ['Z-Score', String(report.watermarkResult.zScore.toFixed(4))],
      ['P-Value', String(report.watermarkResult.pValue.toFixed(6))],
      ['Significant', String(report.watermarkResult.isSignificant)],
      ['Green List Ratio', String(report.watermarkResult.greenListRatio.toFixed(4))],
    );
  }

  if (report.footprintResult) {
    rows.push(
      ['Footprint Score', String(report.footprintResult.overallScore.toFixed(4))],
      ['Footprint Confidence', String(report.footprintResult.confidence.toFixed(4))],
      ['LLM-Favored Words', report.footprintResult.llmFavoredWords.join('; ')],
      ['Hedging Phrase Count', String(report.footprintResult.hedgingPhraseCount)],
    );
  }

  if (report.optimizerResult) {
    rows.push(
      ['Optimizer Edits Applied', String(report.optimizerResult.editsApplied)],
      ['Optimizer Edits Rejected', String(report.optimizerResult.rejectedCount)],
      ['Optimizer Detectability Before', (report.optimizerResult.beforeScore * 100).toFixed(1) + '%'],
      ['Optimizer Detectability After', (report.optimizerResult.afterScore * 100).toFixed(1) + '%'],
      ['Optimizer Duration (ms)', String(report.optimizerResult.durationMs.toFixed(0))],
    );
  }

  if (report.pollutionResult) {
    rows.push(
      ['Pollution Configs Forged', String(report.pollutionResult.forgedConfigs)],
      ['Pollution Substitutions', String(report.pollutionResult.substitutions)],
      ['Sweep Significant Hits After', String(report.pollutionResult.significantHitsAfter)],
    );
  }

  if (report.poisonResult) {
    rows.push(
      ['Poison Mode', report.poisonResult.mode],
      ['Poison Density', report.poisonResult.density],
      ['Poison Injections', String(report.poisonResult.injections)],
      ['Poison Words Covered', String(report.poisonResult.wordsCovered)],
    );
  }

  if (report.lmScoreResult) {
    rows.push(
      ['LM Mean NLL', report.lmScoreResult.meanNll.toFixed(4)],
      ['LM Std NLL', report.lmScoreResult.stdNll.toFixed(4)],
      ['LM Uniformity', report.lmScoreResult.uniformity.toFixed(4)],
      ['LM Machine Likelihood', (report.lmScoreResult.machineLikelihood * 100).toFixed(1) + '%'],
      ['LM Tokens Scored', String(report.lmScoreResult.totalTokens)],
    );
  }

  return rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}

export async function exportPDF(report: IntegrityReport): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 20;
  const ensureSpace = (need: number) => {
    if (y + need > pageH - 16) { doc.addPage(); y = 20; }
  };

  doc.setFontSize(16);
  doc.text('AI TextSense — Text Integrity Report', 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.text(`Author: ${report.author}   ${report.copyright}`, 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`Generated: ${report.timestamp}`, 14, y);
  y += 8;
  doc.text(`Version: ${report.version}`, 14, y);
  y += 12;

  doc.setFontSize(12);
  doc.text('Hashes', 14, y);
  y += 7;
  doc.setFontSize(8);
  doc.text(`Original SHA-256: ${report.hashes.originalSha256}`, 14, y);
  y += 5;
  if (report.hashes.cleanedSha256) {
    doc.text(`Cleaned SHA-256: ${report.hashes.cleanedSha256}`, 14, y);
    y += 5;
  }
  y += 5;

  doc.setFontSize(12);
  doc.text('Text Stats', 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.text(`Original: ${report.textStats.originalChars} chars, ${report.textStats.words} words`, 14, y);
  y += 5;
  if (report.textStats.cleanedChars !== null) {
    doc.text(`Cleaned: ${report.textStats.cleanedChars} chars`, 14, y);
    y += 5;
  }
  y += 5;

  if (report.scanResult) {
    doc.setFontSize(12);
    doc.text('Scan Results', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.text(`Findings: ${report.scanResult.findings.length}`, 14, y);
    y += 5;
    doc.text(`Stego patterns: ${report.scanResult.stegoPatterns.length}`, 14, y);
    y += 5;
    doc.text(`Bidi issues: ${report.scanResult.bidiIssues.length}`, 14, y);
    y += 10;
  }

  if (report.watermarkResult) {
    doc.setFontSize(12);
    doc.text('Watermark Analysis', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.text(`Method: ${report.watermarkResult.method}`, 14, y);
    y += 5;
    doc.text(`Z-Score: ${report.watermarkResult.zScore.toFixed(4)}`, 14, y);
    y += 5;
    doc.text(`P-Value: ${report.watermarkResult.pValue.toFixed(6)}`, 14, y);
    y += 5;
    doc.text(`Significant: ${report.watermarkResult.isSignificant ? 'Yes' : 'No'}`, 14, y);
    y += 10;
  }

  if (report.footprintResult) {
    doc.setFontSize(12);
    doc.text('AI Footprint Analysis', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.text(`Score: ${report.footprintResult.overallScore.toFixed(4)}`, 14, y);
    y += 5;
    doc.text(`LLM-Favored Words: ${report.footprintResult.llmFavoredWords.join(', ')}`, 14, y);
    y += 10;
  }

  if (report.optimizerResult) {
    ensureSpace(40);
    doc.setFontSize(12);
    doc.text('v2 Oracle Optimizer', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.text(`Detectability: ${(report.optimizerResult.beforeScore * 100).toFixed(1)}% -> ${(report.optimizerResult.afterScore * 100).toFixed(1)}%`, 14, y);
    y += 5;
    doc.text(`Edits applied: ${report.optimizerResult.editsApplied} (rejected: ${report.optimizerResult.rejectedCount})`, 14, y);
    y += 5;
    doc.text(`Duration: ${report.optimizerResult.durationMs.toFixed(0)} ms`, 14, y);
    y += 10;
  }

  if (report.pollutionResult) {
    ensureSpace(30);
    doc.setFontSize(12);
    doc.text('Watermark Pollution', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.text(`Forged configs: ${report.pollutionResult.forgedConfigs}, substitutions: ${report.pollutionResult.substitutions}`, 14, y);
    y += 5;
    doc.text(`Sweep significant hits after: ${report.pollutionResult.significantHitsAfter}`, 14, y);
    y += 10;
  }

  if (report.poisonResult) {
    ensureSpace(30);
    doc.setFontSize(12);
    doc.text('Token-Boundary Poisoning', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.text(`Mode: ${report.poisonResult.mode} (${report.poisonResult.density}), injections: ${report.poisonResult.injections}`, 14, y);
    y += 10;
  }

  if (report.lmScoreResult) {
    ensureSpace(35);
    doc.setFontSize(12);
    doc.text('LM Perplexity Score', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.text(`Mean NLL: ${report.lmScoreResult.meanNll.toFixed(3)}  (std ${report.lmScoreResult.stdNll.toFixed(3)})`, 14, y);
    y += 5;
    doc.text(`Machine likelihood: ${(report.lmScoreResult.machineLikelihood * 100).toFixed(1)}% over ${report.lmScoreResult.totalTokens} tokens`, 14, y);
    y += 10;
  }

  // Copyright footer on the final page.
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`${report.application}  —  ${report.copyright}`, 14, pageH - 8);
  doc.setTextColor(0);

  return doc.output('blob');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}
