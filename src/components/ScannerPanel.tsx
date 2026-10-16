import { useCallback, useRef, useState, useMemo } from 'react';
import { saveAs } from 'file-saver';
import { useStore } from '../store';
import { useT } from '../i18n';
import { scan } from '../core/scanner';
import { cleanup } from '../core/cleanup/cleanup';
import { createHistory, pushSnapshot, undo, redo, currentText, canUndo, canRedo, restoreOriginal } from '../core/cleanup/history';
import type { CleanupMode } from '../core/cleanup/types';
import type { CharClass } from '../core/scanner/types';
import { parseCustomOptions, customOptionsTemplate, CustomOptionsError } from '../core/cleanup/customOptions';
import {
  buildDeterministicBriefing,
  explainAttackVectorWithAI,
  type AttackVectorBriefing,
} from '../core/security/explainer';

const RISK_BADGE: Record<string, string> = {
  security: 'badge-danger',
  formatting: 'badge-warning',
  info: 'badge-info',
  none: 'badge-neutral',
};

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: 'badge-danger',
  HIGH: 'badge-danger',
  MEDIUM: 'badge-warning',
  LOW: 'badge-warning',
  CLEAN: 'badge-success',
};

const I18N = {
  en: {
    briefingTitle: 'Attack Vector & Risk Briefing',
    howItWorks: 'How It Works:',
    whatItDoes: 'What It Does:',
    targets: 'Targets:',
    mitigation: 'Mitigation:',
    explainAI: '✦ Explain with AI',
    analyzing: 'Analyzing...',
    deterministic: 'Deterministic',
    aiAssisted: '✦ AI-Assisted',
    aiDeepDiveTitle: 'Generate an AI-powered forensic deep dive',
    aiOfflineNote: 'AI requires Online Mode or On-Device model',
    stegoTitle: 'Steganographic Patterns',
    bidiTitle: 'Bidi Issues',
    cleanupTitle: 'Cleanup Changes',
    emptyScanTitle: 'Unicode & Steganography Scanner',
    emptyScanDesc: 'Run Scan to detect invisible characters, homoglyphs, and steganographic patterns.',
    atPosition: 'at position',
    chars: 'chars',
    decoded: 'decoded:',
    more: 'more',
    classesCount: 'classes',
    classCount: 'class',
  },
  es: {
    briefingTitle: 'Informe de vectores de ataque y riesgos',
    howItWorks: 'Cómo funciona:',
    whatItDoes: 'Qué hace:',
    targets: 'Objetivos:',
    mitigation: 'Mitigación:',
    explainAI: '✦ Explicar con IA',
    analyzing: 'Analizando...',
    deterministic: 'Determinista',
    aiAssisted: '✦ Asistido por IA',
    aiDeepDiveTitle: 'Generar análisis forense profundo con IA',
    aiOfflineNote: 'La IA requiere modo en línea o modelo local',
    stegoTitle: 'Patrones esteganográficos',
    bidiTitle: 'Problemas de texto bidireccional (Bidi)',
    cleanupTitle: 'Cambios de limpieza',
    emptyScanTitle: 'Escáner Unicode y de esteganografía',
    emptyScanDesc: 'Ejecute el escaneo para detectar caracteres invisibles, homoglifos y patrones esteganográficos.',
    atPosition: 'en la posición',
    chars: 'caracteres',
    decoded: 'decodificado:',
    more: 'más',
    classesCount: 'clases',
    classCount: 'clase',
  },
  fr: {
    briefingTitle: 'Rapport sur les vecteurs d\'attaque et risques',
    howItWorks: 'Fonctionnement :',
    whatItDoes: 'Action :',
    targets: 'Cibles :',
    mitigation: 'Atténuation :',
    explainAI: '✦ Expliquer avec l\'IA',
    analyzing: 'Analyse en cours...',
    deterministic: 'Déterministe',
    aiAssisted: '✦ Assisté par IA',
    aiDeepDiveTitle: 'Générer une analyse médico-légale approfondie avec l\'IA',
    aiOfflineNote: 'L\'IA nécessite le mode en ligne ou un modèle local',
    stegoTitle: 'Motifs stéganographiques',
    bidiTitle: 'Problèmes de texte bidirectionnel (Bidi)',
    cleanupTitle: 'Modifications de nettoyage',
    emptyScanTitle: 'Scanner Unicode et stéganographie',
    emptyScanDesc: 'Lancez le scan pour détecter les caractères invisibles, les homoglyphes et la stéganographie.',
    atPosition: 'à la position',
    chars: 'caractères',
    decoded: 'décodé :',
    more: 'de plus',
    classesCount: 'classes',
    classCount: 'classe',
  },
  'pt-BR': {
    briefingTitle: 'Relatório de vetores de ataque e riscos',
    howItWorks: 'Como funciona:',
    whatItDoes: 'O que faz:',
    targets: 'Alvos:',
    mitigation: 'Mitigação:',
    explainAI: '✦ Explicar com IA',
    analyzing: 'Analisando...',
    deterministic: 'Determinístico',
    aiAssisted: '✦ Assistido por IA',
    aiDeepDiveTitle: 'Gerar análise forense detalhada com IA',
    aiOfflineNote: 'A IA requer Modo Online ou modelo local',
    stegoTitle: 'Padrões esteganográficos',
    bidiTitle: 'Problemas de texto bidirecional (Bidi)',
    cleanupTitle: 'Alterações de limpeza',
    emptyScanTitle: 'Scanner Unicode e esteganografia',
    emptyScanDesc: 'Execute a verificação para detectar caracteres invisíveis, homóglifos e padrões esteganográficos.',
    atPosition: 'na posição',
    chars: 'caracteres',
    decoded: 'decodificado:',
    more: 'a mais',
    classesCount: 'classes',
    classCount: 'classe',
  },
  it: {
    briefingTitle: 'Rapporto sui vettori di attacco e rischi',
    howItWorks: 'Come funziona:',
    whatItDoes: 'Cosa fa:',
    targets: 'Bersagli:',
    mitigation: 'Mitigazione:',
    explainAI: '✦ Spiega con IA',
    analyzing: 'Analisi in corso...',
    deterministic: 'Deterministico',
    aiAssisted: '✦ Assistito da IA',
    aiDeepDiveTitle: 'Genera un\'analisi forense approfondita con IA',
    aiOfflineNote: 'L\'IA richiede modalità online o modello locale',
    stegoTitle: 'Pattern steganografici',
    bidiTitle: 'Problemi di testo bidirezionale (Bidi)',
    cleanupTitle: 'Modifiche di pulizia',
    emptyScanTitle: 'Scanner Unicode e steganografia',
    emptyScanDesc: 'Esegui la scansione per rilevare caratteri invisibili, omoglifi e pattern steganografici.',
    atPosition: 'alla posizione',
    chars: 'caratteri',
    decoded: 'decodificato:',
    more: 'altri',
    classesCount: 'classi',
    classCount: 'classe',
  },
};

