import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { optimize, buildObjective } from '../core/oracle/optimizer';
import { regenerateRoundTrip } from '../core/regen/roundtrip';
import { scoreWithLM } from '../core/lm/scorer';

type Engine = 'oracle' | 'roundtrip' | 'lm-score';

const I18N = {
  en: {
    optOracle: 'Oracle Optimizer',
    optRoundtrip: 'Regeneration Round-Trip',
    optLmScore: 'LM Perplexity Score',
    editsLabel: 'edits',
    budgetLabel: 'budget(s)',
    tempLabel: 'temp',
    tempTitle: '0 = pure greedy; higher explores riskier moves',
    btnRun: 'Run',
    btnWorking: 'Working…',
    btnScore: 'Score',
    verifyBtn: 'Verify current text',
    verifyTitle: 'Re-check detectability of the current text',
    statBefore: 'Before',
    statAfter: 'After',
    statEditsApplied: 'Edits applied',
    statRejected: 'Rejected',
    curveTitle: 'Detectability curve',
    objectiveDetail: 'Objective detail (after)',
    durationTitle: 'Duration',
    meanNll: 'Mean NLL',
    stdNll: 'σ windows',
    uniformity: 'Uniformity',
    machineLike: 'Machine-like',
    tokensScored: 'tokens scored in',
    windows: 'windows',
    humanBaseline: 'human baseline: μ≈3.85, σ≈0.62 · perplexity range',
    windowNllCurve: 'Window NLL curve',
    notEnoughData: 'not enough data',
    detectabilityNotice: 'Current text detectability:',
    emptyHeading: 'Oracle-Loop Optimization Engine',
    emptyP1: 'Every candidate edit is scored against live detector objectives (watermark z-scores + stylometric footprint) before it is applied. The search runs greedy + simulated annealing until detectability converges to the noise floor — no blind intensity fractions.',
    emptyP2: 'Regeneration Round-Trip rewrites sentence-by-sentence with the on-device model (best-of-N per sentence, oracle-selected), fully resetting the token distribution.',
  },
  es: {
    optOracle: 'Optimizador Oracle',
    optRoundtrip: 'Regeneración ida y vuelta',
    optLmScore: 'Puntuación de perplejidad LM',
    editsLabel: 'ediciones',
    budgetLabel: 'presupuesto(s)',
    tempLabel: 'temp',
    tempTitle: '0 = codicioso puro; mayor explora movimientos más arriesgados',
    btnRun: 'Ejecutar',
    btnWorking: 'Trabajando…',
    btnScore: 'Puntuar',
    verifyBtn: 'Verificar texto actual',
    verifyTitle: 'Volver a comprobar la detectabilidad del texto actual',
    statBefore: 'Antes',
    statAfter: 'Después',
    statEditsApplied: 'Ediciones aplicadas',
    statRejected: 'Rechazadas',
    curveTitle: 'Curva de detectabilidad',
    objectiveDetail: 'Detalle de objetivos (después)',
    durationTitle: 'Duración',
    meanNll: 'NLL medio',
    stdNll: 'σ ventanas',
    uniformity: 'Uniformidad',
    machineLike: 'Similar a máquina',
    tokensScored: 'tokens evaluados en',
    windows: 'ventanas',
    humanBaseline: 'referencia humana: μ≈3.85, σ≈0.62 · rango de perplejidad',
    windowNllCurve: 'Curva NLL por ventana',
    notEnoughData: 'datos insuficientes',
    detectabilityNotice: 'Detectabilidad del texto actual:',
    emptyHeading: 'Motor de optimización en bucle Oracle',
    emptyP1: 'Cada edición candidata se evalúa contra los objetivos de detectores activos (z-scores de marcas de agua + huella estilométrica) antes de aplicarse.',
    emptyP2: 'La regeneración de ida y vuelta reescribe oración por oración con el modelo local (mejor de N por oración), restableciendo la distribución de tokens.',
  },
  fr: {
    optOracle: 'Optimiseur Oracle',
    optRoundtrip: 'Régénération aller-retour',
    optLmScore: 'Score de perplexité LM',
    editsLabel: 'modifs',
    budgetLabel: 'budget(s)',
    tempLabel: 'temp',
    tempTitle: '0 = glouton pur ; plus élevé explore des mouvements plus risqués',
    btnRun: 'Exécuter',
    btnWorking: 'Traitement…',
    btnScore: 'Évaluer',
    verifyBtn: 'Vérifier le texte actuel',
    verifyTitle: 'Revérifier la détectabilité du texte actuel',
    statBefore: 'Avant',
    statAfter: 'Après',
    statEditsApplied: 'Modifs appliquées',
    statRejected: 'Rejetées',
    curveTitle: 'Courbe de détectabilité',
    objectiveDetail: 'Détail des objectifs (après)',
    durationTitle: 'Durée',
    meanNll: 'NLL moyen',
    stdNll: 'σ fenêtres',
    uniformity: 'Uniformité',
    machineLike: 'Type machine',
    tokensScored: 'jetons évalués dans',
    windows: 'fenêtres',
    humanBaseline: 'référence humaine : μ≈3.85, σ≈0.62 · plage de perplexité',
    windowNllCurve: 'Courbe NLL de fenêtre',
    notEnoughData: 'données insuffisantes',
    detectabilityNotice: 'Détectabilité du texte actuel :',
    emptyHeading: 'Moteur d\'optimisation en boucle Oracle',
    emptyP1: 'Chaque modification candidate est notée par rapport aux objectifs des détecteurs réels avant d\'être appliquée.',
    emptyP2: 'La régénération aller-retour réécrit phrase par phrase avec le modèle local, réinitialisant totalement la distribution des jetons.',
  },
  'pt-BR': {
    optOracle: 'Otimizador Oracle',
    optRoundtrip: 'Regeneração Ida e Volta',
    optLmScore: 'Pontuação de Perplexidade LM',
    editsLabel: 'edições',
    budgetLabel: 'tempo(s)',
    tempLabel: 'temp',
    tempTitle: '0 = guloso puro; maior explora movimentos mais arriscados',
    btnRun: 'Executar',
    btnWorking: 'Trabalhando…',
    btnScore: 'Pontuar',
    verifyBtn: 'Verificar texto atual',
    verifyTitle: 'Reverificar a detectabilidade do texto atual',
    statBefore: 'Antes',
    statAfter: 'Depois',
    statEditsApplied: 'Edições aplicadas',
    statRejected: 'Rejeitadas',
    curveTitle: 'Curva de detectabilidade',
    objectiveDetail: 'Detalhe dos objetivos (depois)',
    durationTitle: 'Duração',
    meanNll: 'NLL médio',
    stdNll: 'σ janelas',
    uniformity: 'Uniformidade',
    machineLike: 'Estilo máquina',
    tokensScored: 'tokens pontuados em',
    windows: 'janelas',
    humanBaseline: 'referência humana: μ≈3.85, σ≈0.62 · faixa de perplexidade',
    windowNllCurve: 'Curva NLL de janela',
    notEnoughData: 'dados insuficientes',
    detectabilityNotice: 'Detectabilidade do texto atual:',
    emptyHeading: 'Motor de Otimização em Loop Oracle',
    emptyP1: 'Cada edição candidata é avaliada contra os objetivos dos detectores em tempo real antes de ser aplicada.',
    emptyP2: 'A regeneração ida e volta reescreve frase por frase com o modelo local, redefinindo completamente a distribuição de tokens.',
  },
  it: {
    optOracle: 'Ottimizzatore Oracle',
    optRoundtrip: 'Rigenerazione Round-Trip',
    optLmScore: 'Punteggio Perplessità LM',
    editsLabel: 'modifiche',
    budgetLabel: 'budget(s)',
    tempLabel: 'temp',
    tempTitle: '0 = puramente greedy; valori più alti esplorano mosse più rischiose',
    btnRun: 'Esegui',
    btnWorking: 'In corso…',
    btnScore: 'Valuta',
    verifyBtn: 'Verifica testo attuale',
    verifyTitle: 'Ricontrolla la rilevabilità del testo attuale',
    statBefore: 'Prima',
    statAfter: 'Dopo',
    statEditsApplied: 'Modifiche applicate',
    statRejected: 'Rifiutate',
    curveTitle: 'Curva di rilevabilità',
    objectiveDetail: 'Dettaglio obiettivi (dopo)',
    durationTitle: 'Durata',
    meanNll: 'NLL medio',
    stdNll: 'σ finestre',
    uniformity: 'Uniformità',
    machineLike: 'Simile a macchina',
    tokensScored: 'token valutati in',
    windows: 'finestre',
    humanBaseline: 'linea base umana: μ≈3.85, σ≈0.62 · intervallo perplessità',
    windowNllCurve: 'Curva NLL finestra',
    notEnoughData: 'dati insufficienti',
    detectabilityNotice: 'Rilevabilità del testo attuale:',
    emptyHeading: 'Motore di Ottimizzazione a Ciclo Oracle',
    emptyP1: 'Ogni modifica candidata viene valutata rispetto agli obiettivi dei rilevatori attivi prima di essere applicata.',
    emptyP2: 'La rigenerazione round-trip riscrive frase per frase con il modello locale, reimpostando completamente la distribuzione dei token.',
  },
};

