import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { optimize, buildObjective } from '../core/oracle/optimizer';
import { regenerateRoundTrip } from '../core/regen/roundtrip';
import { scoreWithLM } from '../core/lm/scorer';

type Engine = 'oracle' | 'roundtrip' | 'lm-score';

export default function OptimizerPanel() {
  const {
    originalText, cleanedText,
    optimizerResult, isOptimizing, lmScore,
    setOptimizerResult, setIsOptimizing, setLmScore, setCleanedText,
  } = useStore();

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

  const beforeScore = optimizerResult ? optimizerResult.before.score : null;
  const afterScore = optimizerResult ? optimizerResult.after.score : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border dark:border-border-dark flex-wrap">
        <select value={engine} onChange={e => setEngine(e.target.value as Engine)}
          className="text-xs bg-panel dark:bg-panel-dark rounded px-2 py-1.5">
          <option value="oracle">Oracle Optimizer</option>
          <option value="roundtrip">Regeneration Round-Trip</option>
          <option value="lm-score">LM Perplexity Score</option>
        </select>

        {engine === 'oracle' && (
          <>
            <label className="flex items-center gap-1 text-xs text-gray-400">
              edits
              <input type="number" min={5} max={200} value={maxEdits}
                onChange={e => setMaxEdits(parseInt(e.target.value) || 60)}
                className="w-14 bg-panel dark:bg-panel-dark rounded px-1 py-0.5" />
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-400">
              budget(s)
              <input type="number" min={2} max={120} value={budget}
                onChange={e => setBudget(parseInt(e.target.value) || 20)}
                className="w-14 bg-panel dark:bg-panel-dark rounded px-1 py-0.5" />
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-400" title="0 = pure greedy; higher explores riskier moves">
              temp
              <input type="number" min={0} max={1} step={0.05} value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value) || 0)}
                className="w-14 bg-panel dark:bg-panel-dark rounded px-1 py-0.5" />
            </label>
          </>
        )}

        <button onClick={handleRun} disabled={!text || isOptimizing}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors">
          {isOptimizing ? 'Working…' : engine === 'lm-score' ? 'Score' : 'Run'}
        </button>
        {optimizerResult && (
          <button
            onClick={() => {
              const { objective } = buildObjective({ watermarkConfigs: 3, includeFootprint: true });
              const currentText = cleanedText ?? originalText;
              const r = objective(currentText);
              setStatus(`Current text detectability: ${(r.score * 100).toFixed(0)}% (${Object.entries(r.details).map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(2) : v}`).join(', ')})`);
            }}
            className="px-2 py-1.5 text-xs bg-panel dark:bg-panel-dark rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Re-check detectability of the current text"
          >
            Verify current text
          </button>
        )}
      </div>

      {status && (
        <div className="px-3 py-1.5 border-b border-border dark:border-border-dark text-xs text-accent">{status}</div>
      )}

      <div className="flex-1 overflow-auto p-3 text-sm space-y-4">
        {!optimizerResult && !lmScore && !isOptimizing && (
          <div className="text-sm text-gray-400 leading-relaxed">
            <p className="font-semibold mb-2">Oracle-Loop Optimization</p>
            <p className="mb-2">
              Every candidate edit is scored against live detector objectives
              (watermark z-scores + stylometric footprint) <em>before</em> it is applied.
              The search runs greedy + simulated annealing until detectability converges
              to the noise floor — no blind intensity fractions.
            </p>
            <p>
              <strong>Regeneration Round-Trip</strong> rewrites sentence-by-sentence with the
              on-device model (best-of-N per sentence, oracle-selected), fully resetting the
              token distribution.
            </p>
          </div>
        )}

        {optimizerResult && (
          <>
            <div className="grid grid-cols-4 gap-3">
              <Stat label="Before" value={`${((beforeScore ?? 0) * 100).toFixed(0)}%`} />
              <Stat label="After" value={`${((afterScore ?? 0) * 100).toFixed(0)}%`}
                color={(afterScore ?? 1) < (beforeScore ?? 0) ? 'text-success' : 'text-danger'} />
              <Stat label="Edits applied" value={String(optimizerResult.editsApplied)} />
              <Stat label="Rejected" value={String(optimizerResult.rejectedCount)} />
            </div>

            <div className={`px-3 py-2 rounded-lg text-sm ${
              afterScore !== null && afterScore < 0.15
                ? 'bg-green-50 dark:bg-green-900/20 text-success'
                : 'bg-yellow-50 dark:bg-yellow-900/20 text-warning'
            }`}>
              {optimizerResult.summary}
            </div>

            {/* Detectability curve */}
            <div>
              <h4 className="text-xs font-semibold mb-2">Detectability curve</h4>
              <Sparkline values={optimizerResult.curve} />
            </div>

            {/* Objective details */}
            <div>
              <h4 className="text-xs font-semibold mb-2">Objective detail (after)</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(optimizerResult.after.details).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs px-2 py-1 rounded bg-panel dark:bg-panel-dark font-mono">
                    <span className="text-gray-400">{k}</span>
                    <span>{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold mb-2">Duration</h4>
              <p className="text-xs text-gray-400">{optimizerResult.durationMs.toFixed(0)} ms</p>
            </div>
          </>
        )}

        {lmScore && (
          <>
            <div className="grid grid-cols-4 gap-3">
              <Stat label="Mean NLL" value={lmScore.meanNll.toFixed(3)} />
              <Stat label="σ windows" value={lmScore.stdNll.toFixed(3)} />
              <Stat label="Uniformity" value={`${(lmScore.uniformity * 100).toFixed(0)}%`} />
              <Stat label="Machine-like" value={`${(lmScore.machineLikelihood * 100).toFixed(0)}%`}
                color={lmScore.machineLikelihood > 0.5 ? 'text-danger' : 'text-success'} />
            </div>
            <div className="px-3 py-2 rounded-lg text-xs bg-panel dark:bg-panel-dark">
              {lmScore.totalTokens} tokens scored in {lmScore.windows.length} windows ·
              {' '}human baseline: μ≈{3.85}, σ≈{0.62} · perplexity range{' '}
              {Math.min(...lmScore.windows.map(w => w.perplexity)).toFixed(1)}–
              {Math.max(...lmScore.windows.map(w => w.perplexity)).toFixed(1)}
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-2">Window NLL curve</h4>
              <Sparkline values={lmScore.windows.map(w => w.meanNll)} invert />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-panel dark:bg-panel-dark rounded-lg px-3 py-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-lg font-mono font-semibold ${color ?? ''}`}>{value}</div>
    </div>
  );
}

function Sparkline({ values, invert }: { values: number[]; invert?: boolean }) {
  if (values.length < 2) return <div className="text-xs text-gray-400">not enough data</div>;
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
    <svg width={w} height={h} className="max-w-full border border-border dark:border-border-dark rounded bg-surface dark:bg-surface-dark">
      <polyline points={pts} fill="none" stroke="currentColor"
        className="text-accent" strokeWidth="1.5" />
    </svg>
  );
}
