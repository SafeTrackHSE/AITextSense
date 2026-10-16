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

const I18N = {
  en: {
    visualReport: 'Visual Executive Report',
    rawJson: 'Raw JSON',
    exportPdf: 'Export PDF',
    exportDocx: 'Export Word (DOCX)',
    exportCsv: 'Export CSV',
    exportJson: 'Export JSON',
    exporting: 'Exporting...',
    executiveTitle: 'Forensic Executive Report',
    executiveSubtitle: 'Executive Document Integrity & Forensic Security Audit',
    appVersion: 'App Version:',
    generated: 'Generated:',
    sha256: 'SHA-256:',
    overallRisk: 'Overall Risk Verdict',
    wordCharCount: 'Word / Char Count',
    chars: 'chars',
    aiFingerprintLevel: 'AI Fingerprint Level',
    notAnalyzed: 'Not Analyzed',
    plagiarismOriginality: 'Plagiarism Originality',
    original: 'Original',
    scannerTitle: 'Unicode & Steganography Scanner',
    anomalies: 'Anomalies',
    clean: 'Clean',
    stegoPatterns: 'Stego Patterns:',
    bidiIssues: 'Bidi Issues:',
    mixedScript: 'Mixed-Script Runs:',
    injectionTitle: 'Prompt Injection & Covert Channels',
    riskScore: 'Risk Score:',
    decodedPayloads: 'Decoded Hidden Payloads:',
    findings: 'Findings:',
    noInjection: 'No prompt injection signatures or covert tags identified.',
    threatTitle: 'Threat Analysis & Kill-Chain Defense',
    risk: 'Risk:',
    payloads: 'Payloads:',
    spans: 'Spans:',
    decoded: 'Decoded:',
    chains: 'Chains:',
    noThreats: 'No shell execution commands or destructive payload signatures detected.',
    watermarkTitle: 'Statistical Token Watermarking',
    watermarkDetected: 'Watermark Detected',
    noSignal: 'No Signal',
    zScore: 'Statistical z-score:',
    pValue: 'p-value:',
    watermarkNotPerformed: 'Statistical watermark analysis not performed on document.',
    fingerprintRemovalTitle: 'AI Fingerprint Removal Breakdown',
    transforms: 'Transforms',
    before: 'Before:',
    after: 'After:',
    llmWordsRemoved: 'LLM Words Removed:',
    hedgingRemoved: 'Hedging:',
    typographicTells: 'Typographic Tells:',
    stylometricScore: 'Stylometric Score:',
    llmWords: 'LLM Words:',
    fingerprintNotRun: 'AI Fingerprint audit not run.',
    plagiarismTitle: 'Plagiarism & Originality Suite',
    plagiarismScore: 'Plagiarism Score:',
    topMatch: 'Top Match:',
    paraphrases: 'Paraphrases:',
    styleShifts: 'Style Shifts:',
    noReferenceComparison: 'No reference comparison performed.',
    none: 'None',
  },
  es: {
    visualReport: 'Informe ejecutivo visual',
    rawJson: 'JSON sin procesar',
    exportPdf: 'Exportar PDF',
    exportDocx: 'Exportar Word (DOCX)',
    exportCsv: 'Exportar CSV',
    exportJson: 'Exportar JSON',
    exporting: 'Exportando...',
    executiveTitle: 'Informe ejecutivo forense',
    executiveSubtitle: 'Auditoría forense de seguridad e integridad documental ejecutiva',
    appVersion: 'Versión:',
    generated: 'Generado:',
    sha256: 'SHA-256:',
    overallRisk: 'Veredicto de riesgo global',
    wordCharCount: 'Recuento de palabras / caracteres',
    chars: 'caracteres',
    aiFingerprintLevel: 'Nivel de huella de IA',
    notAnalyzed: 'No analizado',
    plagiarismOriginality: 'Originalidad de plagio',
    original: 'Original',
    scannerTitle: 'Escáner Unicode y de esteganografía',
    anomalies: 'Anomalías',
    clean: 'Limpio',
    stegoPatterns: 'Patrones de esteganografía:',
    bidiIssues: 'Problemas Bidi:',
    mixedScript: 'Fragmentos de alfabeto mixto:',
    injectionTitle: 'Inyección de prompts y canales encubiertos',
    riskScore: 'Puntuación de riesgo:',
    decodedPayloads: 'Cargas útiles decodificadas:',
    findings: 'Hallazgos:',
    noInjection: 'No se identificaron firmas de inyección de prompts ni etiquetas encubiertas.',
    threatTitle: 'Análisis de amenazas y defensa de cadena de ataque',
    risk: 'Riesgo:',
    payloads: 'Cargas:',
    spans: 'Fragmentos:',
    decoded: 'Decodificados:',
    chains: 'Cadenas:',
    noThreats: 'No se detectaron comandos shell ni firmas destructivas.',
    watermarkTitle: 'Marca de agua estadística de tokens',
    watermarkDetected: 'Marca de agua detectada',
    noSignal: 'Sin señal',
    zScore: 'Puntuación z estadística:',
    pValue: 'Valor p:',
    watermarkNotPerformed: 'No se realizó análisis estadístico de marca de agua en el documento.',
    fingerprintRemovalTitle: 'Desglose de eliminación de huellas de IA',
    transforms: 'Transformaciones',
    before: 'Antes:',
    after: 'Después:',
    llmWordsRemoved: 'Palabras de LLM eliminadas:',
    hedgingRemoved: 'Atenuaciones:',
    typographicTells: 'Señales tipográficas:',
    stylometricScore: 'Puntaje estilométrico:',
    llmWords: 'Palabras de LLM:',
    fingerprintNotRun: 'Auditoría de huellas de IA no ejecutada.',
    plagiarismTitle: 'Módulo de plagio y originalidad',
    plagiarismScore: 'Puntuación de plagio:',
    topMatch: 'Mayor coincidencia:',
    paraphrases: 'Paráfrasis:',
    styleShifts: 'Cambios de estilo:',
    noReferenceComparison: 'No se realizó comparación con referencias.',
    none: 'Ninguna',
  },
  fr: {
    visualReport: 'Rapport exécutif visuel',
    rawJson: 'JSON brut',
    exportPdf: 'Exporter en PDF',
    exportDocx: 'Exporter en Word (DOCX)',
    exportCsv: 'Exporter en CSV',
    exportJson: 'Exporter en JSON',
    exporting: 'Exportation en cours...',
    executiveTitle: 'Rapport exécutif médico-légal',
    executiveSubtitle: 'Audit de sécurité et d\'intégrité documentaire exécutif',
    appVersion: 'Version :',
    generated: 'Généré le :',
    sha256: 'SHA-256 :',
    overallRisk: 'Verdict de risque global',
    wordCharCount: 'Nombre de mots / caractères',
    chars: 'caractères',
    aiFingerprintLevel: 'Niveau d\'empreinte IA',
    notAnalyzed: 'Non analysé',
    plagiarismOriginality: 'Originalité et plagiat',
    original: 'Original',
    scannerTitle: 'Scanner Unicode et stéganographie',
    anomalies: 'Anomalies',
    clean: 'Propre',
    stegoPatterns: 'Motifs stéganographiques :',
    bidiIssues: 'Problèmes Bidi :',
    mixedScript: 'Passages en alphabets mixtes :',
    injectionTitle: 'Injections de prompts et canaux cachés',
    riskScore: 'Score de risque :',
    decodedPayloads: 'Charges décodées :',
    findings: 'Découvertes :',
    noInjection: 'Aucune signature d\'injection ni balise cachée identifiée.',
    threatTitle: 'Analyse des menaces et défense kill-chain',
    risk: 'Risque :',
    payloads: 'Charges :',
    spans: 'Segments :',
    decoded: 'Décodés :',
    chains: 'Chaînes :',
    noThreats: 'Aucune commande shell ni charge destructrice détectée.',
    watermarkTitle: 'Filigrane statistique de jetons',
    watermarkDetected: 'Filigrane détecté',
    noSignal: 'Aucun signal',
    zScore: 'Score z statistique :',
    pValue: 'Valeur p :',
    watermarkNotPerformed: 'Analyse de filigrane non effectuée sur ce document.',
    fingerprintRemovalTitle: 'Nettoyage des empreintes d\'IA',
    transforms: 'Transformations',
    before: 'Avant :',
    after: 'Après :',
    llmWordsRemoved: 'Mots de LLM supprimés :',
    hedgingRemoved: 'Atténuations :',
    typographicTells: 'Signes typographiques :',
    stylometricScore: 'Score stylométrique :',
    llmWords: 'Mots de LLM :',
    fingerprintNotRun: 'Audit d\'empreinte d\'IA non exécuté.',
    plagiarismTitle: 'Suite de plagiat et d\'originalité',
    plagiarismScore: 'Score de plagiat :',
    topMatch: 'Plus forte correspondance :',
    paraphrases: 'Paraphrases :',
    styleShifts: 'Ruptures de style :',
    noReferenceComparison: 'Aucune comparaison de référence effectuée.',
    none: 'Aucune',
  },
  'pt-BR': {
    visualReport: 'Relatório Executivo Visual',
    rawJson: 'JSON Bruto',
    exportPdf: 'Exportar PDF',
    exportDocx: 'Exportar Word (DOCX)',
    exportCsv: 'Exportar CSV',
    exportJson: 'Exportar JSON',
    exporting: 'Exportando...',
    executiveTitle: 'Relatório Executivo Forense',
    executiveSubtitle: 'Auditoria Executiva de Integridade Documental e Segurança Forense',
    appVersion: 'Versão:',
    generated: 'Gerado em:',
    sha256: 'SHA-256:',
    overallRisk: 'Veredito de Risco Global',
    wordCharCount: 'Contagem de Palavras / Caracteres',
    chars: 'caracteres',
    aiFingerprintLevel: 'Nível de Pegada de IA',
    notAnalyzed: 'Não Analisado',
    plagiarismOriginality: 'Originalidade de Plágio',
    original: 'Original',
    scannerTitle: 'Scanner Unicode e Esteganografia',
    anomalies: 'Anomalias',
    clean: 'Limpo',
    stegoPatterns: 'Padrões Esteganográficos:',
    bidiIssues: 'Problemas Bidi:',
    mixedScript: 'Trechos de Alfabeto Misto:',
    injectionTitle: 'Injeção de Prompts e Canais Ocultos',
    riskScore: 'Pontuação de Risco:',
    decodedPayloads: 'Payloads Decodificados:',
    findings: 'Descobertas:',
    noInjection: 'Nenhuma assinatura de injeção ou tag oculta identificada.',
    threatTitle: 'Análise de Ameaças e Defesa de Kill-Chain',
    risk: 'Risco:',
    payloads: 'Payloads:',
    spans: 'Trechos:',
    decoded: 'Decodificados:',
    chains: 'Cadeias:',
    noThreats: 'Nenhum comando shell ou assinatura destrutiva detectada.',
    watermarkTitle: 'Marca d\'Água Estatística de Tokens',
    watermarkDetected: 'Marca d\'Água Detectada',
    noSignal: 'Sem Sinal',
    zScore: 'Escore z estatístico:',
    pValue: 'Valor p:',
    watermarkNotPerformed: 'Análise de marca d\'água não realizada no documento.',
    fingerprintRemovalTitle: 'Detalhamento de Limpeza de Pegadas de IA',
    transforms: 'Transformações',
    before: 'Antes:',
    after: 'Depois:',
    llmWordsRemoved: 'Palavras de LLM Removidas:',
    hedgingRemoved: 'Atenuações:',
    typographicTells: 'Sinais Tipográficos:',
    stylometricScore: 'Pontuação Estilométrica:',
    llmWords: 'Palavras de LLM:',
    fingerprintNotRun: 'Auditoria de pegadas de IA não executada.',
    plagiarismTitle: 'Módulo de Plágio e Originalidade',
    plagiarismScore: 'Pontuação de Plágio:',
    topMatch: 'Maior Correspondência:',
    paraphrases: 'Paráfrases:',
    styleShifts: 'Desvios de Estilo:',
    noReferenceComparison: 'Nenhuma comparação de referência realizada.',
    none: 'Nenhuma',
  },
  it: {
    visualReport: 'Report Esecutivo Visivo',
    rawJson: 'JSON Grezzo',
    exportPdf: 'Esporta PDF',
    exportDocx: 'Esporta Word (DOCX)',
    exportCsv: 'Esporta CSV',
    exportJson: 'Esporta JSON',
    exporting: 'Esportazione...',
    executiveTitle: 'Report Esecutivo Forense',
    executiveSubtitle: 'Audit Esecutivo di Integrità Documentale e Sicurezza Forense',
    appVersion: 'Versione:',
    generated: 'Generato il:',
    sha256: 'SHA-256:',
    overallRisk: 'Verdetto di Rischio Globale',
    wordCharCount: 'Conteggio Parole / Caratteri',
    chars: 'caratteri',
    aiFingerprintLevel: 'Livello Impronta IA',
    notAnalyzed: 'Non Analizzato',
    plagiarismOriginality: 'Originalità Plagio',
    original: 'Originale',
    scannerTitle: 'Scanner Unicode e Steganografia',
    anomalies: 'Anomalie',
    clean: 'Pulito',
    stegoPatterns: 'Pattern Steganografici:',
    bidiIssues: 'Problemi Bidi:',
    mixedScript: 'Passaggi Alfabeto Misto:',
    injectionTitle: 'Iniezione Prompt e Canali Nascosti',
    riskScore: 'Punteggio Rischio:',
    decodedPayloads: 'Payload Decodificati:',
    findings: 'Rilevamenti:',
    noInjection: 'Nessuna firma di iniezione prompt o tag nascosto rilevato.',
    threatTitle: 'Analisi Minacce e Difesa Kill-Chain',
    risk: 'Rischio:',
    payloads: 'Payload:',
    spans: 'Segmenti:',
    decoded: 'Decodificati:',
    chains: 'Catene:',
    noThreats: 'Nessun comando shell o firma distruttiva rilevata.',
    watermarkTitle: 'Watermark Statistico di Token',
    watermarkDetected: 'Watermark Rilevato',
    noSignal: 'Nessun Segnale',
    zScore: 'Punteggio z statistico:',
    pValue: 'Valore p:',
    watermarkNotPerformed: 'Analisi statistica del watermark non eseguita sul documento.',
    fingerprintRemovalTitle: 'Dettaglio Rimozione Impronte IA',
    transforms: 'Trasformazioni',
    before: 'Prima:',
    after: 'Dopo:',
    llmWordsRemoved: 'Parole LLM Rimosse:',
    hedgingRemoved: 'Espressioni Dubitative:',
    typographicTells: 'Segnali Tipografici:',
    stylometricScore: 'Punteggio Stilometrico:',
    llmWords: 'Parole LLM:',
    fingerprintNotRun: 'Audit impronte IA non eseguito.',
    plagiarismTitle: 'Suite Plagio e Originalità',
    plagiarismScore: 'Punteggio Plagio:',
    topMatch: 'Miglior Corrispondenza:',
    paraphrases: 'Parafrasi:',
    styleShifts: 'Variazioni di Stile:',
    noReferenceComparison: 'Nessun confronto con riferimenti eseguito.',
    none: 'Nessuna',
  },
};

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
    uiLanguage,
  } = useStore();

  const plagiarismResult = useStore((s: any) => s.plagiarismResult);
  const footprintScrubReport = useStore((s: any) => s.footprintScrubReport);

  const t = useT();
  const dict = I18N[(uiLanguage as keyof typeof I18N) ?? 'en'] ?? I18N.en;

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

  const scanFindingsCount = report?.scanResult ? (report.scanResult.findings?.length ?? 0) : (scanResult?.findings?.length ?? 0);
  const scanStegoCount = report?.scanResult ? (report.scanResult.stegoPatterns?.length ?? 0) : (scanResult?.stegoPatterns?.length ?? 0);
  const scanBidiCount = report?.scanResult ? (report.scanResult.bidiIssues?.length ?? 0) : (scanResult?.bidiIssues?.length ?? 0);
  const scanMixedCount = report?.scanResult ? (report.scanResult.mixedScriptRuns?.length ?? 0) : (scanResult?.mixedScriptRuns?.length ?? 0);

  const injSeverity = report?.injectionResult?.severity ?? injectionResult?.severity ?? 'CLEAN';
  const injRiskScore = report?.injectionResult?.riskScore ?? injectionResult?.riskScore ?? 0;
  const injPayloadCount = report?.injectionResult?.decodedPayloadCount ?? (Array.isArray(injectionResult?.decodedPayloads) ? injectionResult.decodedPayloads.length : 0);
  const injFindingsCount = report?.injectionResult?.findingsCount ?? (Array.isArray(injectionResult?.findings) ? injectionResult.findings.length : 0);

  const threatSeverity = report?.threatResult?.severity ?? threatResult?.severity ?? 'CLEAN';
  const threatRiskScore = report?.threatResult?.riskScore ?? threatResult?.riskScore ?? 0;
  const threatFindingsCount = report?.threatResult?.findingsCount ?? (Array.isArray(threatResult?.findings) ? threatResult.findings.length : 0);
  const threatSpansCount = report?.threatResult?.spansExtracted ?? threatResult?.spansExtracted ?? 0;
  const threatDecodedCount = report?.threatResult?.decodedSpanCount ?? threatResult?.decodedSpanCount ?? 0;
  const killChainCount = (report as any)?.killChain?.chainsDetected ?? 0;

  const wmIsSignificant = report?.watermarkResult?.isSignificant ?? watermarkResult?.isSignificant ?? false;
  const wmZScore = report?.watermarkResult?.zScore ?? watermarkResult?.zScore ?? 0;
  const wmPValue = report?.watermarkResult?.pValue ?? watermarkResult?.pValue ?? 1;

  const scrubData = (report as any)?.footprintScrubReport ?? footprintScrubReport;
  const plagiarismData = (report as any)?.plagiarism ?? plagiarismResult;

  const originalSha256 = report?.hashes?.originalSha256 ? report.hashes.originalSha256.slice(0, 16) : '...';
  const originalCharsCount = report?.textStats?.originalChars ?? originalText.length;
  const reportVersion = report?.version ?? '3.0.0';

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
        <div className="flex bg-panel dark:bg-panel-dark rounded-lg p-0.5 border border-border dark:border-border-dark text-xs">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'visual'
                ? 'bg-accent text-white font-semibold'
                : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink'
            }`}
          >
            {dict.visualReport}
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'json'
                ? 'bg-accent text-white font-semibold'
                : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink'
            }`}
          >
            {dict.rawJson}
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
            {isExportingPdf ? dict.exporting : dict.exportPdf}
          </button>

          <button
            onClick={handleExportDOCX}
            disabled={!report || isExportingDocx}
            className="btn-ghost text-xs font-medium"
            title="Export forensic report as Microsoft Word (.docx)"
          >
            {isExportingDocx ? dict.exporting : dict.exportDocx}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!report}
            className="btn-ghost text-xs"
            title="Export summary metrics as CSV"
          >
            {dict.exportCsv}
          </button>

          <button
            onClick={handleExportJSON}
            disabled={!report}
            className="btn-ghost text-xs"
            title="Export machine-readable JSON"
          >
            {dict.exportJson}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {!report ? (
          <div className="illustration-box h-full my-auto space-y-3">
            <svg
              className="w-16 h-16 text-accent/60 animate-pulse-subtle"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="12" y="8" width="40" height="48" rx="6" opacity="0.25" fill="currentColor" />
              <rect x="12" y="8" width="40" height="48" rx="6" />
              <circle cx="32" cy="24" r="8" />
              <path d="M22 40h20M22 46h14" />
              <path d="M32 20l2 3h3l-2.5 2 1 3-3.5-2-3.5 2 1-3-2.5-2h3z" fill="currentColor" />
            </svg>
            <h3 className="text-sm font-bold text-ink dark:text-ink-dark">
              {dict.executiveTitle}
            </h3>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted max-w-sm">{t('report.empty')}</p>
          </div>
        ) : viewMode === 'json' ? (
          <pre className="text-xs font-mono whitespace-pre-wrap bg-panel dark:bg-panel-dark p-4 rounded-xl border border-border dark:border-border-dark overflow-x-auto select-text leading-relaxed">
            {JSON.stringify(report, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto pb-6">
            {/* Executive Report Brand Header */}
            <div className="p-5 rounded-2xl border border-border dark:border-border-dark bg-gradient-to-br from-panel via-surface to-panel dark:from-panel-dark dark:via-surface-dark dark:to-panel-dark shadow-sm flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1.5">
                <img
                  src={logoHorizontal}
                  alt="AI TextSense"
                  className="h-9 w-auto object-contain dark:brightness-110"
                />
                <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted font-medium">
                  {dict.executiveSubtitle}
                </div>
              </div>

              <div className="text-right text-[11px] space-y-0.5 font-mono text-ink-muted dark:text-ink-dark-muted">
                <div>
                  <span className="font-semibold text-ink dark:text-ink-dark">{dict.appVersion} </span>
                  v{reportVersion}
                </div>
                <div>
                  <span className="font-semibold text-ink dark:text-ink-dark">{dict.generated} </span>
                  {new Date(report.timestamp).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold text-ink dark:text-ink-dark">{dict.sha256} </span>
                  {originalSha256}...
                </div>
              </div>
            </div>

            {/* Overall Risk & Forensic Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted mb-1">
                  {dict.overallRisk}
                </div>
                <div>
                  <span className={severityBadgeClass(overallRisk)}>
                    {overallRisk}
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted mb-1">
                  {dict.wordCharCount}
                </div>
                <div className="stat-value text-base font-bold text-ink dark:text-ink-dark">
                  {originalCharsCount} {dict.chars}
                </div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted mb-1">
                  {dict.aiFingerprintLevel}
                </div>
                <div className="stat-value text-base font-bold text-ink dark:text-ink-dark">
                  {report.footprintResult ? `${Math.round(report.footprintResult.overallScore * 100)}%` : (footprintAnalysis ? `${Math.round(footprintAnalysis.overallScore * 100)}%` : dict.notAnalyzed)}
                </div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted mb-1">
                  {dict.plagiarismOriginality}
                </div>
                <div className="stat-value text-base font-bold text-success dark:text-emerald-400">
                  {plagiarismData ? `${plagiarismData.originalityScore ?? 100}%` : '100%'}
                </div>
              </div>
            </div>

            {/* Discipline Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1. Scanner Card */}
              <div className="panel-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">◈</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      {dict.scannerTitle}
                    </h4>
                  </div>
                  <span className={`badge ${scanFindingsCount > 0 ? 'badge-danger' : 'badge-success'}`}>
                    {scanFindingsCount > 0 ? `${scanFindingsCount} ${dict.anomalies}` : dict.clean}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  {dict.stegoPatterns} {scanStegoCount} · {dict.bidiIssues} {scanBidiCount} · {dict.mixedScript} {scanMixedCount}
                </p>
              </div>

              {/* 2. Prompt Injection Card */}
              <div className="panel-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⛨</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      {dict.injectionTitle}
                    </h4>
                  </div>
                  <span className={severityBadgeClass(injSeverity)}>
                    {injSeverity}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  {injPayloadCount > 0 || injFindingsCount > 0
                    ? `${dict.riskScore} ${injRiskScore}/100 · ${dict.decodedPayloads} ${injPayloadCount} · ${dict.findings} ${injFindingsCount}`
                    : dict.noInjection}
                </p>
              </div>

              {/* 3. Threat & Kill-Chain Defense Card */}
              <div className="panel-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">☠</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      {dict.threatTitle}
                    </h4>
                  </div>
                  <span className={severityBadgeClass(threatSeverity)}>
                    {threatSeverity}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  {threatFindingsCount > 0
                    ? `${dict.risk} ${threatRiskScore}/100 · ${dict.payloads} ${threatFindingsCount} · ${dict.spans} ${threatSpansCount} · ${dict.decoded} ${threatDecodedCount} · ${dict.chains} ${killChainCount}`
                    : dict.noThreats}
                </p>
              </div>

              {/* 4. Watermarks Card */}
              <div className="panel-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⊕</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      {dict.watermarkTitle}
                    </h4>
                  </div>
                  <span className={`badge ${wmIsSignificant ? 'badge-danger' : 'badge-success'}`}>
                    {wmIsSignificant ? dict.watermarkDetected : dict.noSignal}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  {report.watermarkResult || watermarkResult
                    ? `${dict.zScore} ${wmZScore.toFixed(2)} · ${dict.pValue} ${wmPValue < 0.0001 ? '< 0.0001' : wmPValue.toFixed(4)}`
                    : dict.watermarkNotPerformed}
                </p>
              </div>

              {/* 5. AI Fingerprint Removal Suite Card */}
              <div className="panel-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⊗</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      {dict.fingerprintRemovalTitle}
                    </h4>
                  </div>
                  <span className="badge-neutral font-mono text-[10px]">
                    {scrubData?.transformsApplied ?? (Array.isArray(footprintRemoval?.transforms) ? footprintRemoval.transforms.length : 0)} {dict.transforms}
                  </span>
                </div>
                <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted space-y-1">
                  {scrubData ? (
                    <div>
                      {dict.before} <b>{Math.round((scrubData.beforeScore ?? 1) * 100)}%</b> → {dict.after} <b className="text-success">{Math.round((scrubData.afterScore ?? 0) * 100)}%</b>
                      <div className="mt-1 text-[10px] text-ink-muted">
                        {dict.llmWordsRemoved} {scrubData.llmWordsRemoved ?? 0} · {dict.hedgingRemoved} {scrubData.hedgingRemoved ?? 0} · {dict.typographicTells} {scrubData.typographicFixed ?? 0}
                      </div>
                    </div>
                  ) : report.footprintResult ? (
                    `${dict.stylometricScore} ${Math.round(report.footprintResult.overallScore * 100)}% · ${dict.llmWords} ${report.footprintResult.llmFavoredWords?.length ?? 0}`
                  ) : (
                    dict.fingerprintNotRun
                  )}
                </div>
              </div>

              {/* 6. Plagiarism & Originality Card */}
              <div className="panel-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">§</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      {dict.plagiarismTitle}
                    </h4>
                  </div>
                  <span className="badge-success text-[10px]">
                    {plagiarismData?.originalityScore ?? 100}% {dict.original}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                  {plagiarismData ? (
                    `${dict.plagiarismScore} ${plagiarismData.plagiarismScore ?? 0}% · ${dict.topMatch} ${plagiarismData.highestMatchSource ?? plagiarismData.summary?.highestMatchSource ?? dict.none} (${plagiarismData.highestMatchPercent ?? plagiarismData.summary?.highestMatchPercent ?? 0}%) · ${dict.paraphrases} ${plagiarismData.paraphraseCount ?? plagiarismData.summary?.paraphraseCount ?? 0} · ${dict.styleShifts} ${plagiarismData.styleShiftCount ?? plagiarismData.summary?.styleShiftCount ?? 0}`
                  ) : (
                    dict.noReferenceComparison
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
