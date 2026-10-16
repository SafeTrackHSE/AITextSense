import { useState, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { analyzeThreat } from '../core/threat';
import type { ThreatFinding } from '../core/threat/types';
import {
  buildDeterministicBriefing,
  explainAttackVectorWithAI,
  synthesizeKillChain,
  type AttackVectorBriefing,
} from '../core/security/explainer';

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: 'badge-danger',
  HIGH: 'badge-danger',
  MEDIUM: 'badge-warning',
  LOW: 'badge-warning',
  CLEAN: 'badge-success',
};

const severityBadgeClass = (severity: string) => {
  return SEVERITY_BADGE[severity] ?? 'badge-neutral';
};

const I18N = {
  en: {
    killChainDetected: 'Kill-Chain Correlation Detected',
    criticalSeverity: 'CRITICAL SEVERITY',
    howItWorks: 'How It Works:',
    whatItDoes: 'What It Does:',
    whatItDoesTargets: 'What It Does / Targets:',
    targets: 'Targets:',
    mitigation: 'Mitigation:',
    aiAssisted: '✦ AI-Assisted',
    explainAI: '✦ Explain with AI',
    analyzing: 'Analyzing...',
    aiTitle: 'Generate AI-powered forensic briefing',
    aiOfflineNote: 'Requires Online Mode or On-Device model',
    risk: 'Risk:',
    emptyTitle: 'Payload & Threat Defense Engine',
    emptyDesc: 'Inspect shellcode, execution commands, and multi-stage kill chains across text inputs.',
  },
  es: {
    killChainDetected: 'Correlación de cadena de ataque detectada',
    criticalSeverity: 'GRAVEDAD CRÍTICA',
    howItWorks: 'Cómo funciona:',
    whatItDoes: 'Qué hace:',
    whatItDoesTargets: 'Qué hace / Objetivos:',
    targets: 'Objetivos:',
    mitigation: 'Mitigación:',
    aiAssisted: '✦ Asistido por IA',
    explainAI: '✦ Explicar con IA',
    analyzing: 'Analizando...',
    aiTitle: 'Generar informe forense con IA',
    aiOfflineNote: 'Requiere modo en línea o modelo local',
    risk: 'Riesgo:',
    emptyTitle: 'Motor de defensa contra amenazas y cargas',
    emptyDesc: 'Inspeccione shellcode, comandos de ejecución y cadenas de ataque en entradas de texto.',
  },
  fr: {
    killChainDetected: 'Corrélation de chaîne d\'attaque détectée',
    criticalSeverity: 'GRAVITÉ CRITIQUE',
    howItWorks: 'Fonctionnement :',
    whatItDoes: 'Action :',
    whatItDoesTargets: 'Action / Cibles :',
    targets: 'Cibles :',
    mitigation: 'Atténuation :',
    aiAssisted: '✦ Assisté par IA',
    explainAI: '✦ Expliquer avec l\'IA',
    analyzing: 'Analyse en cours...',
    aiTitle: 'Générer un rapport médico-légal par IA',
    aiOfflineNote: 'Nécessite le mode en ligne ou un modèle local',
    risk: 'Risque :',
    emptyTitle: 'Moteur de défense contre les menaces',
    emptyDesc: 'Inspectez les shellcodes, commandes d\'exécution et chaînes d\'attaque dans le texte.',
  },
  'pt-BR': {
    killChainDetected: 'Correlação de cadeia de ataque detectada',
    criticalSeverity: 'GRAVIDADE CRÍTICA',
    howItWorks: 'Como funciona:',
    whatItDoes: 'O que faz:',
    whatItDoesTargets: 'O que faz / Alvos:',
    targets: 'Alvos:',
    mitigation: 'Mitigação:',
    aiAssisted: '✦ Assistido por IA',
    explainAI: '✦ Explicar com IA',
    analyzing: 'Analisando...',
    aiTitle: 'Gerar relatório forense com IA',
    aiOfflineNote: 'Requer Modo Online ou modelo local',
    risk: 'Risco:',
    emptyTitle: 'Mecanismo de defesa contra ameaças',
    emptyDesc: 'Inspecione shellcode, comandos de execução e cadeias de ataque em entradas de texto.',
  },
  it: {
    killChainDetected: 'Correlazione catena di attacco rilevata',
    criticalSeverity: 'GRAVITÀ CRITICA',
    howItWorks: 'Come funziona:',
    whatItDoes: 'Cosa fa:',
    whatItDoesTargets: 'Cosa fa / Bersagli:',
    targets: 'Bersagli:',
    mitigation: 'Mitigazione:',
    aiAssisted: '✦ Assistito da IA',
    explainAI: '✦ Spiega con IA',
    analyzing: 'Analisi in corso...',
    aiTitle: 'Genera report forense con IA',
    aiOfflineNote: 'Richiede modalità online o modello locale',
    risk: 'Rischio:',
    emptyTitle: 'Motore di difesa contro le minacce',
    emptyDesc: 'Ispeziona shellcode, comandi di esecuzione e catene di attacco nei testi.',
  },
};

