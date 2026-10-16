/**
 * Executive Integrity & Forensic Report Exporter
 * AI TextSense v3.0.0
 * (c) 2026 Wilson Volpe. All rights reserved.
 */

import type { AnalysisReport, ReportInput } from './schema';
import type { IntegrityReport } from './types';
import { sha256 } from './hash';
import { APP_VERSION, APP_APPLICATION_LABEL, APP_AUTHOR, APP_COPYRIGHT } from '../../version';

export async function buildReport(params: ReportInput): Promise<AnalysisReport> {
  const originalHash = await sha256(params.originalText);
  const cleanedHash = params.cleanedText ? await sha256(params.cleanedText) : null;

  const words = params.originalText.trim().split(/\s+/).filter(w => w.length > 0).length;

  const footprintScrub = params.footprintScrubReport ?? (params.footprintRemoval ? {
    beforeScore: (params.footprintRemoval as any).breakdown?.beforeScore ?? params.footprintRemoval.beforeScore ?? params.footprintResult?.overallScore ?? 1.0,
    afterScore: (params.footprintRemoval as any).breakdown?.afterScore ?? (params.footprintRemoval as any).afterScore ?? 0.0,
    transformsApplied: (params.footprintRemoval.transforms ?? []).length,
    llmWordsRemoved: (params.footprintRemoval as any).breakdown?.llmWordsBefore !== undefined
      ? Math.max(0, (params.footprintRemoval as any).breakdown.llmWordsBefore - (params.footprintRemoval as any).breakdown.llmWordsAfter)
      : (params.footprintRemoval.transforms ?? []).filter((t: any) => t.type === 'synonym-rotate' || t.type === 'synonym-swap').length,
    hedgingRemoved: (params.footprintRemoval as any).breakdown?.hedgingBefore !== undefined
      ? Math.max(0, (params.footprintRemoval as any).breakdown.hedgingBefore - (params.footprintRemoval as any).breakdown.hedgingAfter)
      : (params.footprintRemoval.transforms ?? []).filter((t: any) => t.type === 'hedging-remove').length,
    templatesReplaced: (params.footprintRemoval as any).breakdown?.templatesBefore !== undefined
      ? Math.max(0, (params.footprintRemoval as any).breakdown.templatesBefore - (params.footprintRemoval as any).breakdown.templatesAfter)
      : (params.footprintRemoval.transforms ?? []).filter((t: any) => t.type === 'template-replace').length,
    typographicFixed: (params.footprintRemoval as any).breakdown?.typographicBefore !== undefined
      ? Math.max(0, (params.footprintRemoval as any).breakdown.typographicBefore - (params.footprintRemoval as any).breakdown.typographicAfter)
      : (params.footprintRemoval.transforms ?? []).filter((t: any) => t.type === 'typographic-scrub').length,
  } : null);

  const plagiarism = params.plagiarism ?? (params.plagiarismResult ? {
    originalityScore: params.plagiarismResult.originalityScore,
    plagiarismScore: params.plagiarismResult.plagiarismScore,
    highestMatchSource: params.plagiarismResult.summary.highestMatchSource,
    highestMatchPercent: params.plagiarismResult.summary.highestMatchPercent,
    shingleMatchCount: params.plagiarismResult.shingleMatches.length,
    paraphraseCount: params.plagiarismResult.semanticMatches.length,
    styleShiftCount: params.plagiarismResult.intrinsicAnomalies.length,
    orphanCitationCount: params.plagiarismResult.orphanCitations.length,
    onlineHitCount: params.plagiarismResult.onlineHits.length,
    topMatches: params.plagiarismResult.shingleMatches.slice(0, 5).map(m => ({
      source: m.referenceName,
      similarity: m.similarity,
      textSnippet: m.sourceText.slice(0, 100),
    })),
  } : null);

  const threatFindings = params.threatResult?.findings.map(f => ({
    ruleId: f.ruleId,
    severity: f.severity,
    category: f.explanation.category,
    mechanism: f.explanation.mechanism,
    targets: f.explanation.targets,
    consequence: f.explanation.consequence,
    context: f.explanation.context,
    mitigation: f.explanation.mitigation,
    source: f.explanation.source,
    confidence: f.explanation.confidence,
    aiDeepDive: f.llmExplanation ? {
      mechanism: f.llmExplanation.mechanism,
      consequence: f.llmExplanation.consequence,
      mitigation: f.llmExplanation.mitigation,
      confidence: f.llmExplanation.confidence,
    } : undefined,
  })) ?? [];

  return {
    version: APP_VERSION || '3.0.0',
    application: APP_APPLICATION_LABEL,
    author: APP_AUTHOR,
    copyright: APP_COPYRIGHT,
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
    footprintScrubReport: footprintScrub,
    injectionResult: params.injectionResult ? {
      riskScore: params.injectionResult.riskScore,
      severity: params.injectionResult.severity,
      decodedPayloadCount: params.injectionResult.decodedPayloads.length,
      findingsCount: params.injectionResult.findings.length,
      hiddenTokensCount: params.injectionResult.tokenizerImpact.tokenDifference,
      topFindings: params.injectionResult.findings.map(f => f.title),
    } : null,
    threatResult: params.threatResult ? {
      riskScore: params.threatResult.riskScore,
      severity: params.threatResult.severity,
      findingsCount: params.threatResult.findings.length,
      spansExtracted: params.threatResult.spansExtracted,
      decodedSpanCount: params.threatResult.decodedSpanCount,
      capabilityReviewed: params.threatResult.capabilityReviewed,
      findings: threatFindings,
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
    plagiarism,
    killChain: params.killChain ?? ((params.threatResult as any)?.killChains ? {
      chainsDetected: (params.threatResult as any).killChains.length,
      chains: (params.threatResult as any).killChains.map((c: any) => ({
        id: c.id,
        title: c.title,
        severity: c.severity,
        stages: c.stages,
        riskScore: c.riskScore,
        description: c.description,
      })),
    } : null),
    attackBriefings: params.attackBriefings ?? null,
    cleanupHistory: params.history?.snapshots.map(s => ({
      label: s.label,
      timestamp: s.timestamp,
    })) ?? [],
  };
}

export function exportJSON(report: AnalysisReport | IntegrityReport): string {
  return JSON.stringify(report, null, 2);
}
export const exportAsJson = exportJSON;

export function exportCSV(report: AnalysisReport | IntegrityReport): string {
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

  const v3Report = report as AnalysisReport;

  if (v3Report.footprintScrubReport) {
    rows.push(
      ['Footprint Scrub Before Score', String(v3Report.footprintScrubReport.beforeScore.toFixed(4))],
      ['Footprint Scrub After Score', String(v3Report.footprintScrubReport.afterScore.toFixed(4))],
      ['Footprint Transforms Applied', String(v3Report.footprintScrubReport.transformsApplied)],
      ['LLM Words Removed', String(v3Report.footprintScrubReport.llmWordsRemoved)],
      ['Hedging Removed', String(v3Report.footprintScrubReport.hedgingRemoved)],
      ['Templates Replaced', String(v3Report.footprintScrubReport.templatesReplaced)],
      ['Typographic Tells Fixed', String(v3Report.footprintScrubReport.typographicFixed)],
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

  if (report.injectionResult) {
    rows.push(
      ['Injection Risk Score', String(report.injectionResult.riskScore)],
      ['Injection Severity', report.injectionResult.severity],
      ['Injection Decoded Payloads', String(report.injectionResult.decodedPayloadCount)],
      ['Injection Findings', String(report.injectionResult.findingsCount)],
      ['Injection Hidden Tokens', String(report.injectionResult.hiddenTokensCount)],
      ['Injection Top Findings', report.injectionResult.topFindings.join('; ')],
    );
  }

  if (report.threatResult) {
    rows.push(
      ['Threat Risk Score', String(report.threatResult.riskScore)],
      ['Threat Severity', report.threatResult.severity],
      ['Threat Spans Scanned', String(report.threatResult.spansExtracted)],
      ['Threat Decoded Payloads', String(report.threatResult.decodedSpanCount)],
      ['Threat Findings', String(report.threatResult.findingsCount)],
      ['Threat Capability Review Ran', String(report.threatResult.capabilityReviewed)],
    );
    report.threatResult.findings.forEach((f, i) => {
      rows.push(
        [`Threat Finding ${i + 1} — Rule`, `${f.ruleId} (${f.severity})`],
        [`Threat Finding ${i + 1} — Category`, f.category],
        [`Threat Finding ${i + 1} — What it does`, f.mechanism],
        [`Threat Finding ${i + 1} — What it touches`, f.targets.join(', ')],
        [`Threat Finding ${i + 1} — If this ran`, f.consequence],
        [`Threat Finding ${i + 1} — Mitigation`, f.mitigation],
        [`Threat Finding ${i + 1} — Source`, `${f.source} (confidence: ${f.confidence})`],
      );
    });
  }

  if (v3Report.killChain) {
    rows.push(
      ['Security Kill-Chains Detected', String(v3Report.killChain.chainsDetected)],
    );
    v3Report.killChain.chains.forEach((kc, i) => {
      rows.push(
        [`Kill-Chain ${i + 1} — Title`, `${kc.title} [${kc.severity}] (Score: ${kc.riskScore})`],
        [`Kill-Chain ${i + 1} — Stages`, kc.stages.join(' -> ')],
        [`Kill-Chain ${i + 1} — Description`, kc.description],
      );
    });
  }

  if (v3Report.plagiarism) {
    rows.push(
      ['Originality Score', `${v3Report.plagiarism.originalityScore}%`],
      ['Plagiarism Score', `${v3Report.plagiarism.plagiarismScore}%`],
      ['Highest Match Source', v3Report.plagiarism.highestMatchSource ?? 'None'],
      ['Highest Match Percent', `${v3Report.plagiarism.highestMatchPercent}%`],
      ['Shingle Matches Count', String(v3Report.plagiarism.shingleMatchCount)],
      ['Paraphrase Matches Count', String(v3Report.plagiarism.paraphraseCount)],
      ['Style Shift Anomalies Count', String(v3Report.plagiarism.styleShiftCount)],
      ['Orphan Citations Count', String(v3Report.plagiarism.orphanCitationCount)],
      ['Online Academic Hits Count', String(v3Report.plagiarism.onlineHitCount)],
    );
  }

  if (v3Report.attackBriefings) {
    v3Report.attackBriefings.forEach((b, i) => {
      rows.push(
        [`Attack Briefing ${i + 1} — Vector`, `${b.title} [${b.severity}] (${b.discipline})`],
        [`Attack Briefing ${i + 1} — Mechanism`, b.mechanism],
        [`Attack Briefing ${i + 1} — Consequence`, b.consequence],
        [`Attack Briefing ${i + 1} — Mitigation`, b.mitigation],
      );
    });
  }

  return rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}
export const exportAsCsv = exportCSV;

export function exportHtml(report: AnalysisReport | IntegrityReport): string {
  const v3 = report as AnalysisReport;
  let logoHref = '';
  try {
    logoHref = new URL('../../assets/AITextSense_B&W.png', import.meta.url).href;
  } catch {
    logoHref = '';
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="generator" content="${report.application}">
<title>${report.application} — Forensic Text Integrity Report</title>
<style>
  @page { margin: 20mm 15mm; size: A4; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; margin: 0; padding: 24px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
  .logo-img { height: 42px; object-fit: contain; }
  .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
  .subtitle { font-size: 13px; color: #64748b; margin: 0; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
  .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 4px; font-weight: 600; }
  .card-value { font-size: 15px; font-weight: 700; color: #0f172a; word-break: break-all; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
  .badge-danger { background: #fee2e2; color: #991b1b; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .badge-success { background: #dcfce7; color: #166534; }
  .table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  .table th, .table td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
  .table th { background: #f1f5f9; font-weight: 600; color: #334155; }
  .finding-item { border-left: 3px solid #ef4444; background: #fff5f5; padding: 10px 14px; margin-bottom: 8px; border-radius: 0 6px 6px 0; }
  .finding-title { font-weight: 700; font-size: 14px; color: #991b1b; margin-bottom: 4px; }
  .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print {
    body { padding: 0; }
    .header-logo { display: block !important; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1 class="title">${report.application}</h1>
    <p class="subtitle">Document Forensic Integrity, AI Safety & Originality Executive Report</p>
    <p class="subtitle" style="margin-top: 4px;">Generated: ${report.timestamp} · Engine Version: ${report.version}</p>
  </div>
  ${logoHref ? `<div class="header-logo"><img src="${logoHref}" class="logo-img" alt="AI TextSense" /></div>` : ''}
</div>

<div class="section">
  <div class="section-title">Cryptographic Verification & Hashes</div>
  <div class="grid">
    <div class="card">
      <div class="card-label">Original Document SHA-256</div>
      <div class="card-value" style="font-family: monospace; font-size: 12px;">${report.hashes.originalSha256}</div>
    </div>
    <div class="card">
      <div class="card-label">Cleaned Document SHA-256</div>
      <div class="card-value" style="font-family: monospace; font-size: 12px;">${report.hashes.cleanedSha256 ?? 'N/A (Unmodified)'}</div>
    </div>
    <div class="card">
      <div class="card-label">Document Size & Words</div>
      <div class="card-value">${report.textStats.words} words · ${report.textStats.originalChars} characters</div>
    </div>
  </div>
</div>

${v3.plagiarism ? `
<div class="section">
  <div class="section-title">Originality & Plagiarism Analysis (4-Mode Engine)</div>
  <div class="grid">
    <div class="card">
      <div class="card-label">Originality Score</div>
      <div class="card-value" style="color: ${v3.plagiarism.originalityScore >= 80 ? '#16a34a' : v3.plagiarism.originalityScore >= 50 ? '#d97706' : '#dc2626'};">
        ${v3.plagiarism.originalityScore}%
      </div>
    </div>
    <div class="card">
      <div class="card-label">Plagiarism Detected</div>
      <div class="card-value">${v3.plagiarism.plagiarismScore}%</div>
    </div>
    <div class="card">
      <div class="card-label">Highest Reference Match</div>
      <div class="card-value">${v3.plagiarism.highestMatchSource ? `${v3.plagiarism.highestMatchSource} (${v3.plagiarism.highestMatchPercent}%)` : 'None'}</div>
    </div>
    <div class="card">
      <div class="card-label">Semantic Paraphrases</div>
      <div class="card-value">${v3.plagiarism.paraphraseCount}</div>
    </div>
    <div class="card">
      <div class="card-label">Style-Shift Patchwriting</div>
      <div class="card-value">${v3.plagiarism.styleShiftCount}</div>
    </div>
    <div class="card">
      <div class="card-label">Orphan Citations</div>
      <div class="card-value">${v3.plagiarism.orphanCitationCount}</div>
    </div>
  </div>
</div>
` : ''}

${v3.footprintScrubReport ? `
<div class="section">
  <div class="section-title">AI Fingerprint Removal Suite Summary</div>
  <div class="grid">
    <div class="card">
      <div class="card-label">AI Score Before Scrub</div>
      <div class="card-value">${(v3.footprintScrubReport.beforeScore * 100).toFixed(1)}%</div>
    </div>
    <div class="card">
      <div class="card-label">AI Score After Scrub</div>
      <div class="card-value" style="color: #16a34a;">${(v3.footprintScrubReport.afterScore * 100).toFixed(1)}%</div>
    </div>
    <div class="card">
      <div class="card-label">LLM Buzzwords Removed</div>
      <div class="card-value">${v3.footprintScrubReport.llmWordsRemoved}</div>
    </div>
    <div class="card">
      <div class="card-label">Hedging Phrases Neutralized</div>
      <div class="card-value">${v3.footprintScrubReport.hedgingRemoved}</div>
    </div>
    <div class="card">
      <div class="card-label">Typographic Tells Scrubbed</div>
      <div class="card-value">${v3.footprintScrubReport.typographicFixed}</div>
    </div>
  </div>
</div>
` : ''}

${report.threatResult ? `
<div class="section">
  <div class="section-title">Payload & Threat Defense Analysis</div>
  <p><strong>Threat Severity:</strong> <span class="badge ${report.threatResult.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}">${report.threatResult.severity}</span> (Score ${report.threatResult.riskScore}/100)</p>
  ${report.threatResult.findings.map(f => `
    <div class="finding-item">
      <div class="finding-title">[${f.ruleId}] ${f.category} (${f.severity})</div>
      <p style="margin: 4px 0;"><strong>Mechanism:</strong> ${f.mechanism}</p>
      <p style="margin: 4px 0;"><strong>Consequence:</strong> ${f.consequence}</p>
      <p style="margin: 4px 0;"><strong>Mitigation:</strong> ${f.mitigation}</p>
    </div>
  `).join('')}
</div>
` : ''}

${v3.killChain ? `
<div class="section">
  <div class="section-title">Security Kill-Chain Correlator</div>
  ${v3.killChain.chains.map(c => `
    <div class="finding-item" style="border-left-color: #7c3aed; background: #faf5ff;">
      <div class="finding-title" style="color: #6b21a8;">${c.title} [${c.severity}] (Risk: ${c.riskScore}/100)</div>
      <p style="margin: 4px 0;"><strong>Attack Stages:</strong> ${c.stages.join(' &rarr; ')}</p>
      <p style="margin: 4px 0;">${c.description}</p>
    </div>
  `).join('')}
</div>
` : ''}

<div class="footer">
  ${report.application} · ${report.author} · ${report.copyright}<br>
  Proprietary Forensic Report. Verified against tamper and covert channel injection.
</div>
</body>
</html>`;
}
export const exportAsHtml = exportHtml;

export async function exportPDF(report: AnalysisReport | IntegrityReport): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - 16) {
      doc.addPage();
      y = 20;
    }
  };

  // Embed logo image if available
  try {
    const logoUrl = new URL('../../assets/AITextSense_B&W.png', import.meta.url).href;
    if (typeof Image !== 'undefined' || typeof (doc as any).addImage === 'function') {
      doc.addImage(logoUrl, 'PNG', pageW - 55, 12, 42, 14);
    }
  } catch {
    // Graceful fallback in headless Vitest / Node environments
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('AI TextSense — Text Integrity Report', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 8;

  doc.setFontSize(9);
  doc.text(`Author: ${report.author}   ${report.copyright}`, 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.text(`Generated: ${report.timestamp}   Version: ${report.version}`, 14, y);
  y += 11;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Cryptographic Hashes & Verification', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.setFontSize(8);
  doc.text(`Original SHA-256: ${report.hashes.originalSha256}`, 14, y);
  y += 5;
  if (report.hashes.cleanedSha256) {
    doc.text(`Cleaned SHA-256:  ${report.hashes.cleanedSha256}`, 14, y);
    y += 5;
  }
  y += 4;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Text Stats', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.setFontSize(9);
  doc.text(`Original: ${report.textStats.originalChars} chars, ${report.textStats.words} words`, 14, y);
  y += 5;
  if (report.textStats.cleanedChars !== null) {
    doc.text(`Cleaned:  ${report.textStats.cleanedChars} chars`, 14, y);
    y += 5;
  }
  y += 6;

  const v3 = report as AnalysisReport;

  // Plagiarism & Originality Section
  if (v3.plagiarism) {
    ensureSpace(45);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Plagiarism & Originality Suite (4-Mode Engine)', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.setFontSize(9);
    doc.text(`Originality Score: ${v3.plagiarism.originalityScore}%   Plagiarism Detected: ${v3.plagiarism.plagiarismScore}%`, 14, y);
    y += 5;
    doc.text(`Highest Reference Match: ${v3.plagiarism.highestMatchSource ? `${v3.plagiarism.highestMatchSource} (${v3.plagiarism.highestMatchPercent}%)` : 'None'}`, 14, y);
    y += 5;
    doc.text(`Shingle Matches: ${v3.plagiarism.shingleMatchCount}   Paraphrases: ${v3.plagiarism.paraphraseCount}   Style-Shift Anomalies: ${v3.plagiarism.styleShiftCount}`, 14, y);
    y += 5;
    doc.text(`Orphan Citations: ${v3.plagiarism.orphanCitationCount}   Online Verification Hits: ${v3.plagiarism.onlineHitCount}`, 14, y);
    y += 8;
  }

  // AI Footprint Removal Section
  if (v3.footprintScrubReport) {
    ensureSpace(35);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Fingerprint Removal Summary', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.setFontSize(9);
    doc.text(`Detectability Score: ${(v3.footprintScrubReport.beforeScore * 100).toFixed(1)}% -> ${(v3.footprintScrubReport.afterScore * 100).toFixed(1)}%`, 14, y);
    y += 5;
    doc.text(`LLM Words Removed: ${v3.footprintScrubReport.llmWordsRemoved}   Hedging Neutralized: ${v3.footprintScrubReport.hedgingRemoved}`, 14, y);
    y += 5;
    doc.text(`Templates Replaced: ${v3.footprintScrubReport.templatesReplaced}   Typographic Tells Scrubbed: ${v3.footprintScrubReport.typographicFixed}`, 14, y);
    y += 8;
  }

  if (report.scanResult) {
    ensureSpace(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Scan Results', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.setFontSize(9);
    doc.text(`Findings: ${report.scanResult.findings.length}   Stego patterns: ${report.scanResult.stegoPatterns.length}   Bidi issues: ${report.scanResult.bidiIssues.length}`, 14, y);
    y += 8;
  }

  if (report.watermarkResult) {
    ensureSpace(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Watermark Analysis', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.setFontSize(9);
    doc.text(`Method: ${report.watermarkResult.method}   Z-Score: ${report.watermarkResult.zScore.toFixed(4)}   P-Value: ${report.watermarkResult.pValue.toFixed(6)}`, 14, y);
    y += 5;
    doc.text(`Significant: ${report.watermarkResult.isSignificant ? 'Yes' : 'No'}   Green List Ratio: ${report.watermarkResult.greenListRatio.toFixed(4)}`, 14, y);
    y += 8;
  }

  if (report.footprintResult && !v3.footprintScrubReport) {
    ensureSpace(25);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Footprint Analysis', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.setFontSize(9);
    doc.text(`Score: ${report.footprintResult.overallScore.toFixed(4)}   Favored Words: ${report.footprintResult.llmFavoredWords.join(', ')}`, 14, y);
    y += 8;
  }

  if (report.injectionResult) {
    ensureSpace(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Prompt Injection Analysis', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.setFontSize(9);
    doc.text(`Severity: ${report.injectionResult.severity} (score ${report.injectionResult.riskScore}/100)`, 14, y);
    y += 5;
    doc.text(`Decoded payloads: ${report.injectionResult.decodedPayloadCount}, findings: ${report.injectionResult.findingsCount}, hidden tokens: ${report.injectionResult.hiddenTokensCount}`, 14, y);
    y += 8;
  }

  if (report.threatResult) {
    ensureSpace(40);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Payload & Threat Analysis', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.setFontSize(9);
    doc.text(`Severity: ${report.threatResult.severity} (score ${report.threatResult.riskScore}/100)`, 14, y);
    y += 5;
    doc.text(`Spans scanned: ${report.threatResult.spansExtracted}, decoded payloads: ${report.threatResult.decodedSpanCount}, AI capability review: ${report.threatResult.capabilityReviewed ? 'yes' : 'no'}`, 14, y);
    y += 8;

    for (const f of report.threatResult.findings) {
      ensureSpace(45);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${f.severity} — ${f.category} [${f.ruleId}]`, 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      doc.setFontSize(8.5);
      const printWrapped = (label: string, text: string) => {
        const wrapped = doc.splitTextToSize(`${label}: ${text}`, 182);
        for (const line of wrapped) {
          ensureSpace(6);
          doc.text(line, 16, y);
          y += 4.2;
        }
      };
      printWrapped('What it does', f.mechanism);
      printWrapped('What it touches', f.targets.join(', '));
      printWrapped('If this ran', f.consequence);
      if (f.context) printWrapped('Why it appears here', f.context);
      printWrapped('Mitigation', f.mitigation);
      doc.setFontSize(7.5);
      doc.setTextColor(130);
      doc.text(`Source: ${f.source === 'static-signature' ? 'offline rule match' : 'AI capability review'} (confidence: ${f.confidence})`, 16, y);
      doc.setTextColor(0);
      y += 6;

      if (f.aiDeepDive) {
        ensureSpace(20);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`AI deep-dive (confidence: ${f.aiDeepDive.confidence}):`, 16, y);
        doc.setFont('helvetica', 'normal');
        y += 4.5;
        printWrapped('  What it does', f.aiDeepDive.mechanism);
        printWrapped('  If this ran', f.aiDeepDive.consequence);
        printWrapped('  What to do', f.aiDeepDive.mitigation);
      }
      y += 4;
    }
  }

  // Security Kill-Chains
  if (v3.killChain && v3.killChain.chains.length > 0) {
    ensureSpace(35);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Security Kill-Chain Correlator', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;

    for (const c of v3.killChain.chains) {
      ensureSpace(25);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${c.title} [${c.severity}] (Risk: ${c.riskScore}/100)`, 14, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
      doc.setFontSize(8.5);
      doc.text(`Stages: ${c.stages.join(' -> ')}`, 16, y);
      y += 4.5;
      const wrapped = doc.splitTextToSize(c.description, 180);
      for (const line of wrapped) {
        doc.text(line, 16, y);
        y += 4.2;
      }
      y += 3;
    }
  }

  // Copyright footer on final page
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`${report.application} — ${report.copyright}`, 14, pageH - 8);
  doc.setTextColor(0);

  return doc.output('blob');
}
export const exportAsPdf = exportPDF;

/**
 * Export full executive forensic report as a Word (.docx) document
 */
export async function exportReportDOCX(report: AnalysisReport | IntegrityReport): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const v3 = report as AnalysisReport;
  const children: Array<InstanceType<typeof Paragraph>> = [];

  // Title & Metadata
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: `${report.application} — Forensic Report`, bold: true, size: 36 })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Generated: ${report.timestamp}  |  Version: ${report.version}\nAuthor: ${report.author}  |  ${report.copyright}`, italics: true, size: 20 }),
      ],
    }),
    new Paragraph({ text: '' }),
  );

  // Section 1: Hashes & Document Stats
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '1. Document Verification & Hashes', bold: true })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Original SHA-256: ${report.hashes.originalSha256}\n`, font: 'Courier New' }),
        new TextRun({ text: `Cleaned SHA-256:  ${report.hashes.cleanedSha256 ?? 'N/A (Unmodified)'}\n`, font: 'Courier New' }),
        new TextRun({ text: `Document Size: ${report.textStats.words} words, ${report.textStats.originalChars} characters\n` }),
      ],
    }),
    new Paragraph({ text: '' }),
  );

  // Section 2: Plagiarism & Originality Suite
  if (v3.plagiarism) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: '2. Plagiarism & Originality Analysis', bold: true })],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Originality Score: ${v3.plagiarism.originalityScore}%  |  Plagiarism Detected: ${v3.plagiarism.plagiarismScore}%\n`, bold: true }),
          new TextRun({ text: `Highest Match Source: ${v3.plagiarism.highestMatchSource ?? 'None'} (${v3.plagiarism.highestMatchPercent}%)\n` }),
          new TextRun({ text: `Shingle Matches: ${v3.plagiarism.shingleMatchCount}  |  Semantic Paraphrases: ${v3.plagiarism.paraphraseCount}\n` }),
          new TextRun({ text: `Intrinsic Style Shifts: ${v3.plagiarism.styleShiftCount}  |  Orphan Citations: ${v3.plagiarism.orphanCitationCount}  |  Online Hits: ${v3.plagiarism.onlineHitCount}\n` }),
        ],
      }),
      new Paragraph({ text: '' }),
    );
  }

  // Section 3: AI Fingerprint Removal
  if (v3.footprintScrubReport) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: '3. AI Fingerprint Removal Suite', bold: true })],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Detectability: ${(v3.footprintScrubReport.beforeScore * 100).toFixed(1)}% -> ${(v3.footprintScrubReport.afterScore * 100).toFixed(1)}%\n`, bold: true }),
          new TextRun({ text: `LLM Words Removed: ${v3.footprintScrubReport.llmWordsRemoved}  |  Hedging Neutralized: ${v3.footprintScrubReport.hedgingRemoved}\n` }),
          new TextRun({ text: `Templates Replaced: ${v3.footprintScrubReport.templatesReplaced}  |  Typographic Tells Scrubbed: ${v3.footprintScrubReport.typographicFixed}\n` }),
        ],
      }),
      new Paragraph({ text: '' }),
    );
  }

  // Section 4: AI Safety, Injection & Threat Defense
  if (report.threatResult || report.injectionResult || v3.killChain) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: '4. AI Safety & Threat Defense Findings', bold: true })],
      }),
    );

    if (report.threatResult) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Threat Severity: ${report.threatResult.severity} (Score ${report.threatResult.riskScore}/100)\n`, bold: true }),
            new TextRun({ text: `Spans Scanned: ${report.threatResult.spansExtracted}  |  Decoded Payloads: ${report.threatResult.decodedSpanCount}\n` }),
          ],
        }),
      );

      for (const f of report.threatResult.findings) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[${f.ruleId}] ${f.category} (${f.severity})`, bold: true }),
              new TextRun({ text: `\n• What it does: ${f.mechanism}` }),
              new TextRun({ text: `\n• What it touches: ${f.targets.join(', ')}` }),
              new TextRun({ text: `\n• If this ran: ${f.consequence}` }),
              new TextRun({ text: `\n• Mitigation: ${f.mitigation}\n` }),
            ],
          }),
        );
      }
    }

    if (v3.killChain && v3.killChain.chains.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Security Kill-Chains (${v3.killChain.chainsDetected} detected):`, bold: true })],
        }),
      );
      for (const c of v3.killChain.chains) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${c.title} [${c.severity}] (Risk: ${c.riskScore}/100)\n`, bold: true }),
              new TextRun({ text: `Stages: ${c.stages.join(' -> ')}\n` }),
              new TextRun({ text: `${c.description}\n` }),
            ],
          }),
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return await Packer.toBlob(doc);
}
export const exportReportAsDocx = exportReportDOCX;

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