export default function ScannerPanel() {
  const {
    originalText, scanResult, isScanning, cleanupMode, cleanupResult,
    history, cleanedText,
    setScanResult, setIsScanning, setCleanupMode, setCleanupResult,
    setHistory, setCleanedText,
    llmConfig, appMode, uiLanguage,
  } = useStore();
  const t = useT();
  const dict = I18N[(uiLanguage as keyof typeof I18N) ?? 'en'] ?? I18N.en;

  const applyTextMutation = useStore((s: any) => s.applyTextMutation);
  const setAttackBriefing = useStore((s: any) => s.setAttackBriefing);
  const storeBriefings = useStore((s: any) => s.attackBriefings);

  const [customClasses, setCustomClasses] = useState<Set<CharClass> | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localBriefings, setLocalBriefings] = useState<Record<string, AttackVectorBriefing>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const handleScan = useCallback(() => {
    if (!originalText) return;
    setIsScanning(true);
    setTimeout(() => {
      const result = scan(originalText);
      setScanResult(result);
      setIsScanning(false);
      if (!history) setHistory(createHistory(originalText));
    });
  }, [originalText, history, setScanResult, setIsScanning, setHistory]);

  const handleCleanup = useCallback((mode: CleanupMode) => {
    setCleanupMode(mode);
    const textToClean = cleanedText ?? originalText;
    const result = cleanup(textToClean, { mode, customClasses: mode === 'custom' ? (customClasses ?? undefined) : undefined });
    setCleanupResult(result);
    if (result.cleaned !== textToClean) {
      if (typeof applyTextMutation === 'function') {
        applyTextMutation(result.cleaned, 'scanner-clean', `${mode} cleanup`);
      }
      setCleanedText(result.cleaned);
      const h = history ?? createHistory(originalText);
      setHistory(pushSnapshot(h, result.cleaned, `${mode} cleanup`));
    }
  }, [originalText, cleanedText, history, customClasses, setCleanupMode, setCleanupResult, setCleanedText, setHistory, applyTextMutation]);

  const handleLoadOptions = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setCustomError(null);
    try {
      const text = await file.text();
      const { classes } = parseCustomOptions(text);
      setCustomClasses(classes);
      setCustomFileName(file.name);
    } catch (e) {
      setCustomClasses(null);
      setCustomFileName(null);
      setCustomError(e instanceof CustomOptionsError ? e.message : 'Could not read the options file.');
    }
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    saveAs(new Blob([customOptionsTemplate()], { type: 'application/json;charset=utf-8' }), 'tii-custom-options.json');
  }, []);

  const handleUndo = useCallback(() => {
    if (!history || !canUndo(history)) return;
    const h = undo(history);
    setHistory(h);
    setCleanedText(currentText(h));
  }, [history, setHistory, setCleanedText]);

  const handleRedo = useCallback(() => {
    if (!history || !canRedo(history)) return;
    const h = redo(history);
    setHistory(h);
    setCleanedText(currentText(h));
  }, [history, setHistory, setCleanedText]);

  const handleRestore = useCallback(() => {
    if (!history) return;
    const h = restoreOriginal(history);
    setHistory(h);
    setCleanedText(null);
    setCleanupResult(null);
  }, [history, setHistory, setCleanedText, setCleanupResult]);

  // Derive detected attack vector briefings with strict null safety
  const detectedVectors = useMemo(() => {
    if (!scanResult) return [];
    const vectors: { key: string; finding: any; briefing: AttackVectorBriefing }[] = [];
    const seen = new Set<string>();

    const findings = scanResult?.findings ?? [];
    const stegoPatterns = scanResult?.stegoPatterns ?? [];
    const bidiIssues = scanResult?.bidiIssues ?? [];
    const mixedScriptRuns = scanResult?.mixedScriptRuns ?? [];

    // 1. Tag characters
    const tagFinding = findings.find(f => f.charClass === 'tag-char' || (f.codePoint >= 0xe0000 && f.codePoint <= 0xe007f));
    if (tagFinding && !seen.has('tag-char')) {
      seen.add('tag-char');
      const b = buildDeterministicBriefing(tagFinding, 'scanner');
      vectors.push({ key: 'tag-char', finding: tagFinding, briefing: b });
    }

    // 2. Zero-Width Stego
    if (stegoPatterns.length > 0 && !seen.has('zws-stego')) {
      seen.add('zws-stego');
      const p = stegoPatterns[0];
      const b = buildDeterministicBriefing({ ...p, charClass: 'zero-width' }, 'scanner');
      vectors.push({ key: 'zws-stego', finding: p, briefing: b });
    } else {
      const zwsFinding = findings.find(f => f.charClass === 'zero-width');
      if (zwsFinding && !seen.has('zws-stego')) {
        seen.add('zws-stego');
        const b = buildDeterministicBriefing(zwsFinding, 'scanner');
        vectors.push({ key: 'zws-stego', finding: zwsFinding, briefing: b });
      }
    }

    // 3. Bidi Overrides (Trojan Source)
    if (bidiIssues.length > 0 && !seen.has('bidi-control')) {
      seen.add('bidi-control');
      const issue = bidiIssues[0];
      const b = buildDeterministicBriefing({ ...issue, charClass: 'bidi-control' }, 'scanner');
      vectors.push({ key: 'bidi-control', finding: issue, briefing: b });
    }

    // 4. Homoglyphs & Mixed Scripts
    if (mixedScriptRuns.length > 0 && !seen.has('homoglyph')) {
      seen.add('homoglyph');
      const r = mixedScriptRuns[0];
      const b = buildDeterministicBriefing({ ...r, charClass: 'homoglyph' }, 'scanner');
      vectors.push({ key: 'homoglyph', finding: r, briefing: b });
    }

    // 5. Variation Selector Stego
    const vsFinding = findings.find(f => f.charClass === 'variation-selector');
    if (vsFinding && !seen.has('variation-selector')) {
      seen.add('variation-selector');
      const b = buildDeterministicBriefing(vsFinding, 'scanner');
      vectors.push({ key: 'variation-selector', finding: vsFinding, briefing: b });
    }

    return vectors;
  }, [scanResult]);

  const handleExplainAI = useCallback(async (key: string, finding: any) => {
    setAiLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await explainAttackVectorWithAI(finding, 'scanner', llmConfig, appMode === 'offline');
      setLocalBriefings(prev => ({ ...prev, [key]: res }));
      if (typeof setAttackBriefing === 'function') {
        setAttackBriefing(key, res);
      }
    } finally {
      setAiLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [llmConfig, appMode, setAttackBriefing]);

  const canRunAI = (llmConfig?.provider === 'local' || appMode === 'online');

  const findingsList = scanResult?.findings ?? [];
  const stegoList = scanResult?.stegoPatterns ?? [];
  const mixedList = scanResult?.mixedScriptRuns ?? [];
  const bidiList = scanResult?.bidiIssues ?? [];
  const cleanupChanges = cleanupResult?.changes ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Action bar */}
      <div className="panel-bar">
        <button id="scan-run" onClick={handleScan} disabled={!originalText || isScanning} className="btn-primary">
          {isScanning ? t('scan.running') : t('scan.run')}
        </button>

        <div className="flex gap-1">
          {(['report-only', 'conservative', 'aggressive', 'custom'] as CleanupMode[]).map(mode => (
            <button
              key={mode}
              id={`cleanup-${mode}`}
              onClick={() => handleCleanup(mode)}
              disabled={!originalText}
              className={`px-2.5 py-1 text-[10px] font-medium rounded transition-all ${
                cleanupMode === mode && cleanupResult
                  ? 'bg-accent text-white'
                  : 'btn-ghost'
              } disabled:opacity-40`}
            >
              {t(`scan.mode.${mode}`)}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto">
          {[
            { id: 'undo', label: '↩', title: t('scan.undo'), disabled: !history || !canUndo(history), action: handleUndo },
            { id: 'redo', label: '↪', title: t('scan.redo'), disabled: !history || !canRedo(history), action: handleRedo },
            { id: 'restore', label: t('scan.restore'), title: t('scan.restoreTitle'), disabled: !history, action: handleRestore },
          ].map(b => (
            <button
              key={b.id}
              id={`scanner-${b.id}`}
              onClick={b.action}
              disabled={b.disabled}
              title={b.title}
              className="btn-ghost disabled:opacity-30"
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom-mode options file loader */}
      {cleanupMode === 'custom' && (
        <div className="px-4 py-2 border-b border-border dark:border-border-dark bg-panel/50 dark:bg-panel-dark/50 flex items-center gap-2 flex-wrap text-[11px]">
          <span className="font-semibold text-ink dark:text-ink-dark">{t('scan.custom.title')}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => { handleLoadOptions(e.target.files?.[0]); e.target.value = ''; }}
          />
          <button onClick={() => fileInputRef.current?.click()} className="btn-ghost px-2 py-1">{t('scan.custom.load')}</button>
          <button onClick={handleDownloadTemplate} className="btn-ghost px-2 py-1">{t('scan.custom.template')}</button>
          {customFileName && customClasses && (
            <span className="text-success dark:text-emerald-400">
              {customFileName}: {customClasses.size} {customClasses.size === 1 ? dict.classCount : dict.classesCount} — {[...customClasses].join(', ')}
            </span>
          )}
          {!customClasses && !customError && (
            <span className="text-ink-faint dark:text-ink-dark-faint">{t('scan.custom.hint')}</span>
          )}
          {customError && <span className="text-danger dark:text-red-400">⚠ {customError}</span>}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto p-4 space-y-4 animate-slide-up">
        {scanResult && (
          <div className="space-y-4">
            {/* Summary row */}
            <div className="flex items-center gap-3 text-[10px] font-mono text-ink-faint dark:text-ink-dark-faint">
              {[
                { label: t('scan.findings'), count: findingsList.length },
                { label: t('scan.stego'), count: stegoList.length },
                { label: t('scan.mixed'), count: mixedList.length },
                { label: t('scan.bidi'), count: bidiList.length },
              ].map(({ label, count }) => (
                <span key={label} className={count > 0 ? 'text-warning dark:text-yellow-400 font-semibold' : ''}>
                  {count} {label}
                </span>
              ))}
              <span className="ml-auto">{(scanResult.durationMs ?? 0).toFixed(1)}ms</span>
            </div>

            {/* Attack Vector & Risk Briefing Cards */}
            {detectedVectors.length > 0 && (
              <div className="space-y-2">
                <SectionHeader icon="🛡" label={dict.briefingTitle} color="danger" />
                <div className="space-y-2.5">
                  {detectedVectors.map(({ key, finding, briefing: defaultBriefing }) => {
                    const briefing = localBriefings[key] ?? storeBriefings?.[key] ?? defaultBriefing;
                    const isLoading = aiLoading[key] ?? false;
                    const targetsList = Array.isArray(briefing?.targets) ? briefing.targets : [];

                    return (
                      <div
                        key={key}
                        className="p-3.5 rounded-xl border border-danger/30 bg-gradient-to-br from-panel via-surface to-panel dark:from-panel-dark dark:via-surface-dark dark:to-panel-dark space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`badge ${SEVERITY_BADGE[briefing.severity] ?? 'badge-neutral'} font-mono text-[9px]`}>
                              {briefing.severity} ({briefing.riskScore}/100)
                            </span>
                            <span className="text-xs font-bold text-ink dark:text-ink-dark">
                              {briefing.vectorName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="badge-neutral font-mono text-[9px]">
                              {briefing.source === 'on-device-ai' || briefing.source === 'local-llm' || briefing.source === 'cloud-llm'
                                ? dict.aiAssisted
                                : dict.deterministic}
                            </span>
                            <button
                              onClick={() => handleExplainAI(key, finding)}
                              disabled={!canRunAI || isLoading}
                              title={canRunAI ? dict.aiDeepDiveTitle : dict.aiOfflineNote}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors disabled:opacity-40"
                            >
                              {isLoading ? dict.analyzing : dict.explainAI}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="p-2 rounded bg-surface/70 dark:bg-surface-dark/70 border border-border/50 dark:border-border-dark/50">
                            <span className="font-semibold text-ink dark:text-ink-dark block mb-0.5">{dict.howItWorks}</span>
                            <p className="text-ink-muted dark:text-ink-dark-muted leading-relaxed">{briefing.mechanism}</p>
                          </div>
                          <div className="p-2 rounded bg-surface/70 dark:bg-surface-dark/70 border border-border/50 dark:border-border-dark/50">
                            <span className="font-semibold text-ink dark:text-ink-dark block mb-0.5">{dict.whatItDoes}</span>
                            <p className="text-ink-muted dark:text-ink-dark-muted leading-relaxed">{briefing.whatItDoes}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="font-semibold text-ink dark:text-ink-dark">{dict.targets}</span>
                          {targetsList.map(tg => (
                            <span key={tg} className="badge-neutral text-[9px]">{tg}</span>
                          ))}
                        </div>

                        <div className="text-[11px] bg-danger/5 dark:bg-danger/10 border border-danger/15 rounded p-2 text-ink-muted dark:text-ink-dark-muted">
                          <span className="font-semibold text-danger dark:text-red-400">{dict.mitigation} </span>
                          {briefing.mitigation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Findings */}
            {findingsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-ink-faint dark:text-ink-dark-faint">
                <div className="text-2xl mb-2 opacity-30">◈</div>
                <p className="text-xs">{t('scan.none')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {findingsList.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-panel dark:bg-panel-dark border border-border dark:border-border-dark hover:border-accent/40 shadow-sm transition-all group">
                    <span className={`badge ${RISK_BADGE[f.risk] ?? 'badge-neutral'} shrink-0 font-mono`}>
                      {f.codePointHex}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-ink dark:text-ink-dark truncate">{f.name}</span>
                        <span className="badge badge-neutral">{f.charClass}</span>
                        {f.safeToRemove && (
                          <span className="text-[9px] text-success dark:text-emerald-400 font-medium">{t('scan.safeToRemove')}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-ink-faint dark:text-ink-dark-faint mt-0.5 leading-relaxed">{f.description}</p>
                    </div>
                    <span className="text-[9px] text-ink-faint dark:text-ink-dark-faint font-mono shrink-0">@{f.charOffset}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Stego patterns */}
            {stegoList.length > 0 && (
              <div>
                <SectionHeader icon="⚠" label={dict.stegoTitle} color="danger" />
                <div className="space-y-1">
                  {stegoList.map((p, i) => (
                    <div key={i} className="px-3 py-2 rounded bg-danger-muted border border-danger/20 text-xs font-mono">
                      <span className="text-ink-muted dark:text-ink-dark-muted">{p.startOffset}–{p.endOffset}</span>
                      <span className="ml-2 text-ink dark:text-ink-dark">{(p.codePoints ?? []).length} {dict.chars}</span>
                      {p.decodedText && (
                        <span className="ml-2 text-danger dark:text-red-400 font-semibold">{dict.decoded} "{p.decodedText}"</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mixed script */}
            {mixedList.length > 0 && (
              <div>
                <SectionHeader icon="⊗" label={t('scan.mixedTitle')} color="warning" />
                <div className="space-y-1">
                  {mixedList.map((r, i) => (
                    <div key={i} className="px-3 py-2 rounded bg-warning-muted border border-warning/20 text-[10px] font-mono flex gap-3 flex-wrap">
                      <span className="text-ink dark:text-ink-dark">"{r.word}"</span>
                      <span className="text-ink-muted dark:text-ink-dark-muted">scripts: {(r.scripts ?? []).join(', ')}</span>
                      {r.confusableWith && (
                        <span className="text-warning dark:text-yellow-400">≈ "{r.confusableWith}"</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bidi issues */}
            {bidiList.length > 0 && (
              <div>
                <SectionHeader icon="⚠" label={dict.bidiTitle} color="danger" />
                <div className="space-y-1">
                  {bidiList.map((b, i) => (
                    <div key={i} className="px-3 py-2 rounded bg-danger-muted border border-danger/20 text-[10px] font-mono">
                      {b.type} {dict.atPosition} {b.openOffset}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cleanup changes */}
        {cleanupChanges.length > 0 && (
          <div className="pt-3 border-t border-border dark:border-border-dark space-y-2">
            <SectionHeader icon="✓" label={`${dict.cleanupTitle} (${cleanupChanges.length})`} color="success" />
            <div className="space-y-0.5">
              {cleanupChanges.slice(0, 50).map((c, i) => (
                <div key={i} className="flex gap-2 items-center text-[10px] px-2.5 py-1.5 rounded bg-success-muted font-mono">
                  <span className="text-ink-faint dark:text-ink-dark-faint">U+{c.codePoint.toString(16).toUpperCase().padStart(4, '0')}</span>
                  <span className="text-ink dark:text-ink-dark">{c.reason}</span>
                  {c.replacement && <span className="text-success dark:text-emerald-400">→ "{c.replacement}"</span>}
                </div>
              ))}
              {cleanupChanges.length > 50 && (
                <p className="text-[10px] text-ink-faint dark:text-ink-dark-faint pl-2">
                  +{cleanupChanges.length - 50} {dict.more}
                </p>
              )}
            </div>
          </div>
        )}

        {!scanResult && !cleanupResult && (
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
              <path d="M32 6L14 14v16c0 14.5 8 23 18 28 10-5 18-13.5 18-28V14L32 6z" opacity="0.25" fill="currentColor" />
              <path d="M32 6L14 14v16c0 14.5 8 23 18 28 10-5 18-13.5 18-28V14L32 6z" />
              <circle cx="32" cy="27" r="9" />
              <path d="M38.5 33.5L46 41" />
              <line x1="32" y1="21" x2="32" y2="23" />
              <line x1="32" y1="31" x2="32" y2="33" />
              <line x1="26" y1="27" x2="28" y2="27" />
              <line x1="36" y1="27" x2="38" y2="27" />
            </svg>
            <h3 className="text-sm font-bold text-ink dark:text-ink-dark">{dict.emptyScanTitle}</h3>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted max-w-sm">{dict.emptyScanDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  const cls: Record<string, string> = {
    danger: 'text-danger dark:text-red-400',
    warning: 'text-warning dark:text-yellow-400',
    success: 'text-success dark:text-emerald-400',
  };
  return (
    <div className={`flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-wider ${cls[color] ?? ''}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
