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
  } = useStore();

  const setAttackBriefing = useStore((s: any) => s.setAttackBriefing);
  const storeBriefings = useStore((s: any) => s.attackBriefings);

  const t = useT();
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

  // Synthesize kill-chains from detected threats + injections
  const killChains = useMemo(() => {
    if (!threatResult || threatResult.findings.length === 0) return [];

    // First check if any findings are already THR-CHAIN-*
    const existingChainFindings = threatResult.findings.filter(f => f.ruleId?.startsWith('THR-CHAIN-'));
    if (existingChainFindings.length > 0) {
      return existingChainFindings.map(f => buildDeterministicBriefing(f, 'threat'));
    }

    // Otherwise correlate using synthesizeKillChain
    return synthesizeKillChain(
      threatResult.findings,
      injectionResult?.findings ?? [],
      injectionResult?.decodedPayloads ?? []
    );
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
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-muted dark:text-ink-dark-muted space-y-3">
            <span className="text-3xl opacity-50 font-mono">☠</span>
            <div className="max-w-md">
              <h3 className="text-sm font-semibold text-ink dark:text-ink-dark mb-1">{t('threat.title')}</h3>
              <p className="text-xs">{t('threat.empty')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Kill-Chain Correlation Banner */}
            {killChains.length > 0 && (
              <div className="p-4 rounded-xl border-2 border-danger bg-danger/10 dark:bg-danger/20 text-ink dark:text-ink-dark space-y-3 shadow-md animate-pulse-subtle">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <span className="text-xs font-black tracking-wider uppercase text-danger dark:text-red-400">
                      Kill-Chain Correlation Detected ({killChains.length})
                    </span>
                  </div>
                  <span className="badge badge-danger font-mono font-bold text-[10px]">
                    CRITICAL SEVERITY
                  </span>
                </div>

                <div className="space-y-2">
                  {killChains.map((chain, idx) => (
                    <div
                      key={chain.id || idx}
                      className="p-3 rounded-lg bg-surface/80 dark:bg-surface-dark/80 border border-danger/40 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-danger dark:text-red-400">
                          {chain.vectorName}
                        </span>
                        <span className="badge-neutral font-mono text-[9px]">
                          Risk: {chain.riskScore}/100
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted space-y-1">
                        <div>
                          <span className="font-semibold text-ink dark:text-ink-dark">How It Works: </span>
                          {chain.mechanism}
                        </div>
                        <div>
                          <span className="font-semibold text-ink dark:text-ink-dark">What It Does: </span>
                          {chain.whatItDoes}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="font-semibold text-ink dark:text-ink-dark">Targets: </span>
                          {chain.targets.map(tg => (
                            <span key={tg} className="badge-neutral text-[9px]">{tg}</span>
                          ))}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-danger/5 dark:bg-danger/10 border border-danger/20 text-[11px] text-danger dark:text-red-300">
                        <span className="font-bold">Mitigation: </span>
                        {chain.mitigation}
                      </div>
                    </div>
                  ))}
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
                <div className="stat-value text-base font-bold text-ink dark:text-ink-dark">{threatResult.spansExtracted}</div>
              </div>

              <div className="stat-card">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                  {t('threat.decodedSpans')}
                </div>
                <div className="stat-value text-base font-bold text-ink dark:text-ink-dark">{threatResult.decodedSpanCount}</div>
              </div>
            </div>

            {/* Findings */}
            {threatResult.findings.length === 0 ? (
              <div className="p-3.5 rounded border border-success/40 bg-success-muted text-center text-xs text-success dark:text-emerald-400">
                ✓ {t('threat.noThreats')}
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted flex items-center gap-2">
                  <span>{t('threat.findings')}</span>
                  <span className="badge-neutral font-mono">{threatResult.findings.length}</span>
                </h4>

                <div className="space-y-2">
                  {threatResult.findings.map((f) => {
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
  onOpenGlossary: (termId?: string) => void;
}) {
  const e = finding.explanation;

  return (
    <div className="rounded-lg border border-danger/30 bg-panel dark:bg-panel-dark text-xs overflow-hidden shadow-sm">
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
                  ? (e.source === 'static-signature' ? t('threat.sourceStatic') : t('threat.sourceLlm'))
                  : '✦ AI-Assisted'}
              </span>
              <span className="badge-neutral font-mono text-[9px]">{t('threat.confidence')}: {briefing.confidence}</span>
            </div>

            <button
              onClick={onExplainAI}
              disabled={!canRunAI || isAiLoading}
              title={canRunAI ? 'Generate AI-powered forensic briefing' : 'Requires Online Mode or On-Device model'}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors disabled:opacity-40"
            >
              {isAiLoading ? 'Analyzing...' : '✦ Explain with AI'}
            </button>
          </div>

          <div className="p-2.5 rounded bg-surface dark:bg-surface-dark font-mono text-[11px] text-danger dark:text-red-400 break-all select-text border border-border/60 dark:border-border-dark/60">
            {finding.span.text}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded bg-surface/60 dark:bg-surface-dark/60 border border-border/40 dark:border-border-dark/40">
              <span className="font-semibold text-ink dark:text-ink-dark block mb-0.5">How It Works:</span>
              <p className="text-ink-muted dark:text-ink-dark-muted leading-relaxed">{briefing.mechanism}</p>
            </div>
            <div className="p-2 rounded bg-surface/60 dark:bg-surface-dark/60 border border-border/40 dark:border-border-dark/40">
              <span className="font-semibold text-ink dark:text-ink-dark block mb-0.5">What It Does / Targets:</span>
              <p className="text-ink-muted dark:text-ink-dark-muted leading-relaxed">{briefing.whatItDoes}</p>
            </div>
          </div>

          <ExplanationRow label={t('threat.targets')} value={briefing.targets.join(', ')} />
          {briefing.context && <ExplanationRow label={t('threat.context')} value={briefing.context} />}
          <ExplanationRow label={t('threat.mitigation')} value={briefing.mitigation} />

          {/* AI deep-dive if present */}
          {finding.llmExplanation && (
            <div className="mt-1 rounded border border-accent/40 bg-accent/5 p-2.5 space-y-1.5">
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
            <div className="mt-1 rounded border border-border dark:border-border-dark bg-panel dark:bg-panel-dark p-2 text-[10px] text-ink-muted dark:text-ink-dark-muted">
              ✦ {t('threat.aiDeepDive')}: {finding.llmReviewInconclusive}
            </div>
          )}

          {e.relatedGlossaryTerms.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {e.relatedGlossaryTerms.map((termId) => (
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
            {finding.decodedFrom && finding.decodedFrom.length > 0 ? (
              <div className="space-y-1">
                {finding.decodedFrom.map((hop, i) => (
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