export default function OptimizerPanel() {
  const {
    originalText, cleanedText, uiLanguage,
    optimizerResult, isOptimizing, lmScore,
    setOptimizerResult, setIsOptimizing, setLmScore, setCleanedText,
  } = useStore();

  const dict = I18N[(uiLanguage as keyof typeof I18N) ?? 'en'] ?? I18N.en;

  const [engine, setEngine] = useState<Engine>('oracle');
  const [maxEdits, setMaxEdits] = useState(60);
  const [budget, setBudget] = useState(20);
  const [temperature, setTemperature] = useState(0.4);
  const [status, setStatus] = useState<string | null>(null);

  const text = cleanedText ?? originalText;

  const handleRun = useCallback(async () => {
    if (!text) return;
    setStatus(null);

    if (engine === 'oracle') {
      setIsOptimizing(true);
      setTimeout(() => {
        try {
          const result = optimize(text, {
            maxEdits,
            timeBudgetMs: budget * 1000,
            temperature,
            watermarkConfigs: 3,
            includeFootprint: true,
          });
          setOptimizerResult(result);
          setCleanedText(result.optimized);
        } finally {
          setIsOptimizing(false);
        }
      });
      return;
    }

    if (engine === 'roundtrip') {
      setIsOptimizing(true);
      try {
        const result = await regenerateRoundTrip(text, {
          samplesPerSentence: 3,
          maxRounds: 3,
          onProgress: (msg) => setStatus(msg),
        });
        setOptimizerResult({
          original: result.original,
          optimized: result.regenerated,
          editsApplied: result.sentencesRewritten,
          before: result.before,
          after: result.after,
          curve: result.curve,
          rejectedCount: 0,
          durationMs: result.durationMs,
          summary: result.summary,
        });
        setCleanedText(result.regenerated);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      } finally {
        setIsOptimizing(false);
      }
      return;
    }

    // LM score
    setIsOptimizing(true);
    setLmScore(null);
    try {
      const result = await scoreWithLM(text, {
        onProgress: (p: { message: string }) => setStatus(p.message),
      });
      setLmScore(result);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsOptimizing(false);
    }
  }, [text, engine, maxEdits, budget, temperature, setIsOptimizing, setOptimizerResult, setCleanedText, setLmScore]);

  const beforeScore = optimizerResult ? (optimizerResult.before?.score ?? null) : null;
  const afterScore = optimizerResult ? (optimizerResult.after?.score ?? null) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Toolbar */}
      <div className="panel-bar">
        <select value={engine} onChange={e => setEngine(e.target.value as Engine)}
          className="text-xs bg-panel dark:bg-panel-dark rounded px-2 py-1.5 border border-border/80 dark:border-border-dark/80">
          <option value="oracle">{dict.optOracle}</option>
          <option value="roundtrip">{dict.optRoundtrip}</option>
          <option value="lm-score">{dict.optLmScore}</option>
        </select>

        {engine === 'oracle' && (
          <>
            <label className="flex items-center gap-1 text-xs text-ink-muted dark:text-ink-dark-muted">
              {dict.editsLabel}
              <input type="number" min={5} max={200} value={maxEdits}
                onChange={e => setMaxEdits(parseInt(e.target.value) || 60)}
                className="w-14 bg-panel dark:bg-panel-dark border border-border/80 dark:border-border-dark/80 rounded px-1 py-0.5" />
            </label>
            <label className="flex items-center gap-1 text-xs text-ink-muted dark:text-ink-dark-muted">
              {dict.budgetLabel}
              <input type="number" min={2} max={120} value={budget}
                onChange={e => setBudget(parseInt(e.target.value) || 20)}
                className="w-14 bg-panel dark:bg-panel-dark border border-border/80 dark:border-border-dark/80 rounded px-1 py-0.5" />
            </label>
            <label className="flex items-center gap-1 text-xs text-ink-muted dark:text-ink-dark-muted" title={dict.tempTitle}>
              {dict.tempLabel}
              <input type="number" min={0} max={1} step={0.05} value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value) || 0)}
                className="w-14 bg-panel dark:bg-panel-dark border border-border/80 dark:border-border-dark/80 rounded px-1 py-0.5" />
            </label>
          </>
        )}

        <button onClick={handleRun} disabled={!text || isOptimizing}
          className="btn-primary">
          {isOptimizing ? dict.btnWorking : engine === 'lm-score' ? dict.btnScore : dict.btnRun}
        </button>
        {optimizerResult && (
          <button
            onClick={() => {
              const { objective } = buildObjective({ watermarkConfigs: 3, includeFootprint: true });
              const currentText = cleanedText ?? originalText;
              const r = objective(currentText);
              setStatus(`${dict.detectabilityNotice} ${(r.score * 100).toFixed(0)}% (${Object.entries(r.details).map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(2) : v}`).join(', ')})`);
            }}
            className="btn-ghost"
            title={dict.verifyTitle}
          >
            {dict.verifyBtn}
          </button>
        )}
      </div>

      {status && (
        <div className="px-3 py-1.5 border-b border-border dark:border-border-dark text-xs text-accent bg-accent/5">{status}</div>
      )}

      <div className="flex-1 overflow-auto p-4 text-sm space-y-4">
        {!optimizerResult && !lmScore && !isOptimizing && (
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
              <path d="M10 50h44" />
              <path d="M14 50V14" />
              <path d="M14 18c8 2 16 12 22 20s12 10 18 12" strokeWidth="2.2" />
              <circle cx="28" cy="30" r="3" fill="currentColor" />
              <circle cx="42" cy="44" r="3" fill="currentColor" />
              <path d="M48 20l6 6-6 6" />
              <path d="M30 14h24v12" strokeDasharray="2 3" opacity="0.6" />
            </svg>
            <h3 className="text-sm font-bold text-ink dark:text-ink-dark">{dict.emptyHeading}</h3>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted max-w-md leading-relaxed">{dict.emptyP1}</p>
            <p className="text-xs text-ink-faint dark:text-ink-dark-faint max-w-md leading-relaxed">{dict.emptyP2}</p>
          </div>
        )}

        {optimizerResult && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label={dict.statBefore} value={`${((beforeScore ?? 0) * 100).toFixed(0)}%`} />
              <Stat label={dict.statAfter} value={`${((afterScore ?? 0) * 100).toFixed(0)}%`}
                color={(afterScore ?? 1) < (beforeScore ?? 0) ? 'text-success' : 'text-danger'} />
              <Stat label={dict.statEditsApplied} value={String(optimizerResult.editsApplied ?? 0)} />
              <Stat label={dict.statRejected} value={String(optimizerResult.rejectedCount ?? 0)} />
            </div>

            <div className={`p-3.5 rounded-xl text-xs leading-relaxed border shadow-sm ${
              afterScore !== null && afterScore < 0.15
                ? 'bg-success-muted/30 border-success/40 text-success dark:text-emerald-400'
                : 'bg-warning-muted/30 border-warning/40 text-warning dark:text-yellow-400'
            }`}>
              {optimizerResult.summary}
            </div>

            {/* Detectability curve */}
            <div className="panel-card p-3.5 space-y-2">
              <h4 className="text-xs font-semibold text-ink dark:text-ink-dark">{dict.curveTitle}</h4>
              <Sparkline values={Array.isArray(optimizerResult.curve) ? optimizerResult.curve : []} notEnoughText={dict.notEnoughData} />
            </div>

            {/* Objective details */}
            <div className="panel-card p-3.5 space-y-2">
              <h4 className="text-xs font-semibold text-ink dark:text-ink-dark">{dict.objectiveDetail}</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(optimizerResult.after?.details ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs px-2.5 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-border/60 dark:border-border-dark/60 font-mono">
                    <span className="text-ink-muted dark:text-ink-dark-muted">{k}</span>
                    <span className="font-semibold text-ink dark:text-ink-dark">{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-card p-3.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink dark:text-ink-dark">{dict.durationTitle}</span>
              <span className="text-xs font-mono text-ink-muted dark:text-ink-dark-muted">{(optimizerResult.durationMs ?? 0).toFixed(0)} ms</span>
            </div>
          </>
        )}

        {lmScore && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label={dict.meanNll} value={(lmScore.meanNll ?? 0).toFixed(3)} />
              <Stat label={dict.stdNll} value={(lmScore.stdNll ?? 0).toFixed(3)} />
              <Stat label={dict.uniformity} value={`${((lmScore.uniformity ?? 0) * 100).toFixed(0)}%`} />
              <Stat label={dict.machineLike} value={`${((lmScore.machineLikelihood ?? 0) * 100).toFixed(0)}%`}
                color={(lmScore.machineLikelihood ?? 0) > 0.5 ? 'text-danger' : 'text-success'} />
            </div>
            <div className="p-3.5 rounded-xl text-xs bg-panel dark:bg-panel-dark border border-border dark:border-border-dark shadow-sm leading-relaxed">
              {lmScore.totalTokens ?? 0} {dict.tokensScored} {(lmScore.windows ?? []).length} {dict.windows} · {dict.humanBaseline}{' '}
              {(lmScore.windows && lmScore.windows.length > 0)
                ? `${Math.min(...lmScore.windows.map(w => w.perplexity ?? 0)).toFixed(1)}–${Math.max(...lmScore.windows.map(w => w.perplexity ?? 0)).toFixed(1)}`
                : 'N/A'}
            </div>
            <div className="panel-card p-3.5 space-y-2">
              <h4 className="text-xs font-semibold text-ink dark:text-ink-dark">{dict.windowNllCurve}</h4>
              <Sparkline values={(lmScore.windows ?? []).map(w => w.meanNll ?? 0)} invert notEnoughText={dict.notEnoughData} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-xl px-3 py-2 shadow-sm">
      <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted uppercase font-semibold">{label}</div>
      <div className={`text-base font-mono font-bold ${color ?? 'text-ink dark:text-ink-dark'}`}>{value}</div>
    </div>
  );
}

function Sparkline({ values, invert, notEnoughText }: { values: number[]; invert?: boolean; notEnoughText: string }) {
  if (!values || values.length < 2) return <div className="text-xs text-ink-muted dark:text-ink-dark-muted">{notEnoughText}</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 300;
  const h = 60;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    let yNorm = (v - min) / range;
    if (invert) yNorm = 1 - yNorm;
    const y = h - yNorm * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="max-w-full border border-border dark:border-border-dark rounded-lg bg-surface dark:bg-surface-dark shadow-inner">
      <polyline points={pts} fill="none" stroke="currentColor"
        className="text-accent" strokeWidth="1.5" />
    </svg>
  );
}