export default function ThreatPanel() {
  const {
    originalText,
    threatResult,
    setThreatResult,
    isAnalyzingThreat,
    setIsAnalyzingThreat,
    injectionResult,
    llmConfig,
    appMode,
    openHelp,
    uiLanguage,
  } = useStore();

  const setAttackBriefing = useStore((s: any) => s.setAttackBriefing);
  const storeBriefings = useStore((s: any) => s.attackBriefings);

  const t = useT();
  const dict = I18N[(uiLanguage as keyof typeof I18N) ?? 'en'] ?? I18N.en;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localBriefings, setLocalBriefings] = useState<Record<string, AttackVectorBriefing>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const canRunAI = (llmConfig?.provider === 'local' || appMode === 'online');

  const handleAnalyze = useCallback(
    async (withCapabilityReview: boolean) => {
      if (!originalText || originalText.trim().length === 0) return;
      setIsAnalyzingThreat(true);
      try {
        const res = await analyzeThreat(originalText, {
          runCapabilityReview: withCapabilityReview && canRunAI,
          llmConfig,
        });
        setThreatResult(res);
      } finally {
        setIsAnalyzingThreat(false);
      }
    },
    [originalText, llmConfig, canRunAI, setThreatResult, setIsAnalyzingThreat]
  );

  const toggleExpanded = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  // Synthesize kill-chains from detected threats + injections with strict null guards
  const killChains = useMemo(() => {
    const findings = Array.isArray(threatResult?.findings) ? threatResult.findings : [];
    if (findings.length === 0) return [];

    // First check if any findings are already THR-CHAIN-*
    const existingChainFindings = findings.filter(f => f.ruleId?.startsWith('THR-CHAIN-'));
    if (existingChainFindings.length > 0) {
      return existingChainFindings.map(f => buildDeterministicBriefing(f, 'threat'));
    }

    const injFindings = Array.isArray(injectionResult?.findings) ? injectionResult.findings : [];
    const injPayloads = Array.isArray(injectionResult?.decodedPayloads) ? injectionResult.decodedPayloads : [];

    // Otherwise correlate using synthesizeKillChain
    return synthesizeKillChain(findings, injFindings, injPayloads);
  }, [threatResult, injectionResult]);

  const handleExplainAI = useCallback(async (finding: ThreatFinding) => {
    setAiLoading(prev => ({ ...prev, [finding.id]: true }));
    try {
      const res = await explainAttackVectorWithAI(finding, 'threat', llmConfig, appMode === 'offline');
      setLocalBriefings(prev => ({ ...prev, [finding.id]: res }));
      if (typeof setAttackBriefing === 'function') {
        setAttackBriefing(finding.id, res);
      }
    } finally {
      setAiLoading(prev => ({ ...prev, [finding.id]: false }));
    }
  }, [llmConfig, appMode, setAttackBriefing]);

  const findingsList = Array.isArray(threatResult?.findings) ? threatResult.findings : [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Top Toolbar */}
      <div className="panel-bar">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleAnalyze(false)}
            disabled={isAnalyzingThreat || !originalText.trim()}
            className="btn-primary"
          >
            {isAnalyzingThreat ? t('threat.analyzing') : t('threat.analyze')}
          </button>

          {canRunAI && (
            <button
              onClick={() => handleAnalyze(true)}
              disabled={isAnalyzingThreat || !originalText.trim()}
              title={t('threat.capabilityReviewNote')}
              className="btn-ghost"
            >
              {isAnalyzingThreat ? t('threat.reviewing') : t('threat.capabilityReview')}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
        {!threatResult ? (
          <div className="illustration-box h-full my-auto space-y-3">
            <svg
              className="w-16 h-16 text-warning/70 animate-pulse-subtle"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M32 6L8 16v18c0 15 10 23 24 28 14-5 24-13 24-28V16L32 6z" opacity="0.25" fill="currentColor" />
              <path d="M32 6L8 16v18c0 15 10 23 24 28 14-5 24-13 24-28V16L32 6z" />
              <circle cx="32" cy="30" r="4" fill="currentColor" />
              <path d="M32 18v8M32 34v12" />
              <path d="M22 24l7 4M35 32l7 4M42 24l-7 4M29 32l-7 4" />
            </svg>
            <h3 className="text-sm font-bold text-ink dark:text-ink-dark">{dict.emptyTitle}</h3>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted max-w-sm">{dict.emptyDesc}</p>
          </div>
        ) : (
          <>
            {/* Kill-Chain Correlation Banner */}
            {killChains.length > 0 && (
              <div className="p-4 rounded-xl border-2 border-danger bg-gradient-to-br from-danger/10 via-surface to-danger/15 dark:from-danger/20 dark:via-surface-dark dark:to-danger/25 text-ink dark:text-ink-dark space-y-3 shadow-md animate-pulse-subtle">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <span className="text-xs font-black tracking-wider uppercase text-danger dark:text-red-400">
                      {dict.killChainDetected} ({killChains.length})
                    </span>
                  </div>
                  <span className="badge badge-danger font-mono font-bold text-[10px]">
                    {dict.criticalSeverity}
                  </span>
                </div>

                <div className="space-y-2">
                  {killChains.map((chain, idx) => {
                    const chainTargets = Array.isArray(chain?.targets) ? chain.targets : [];

                    return (
                      <div
                        key={chain.id || idx}
                        className="p-3 rounded-xl bg-surface/80 dark:bg-surface-dark/80 border border-danger/40 space-y-2 text-xs shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-danger dark:text-red-400">
                            {chain.vectorName}
                          </span>
                          <span className="badge-neutral font-mono text-[9px]">
                            {dict.risk} {chain.riskScore}/100
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted space-y-1">
                          <div>
                            <span className="font-semibold text-ink dark:text-ink-dark">{dict.howItWorks} </span>
                            {chain.mechanism}
                          </div>
                          <div>
                            <span className="font-semibold text-ink dark:text-ink-dark">{dict.whatItDoes} </span>
                            {chain.whatItDoes}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="font-semibold text-ink dark:text-ink-dark">{dict.targets} </span>
                            {chainTargets.map(tg => (
                              <span key={tg} className="badge-neutral text-[9px]">{tg}</span>
                            ))}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-danger/5 dark:bg-danger/10 border border-danger/20 text-[11px] text-danger dark:text-red-300">
                          <span className="font-bold">{dict.mitigation} </span>
                          {chain.mitigation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Risk Summary Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                  {t('threat.severity')}
                </div>
                <div className="mt-1">
                  <span className={severityBadgeClass(threatResult.severity)}>
                    {threatResult.severity === 'CLEAN' ? t('threat.clean') : threatResult.severity}
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                  {t('threat.risk')}
                </div>
                <div className="stat-value text-base font-bold text-ink dark:text-ink-dark flex items-baseline gap-1">
                  <span>{threatResult.riskScore}</span>
                  <span className="text-[11px] font-normal text-ink-muted dark:text-ink-dark-muted">/ 100</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                  {t('threat.spansExtracted')}
                </div>
                <div className="stat-value text-base font-bold text-ink dark:text-ink-dark">{threatResult.spansExtracted ?? 0}</div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                  {t('threat.decodedSpans')}
                </div>
                <div className="stat-value text-base font-bold text-ink dark:text-ink-dark">{threatResult.decodedSpanCount ?? 0}</div>
              </div>
            </div>

            {/* Findings */}
            {findingsList.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-success/40 bg-success-muted text-center text-xs text-success dark:text-emerald-400">
                ✓ {t('threat.noThreats')}
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted flex items-center gap-2">
                  <span>{t('threat.findings')}</span>
                  <span className="badge-neutral font-mono">{findingsList.length}</span>
                </h4>

                <div className="space-y-2">
                  {findingsList.map((f) => {
                    const briefing = localBriefings[f.id] ?? storeBriefings?.[f.id] ?? buildDeterministicBriefing(f, 'threat');
                    const isAiLoading = aiLoading[f.id] ?? false;

                    return (
                      <ThreatFindingCard
                        key={f.id}
                        finding={f}
                        briefing={briefing}
                        isAiLoading={isAiLoading}
                        canRunAI={canRunAI}
                        onExplainAI={() => handleExplainAI(f)}
                        expanded={expandedId === f.id}
                        onToggle={() => toggleExpanded(f.id)}
                        t={t}
                        dict={dict}
                        onOpenGlossary={openHelp}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ThreatFindingCard({
  finding,
  briefing,
  isAiLoading,
  canRunAI,
  onExplainAI,
  expanded,
  onToggle,
  t,
  dict,
  onOpenGlossary,
}: {
  finding: ThreatFinding;
  briefing: AttackVectorBriefing;
  isAiLoading: boolean;
  canRunAI: boolean;
  onExplainAI: () => void;
  expanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
  dict: typeof I18N['en'];
  onOpenGlossary: (termId?: string) => void;
}) {
  const e = finding?.explanation;
  const glossaryTerms = Array.isArray(e?.relatedGlossaryTerms) ? e.relatedGlossaryTerms : [];
  const targetsArray = Array.isArray(briefing?.targets) ? briefing.targets : [];
  const decodedHops = Array.isArray(finding?.decodedFrom) ? finding.decodedFrom : [];

  return (
    <div className="rounded-xl border border-danger/30 bg-panel dark:bg-panel-dark text-xs overflow-hidden shadow-sm hover:border-accent/40 transition-all">
      <button onClick={onToggle} className="w-full text-left p-3.5 space-y-1.5 hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={severityBadgeClass(briefing.severity)}>{briefing.severity}</span>
            <span className="font-bold text-ink dark:text-ink-dark text-xs">{briefing.vectorName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge-neutral font-mono text-[9px]">{briefing.riskScore}/100</span>
            <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        <p className="text-ink-muted dark:text-ink-dark-muted text-xs leading-relaxed">{briefing.mechanism}</p>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-border dark:border-border-dark pt-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="badge-neutral font-mono text-[9px]">{finding.ruleId}</span>
              <span className="badge-neutral font-mono text-[9px]">
                {briefing.source === 'deterministic-forensic'
                  ? (e?.source === 'static-signature' ? t('threat.sourceStatic') : t('threat.sourceLlm'))
                  : dict.aiAssisted}
              </span>
              <span className="badge-neutral font-mono text-[9px]">{t('threat.confidence')}: {briefing.confidence}</span>
            </div>

            <button
              onClick={onExplainAI}
              disabled={!canRunAI || isAiLoading}
              title={canRunAI ? dict.aiTitle : dict.aiOfflineNote}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors disabled:opacity-40"
            >
              {isAiLoading ? dict.analyzing : dict.explainAI}
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-surface dark:bg-surface-dark font-mono text-[11px] text-danger dark:text-red-400 break-all select-text border border-border/60 dark:border-border-dark/60">
            {finding.span?.text ?? ''}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded bg-surface/60 dark:bg-surface-dark/60 border border-border/40 dark:border-border-dark/40">
              <span className="font-semibold text-ink dark:text-ink-dark block mb-0.5">{dict.howItWorks}</span>
              <p className="text-ink-muted dark:text-ink-dark-muted leading-relaxed">{briefing.mechanism}</p>
            </div>
            <div className="p-2 rounded bg-surface/60 dark:bg-surface-dark/60 border border-border/40 dark:border-border-dark/40">
              <span className="font-semibold text-ink dark:text-ink-dark block mb-0.5">{dict.whatItDoesTargets}</span>
              <p className="text-ink-muted dark:text-ink-dark-muted leading-relaxed">{briefing.whatItDoes}</p>
            </div>
          </div>

          <ExplanationRow label={t('threat.targets')} value={targetsArray.join(', ')} />
          {briefing.context && <ExplanationRow label={t('threat.context')} value={briefing.context} />}
          <ExplanationRow label={t('threat.mitigation')} value={briefing.mitigation} />

          {/* AI deep-dive if present */}
          {finding.llmExplanation && (
            <div className="mt-1 rounded-lg border border-accent/40 bg-accent/5 p-2.5 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-accent">
                <span>✦ {t('threat.aiDeepDive')}</span>
                <span className="badge-neutral font-mono text-[9px]">{t('threat.confidence')}: {finding.llmExplanation.confidence}</span>
              </div>
              <ExplanationRow label={t('threat.mechanism')} value={finding.llmExplanation.mechanism} />
              <ExplanationRow label={t('threat.consequence')} value={finding.llmExplanation.consequence} />
              {finding.llmExplanation.context && <ExplanationRow label={t('threat.context')} value={finding.llmExplanation.context} />}
              <ExplanationRow label={t('threat.mitigation')} value={finding.llmExplanation.mitigation} />
            </div>
          )}

          {finding.llmReviewInconclusive && (
            <div className="mt-1 rounded-lg border border-border dark:border-border-dark bg-panel dark:bg-panel-dark p-2 text-[10px] text-ink-muted dark:text-ink-dark-muted">
              ✦ {t('threat.aiDeepDive')}: {finding.llmReviewInconclusive}
            </div>
          )}

          {glossaryTerms.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {glossaryTerms.map((termId) => (
                <button
                  key={termId}
                  onClick={() => onOpenGlossary(termId)}
                  title={t('glossary.searchPlaceholder')}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  🔎 {termId.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          )}

          <div className="pt-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
              {t('threat.decodeChain')}
            </div>
            {decodedHops.length > 0 ? (
              <div className="space-y-1">
                {decodedHops.map((hop, i) => (
                  <div key={i} className="font-mono text-[10px] text-ink-muted dark:text-ink-dark-muted flex items-center gap-1.5">
                    <span className="badge-neutral text-[9px]">{hop.encoding}</span>
                    <span className="truncate max-w-[45%]">{hop.input}</span>
                    <span>→</span>
                    <span className="truncate max-w-[45%] text-ink dark:text-ink-dark">{hop.output}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted">{t('threat.decodeChainEmpty')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExplanationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[11px]">
      <span className="font-semibold text-ink dark:text-ink-dark">{label}:</span>{' '}
      <span className="text-ink-muted dark:text-ink-dark-muted">{value}</span>
    </div>
  );
}
