import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { detectWatermark, sweepDetection } from '../core/watermark';
import { neutralize } from '../core/watermark/neutralize';
import { humanize, deparaphrase } from '../core/rewrite';
import { rewriteWithLLM, REWRITE_PROMPTS } from '../core/llm/client';
import { rewriteLocal } from '../core/llm/local';
import type { LocalProgress } from '../core/llm/local';
import type { NeutralizationOptions } from '../core/watermark/types';
import type { RewriteMode } from '../core/rewrite/types';
import { poisonBoundaries, depoison } from '../core/poison/tokenBoundary';
import { pollute } from '../core/spoof/pollution';
import { neutralizeWindowAware } from '../core/watermark/windowAware';

export default function WatermarkPanel() {
  const {
    originalText, cleanedText, appMode,
    watermarkResult, watermarkSweep, neutralizationResult, rewriteResult,
    isDetectingWatermark, llmConfig, isLLMProcessing,
    pollutionResult, poisonResult,
    setWatermarkResult, setWatermarkSweep, setNeutralizationResult, setRewriteResult,
    setIsDetectingWatermark, setCleanedText, setIsLLMProcessing,
    setPollutionResult, setPoisonResult,
  } = useStore();

  const applyTextMutation = useStore((s: any) => s.applyTextMutation);

  const t = useT();
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const [strategies, setStrategies] = useState({
    synonym: true, reorder: true, homoglyph: false, whitespace: true,
  });
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>('humanize');
  const [localProgress, setLocalProgress] = useState<LocalProgress | null>(null);

  const text = cleanedText ?? originalText;
  const isOnDevice = appMode === 'online' && llmConfig.provider === 'local';
  const engineLabel = appMode === 'online' ? (isOnDevice ? 'on-device AI' : 'LLM') : 'local';

  const handleDetect = useCallback(() => {
    if (!text) return;
    setIsDetectingWatermark(true);
    setTimeout(() => {
      const result = detectWatermark(text);
      setWatermarkResult(result);
      setIsDetectingWatermark(false);
    });
  }, [text, setWatermarkResult, setIsDetectingWatermark]);

  const handleSweep = useCallback(() => {
    if (!text) return;
    setIsDetectingWatermark(true);
    setTimeout(() => {
      const sweep = sweepDetection(text);
      setWatermarkSweep(sweep);
      setWatermarkResult(sweep.bestResult);
      setIsDetectingWatermark(false);
    });
  }, [text, setWatermarkSweep, setWatermarkResult, setIsDetectingWatermark]);

  const handleNeutralize = useCallback(() => {
    if (!text) return;
    const enabledStrategies = new Set(
      (Object.entries(strategies) as Array<[keyof typeof strategies, boolean]>)
        .filter(([, v]) => v)
        .map(([k]) => k)
    ) as NeutralizationOptions['strategies'];

    const result = neutralize(text, { strategies: enabledStrategies, intensity });
    setNeutralizationResult(result);
    const target = result.neutralized;

    if (typeof applyTextMutation === 'function') {
      applyTextMutation(target, 'watermark-neutralize', 'Neutralize Watermark');
    }
    setCleanedText(target);
  }, [text, strategies, intensity, setNeutralizationResult, setCleanedText, applyTextMutation]);

  // v2: window-aware targeted neutralization (exact marginal Δz ranking)
  const handleWindowAware = useCallback(() => {
    if (!text) return;
    // Sweep once to lock onto the strongest config, then surgically kill it.
    const sweep = sweepDetection(text);
    const best = sweep.bestResult;
    const res = neutralizeWindowAware(
      text,
      best.gamma,
      best.hashKey,
      best.windowSize,
      1.5,
      Math.max(10, Math.floor(text.length / 40)),
    );
    const target = res.text;

    if (typeof applyTextMutation === 'function') {
      applyTextMutation(target, 'watermark-neutralize', 'Neutralize Watermark (Window-Aware)');
    }
    setCleanedText(target);

    setNeutralizationResult({
      original: text,
      neutralized: target,
      suggestions: [],
      appliedCount: res.applied,
      beforeZScore: res.beforeZ,
      afterZScore: res.afterZ,
      iterationCount: 1,
      durationMs: 0,
    });
  }, [text, setCleanedText, setNeutralizationResult, applyTextMutation]);

  // v2: token-boundary poisoning
  const handlePoison = useCallback((mode: 'word-joiner' | 'nfd' | 'aggressive') => {
    if (!text) return;
    const result = poisonBoundaries(text, mode, intensity === 'light' ? 'light' : intensity === 'moderate' ? 'moderate' : 'heavy');
    setPoisonResult(result);
    setCleanedText(result.poisoned);
  }, [text, intensity, setPoisonResult, setCleanedText]);

  const handleDepoison = useCallback(() => {
    if (!text) return;
    setCleanedText(depoison(text));
  }, [text, setCleanedText]);

  // v2: watermark pollution — forge conflicting signals
  const handlePollute = useCallback(() => {
    if (!text) return;
    const result = pollute(text, { configs: 2, targetZ: 3.0 });
    setPollutionResult(result);
    setCleanedText(result.polluted);
  }, [text, setPollutionResult, setCleanedText]);

  // Unified rewrite entry point — works offline (rule-based) and online (LLM).
  const handleRewrite = useCallback(async () => {
    if (!text) return;

    if (appMode === 'online') {
      const onDevice = llmConfig.provider === 'local';
      setIsLLMProcessing(true);
      setLocalProgress(null);
      try {
        const result = onDevice
          ? await rewriteLocal(text, rewriteMode, llmConfig.model, setLocalProgress)
          : await rewriteWithLLM(text, REWRITE_PROMPTS[rewriteMode], llmConfig);
        if (!result.text) {
          throw new Error(onDevice
            ? 'The on-device model returned nothing. Try the "Better (248M)" model, or a shorter passage.'
            : 'The model returned an empty response.');
        }
        setCleanedText(result.text);
        setRewriteResult({
          mode: rewriteMode, engine: onDevice ? 'device' : 'llm', original: text, rewritten: result.text,
          edits: [], beforeScore: 0, afterScore: 0, durationMs: result.durationMs,
        });
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Rewrite failed');
      } finally {
        setIsLLMProcessing(false);
        setLocalProgress(null);
      }
      return;
    }

    // Offline mode: deterministic rule-based rewrites
    const result = rewriteMode === 'humanize' ? humanize(text) : deparaphrase(text);
    setCleanedText(result.rewritten);
    setRewriteResult({ ...result, engine: 'local' });
  }, [text, appMode, llmConfig, rewriteMode, setIsLLMProcessing, setCleanedText, setRewriteResult]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Top Toolbar */}
      <div className="panel-bar">
        <button onClick={handleDetect} disabled={!text || isDetectingWatermark}
          className="btn-primary">
          {isDetectingWatermark ? t('wm.detecting') : t('wm.detect')}
        </button>
        <button onClick={handleSweep} disabled={!text || isDetectingWatermark}
          className="btn-ghost" title="Sweep 216 key/window/gamma combinations to detect watermarks when the exact key is unknown">
          {t('wm.sweep')}
        </button>
        <button onClick={handleNeutralize} disabled={!text}
          className="btn-warn" title="Neutralize watermark tokens">
          {t('wm.neutralize')}
        </button>
        <button onClick={handleWindowAware} disabled={!text}
          className="btn-ghost" title="Window-aware watermark killer (Δz targeted suppression)">
          Δz Killer
        </button>

        <div className="h-4 w-px bg-border dark:bg-border-dark mx-1" />
        <button onClick={() => handlePoison('word-joiner')} disabled={!text} title="Word-joiner token boundary poisoning"
          className="btn-ghost">
          Poison
        </button>
        <button onClick={handleDepoison} disabled={!text} title="Strip poisoning artifacts (inverse)"
          className="px-2 py-1.5 text-xs bg-panel dark:bg-panel-dark rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40">
          ↺
        </button>
        <button onClick={handlePollute} disabled={!text} title="Forge 2 alternative watermarks so sweeps report conflicting evidence"
          className="btn-ghost text-danger">
          Pollute
        </button>

        <div className="h-4 w-px bg-border dark:bg-border-dark mx-1" />
        <select value={rewriteMode} onChange={e => setRewriteMode(e.target.value as RewriteMode)}
          className="text-xs bg-panel dark:bg-panel-dark rounded px-2 py-1">
          <option value="humanize">Humanize</option>
          <option value="deparaphrase">Deparaphrase</option>
          <option value="neutralize">Neutralize</option>
        </select>
        <button onClick={handleRewrite} disabled={!text || isLLMProcessing}
          className="btn-ghost text-success">
          {isLLMProcessing ? t('wm.rewriting') : t('wm.rewrite')}
        </button>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel dark:bg-panel-dark text-ink-muted dark:text-ink-dark-muted ml-auto" title="Offline uses deterministic local transforms; Online uses your configured LLM.">
          {t('wm.engine')}: {engineLabel}
        </span>
      </div>

      {/* Strategies and Intensity */}
      <div className="px-4 py-2 border-b border-border dark:border-border-dark flex items-center gap-3 text-xs flex-wrap bg-panel/40 dark:bg-panel-dark/40">
        <span className="text-ink-muted dark:text-ink-dark-muted">{t('wm.intensity')}</span>
        {(['light', 'moderate', 'heavy'] as const).map(i => (
          <button key={i} onClick={() => setIntensity(i)}
            className={`px-2 py-0.5 rounded transition-colors ${intensity === i ? 'bg-accent text-white font-semibold' : 'btn-ghost'}`}>
            {t(`common.${i}`)}
          </button>
        ))}
        <div className="h-3 w-px bg-border dark:bg-border-dark mx-1" />
        <span className="text-ink-muted dark:text-ink-dark-muted" title="Strategies apply to the statistical Neutralize path.">{t('wm.strategies')}</span>
        {(Object.entries(strategies) as Array<[string, boolean]>).map(([key, val]) => (
          <label key={key} className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={val}
              onChange={() => setStrategies(s => ({ ...s, [key]: !val }))}
              className="w-3.5 h-3.5 accent-accent" />
            <span className="text-[11px]">{key}</span>
          </label>
        ))}
      </div>

      {/* On-device model progress (first run downloads the model) */}
      {localProgress && (
        <div className="px-4 py-2 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark">
          <div className="flex items-center justify-between text-[11px] text-ink-muted dark:text-ink-dark-muted mb-1">
            <span>{localProgress.message}</span>
            {localProgress.status === 'downloading' && <span>{localProgress.percent}%</span>}
          </div>
          <div className="w-full h-1 bg-surface dark:bg-surface-dark rounded-full overflow-hidden border border-border dark:border-border-dark">
            <div className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${localProgress.status === 'downloading' ? localProgress.percent : 100}%` }} />
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {watermarkResult && (
          <div className="space-y-3">
            {/* Plain-English Verdict Banner */}
            <div className={`p-4 rounded-xl border-2 flex items-start gap-3 shadow-sm ${
              watermarkResult.isSignificant
                ? 'border-danger bg-danger/10 dark:bg-danger/20 text-danger dark:text-red-300'
                : 'border-success bg-success/10 dark:bg-success/20 text-success dark:text-emerald-300'
            }`}>
              <span className="text-2xl shrink-0 mt-0.5">
                {watermarkResult.isSignificant ? '⚠' : '✓'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">
                  {watermarkResult.isSignificant
                    ? 'Statistical Token Watermark Detected'
                    : 'No Hidden Watermark Detected'}
                </div>
                <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5 leading-relaxed">
                  {watermarkResult.isSignificant
                    ? `The text exhibits a statistically improbable token green-list concentration (z = ${watermarkResult.zScore.toFixed(2)}, γ = ${watermarkResult.gamma}), indicating synthetic LLM watermarking.`
                    : `Token distributions match natural human writing variation (z = ${watermarkResult.zScore.toFixed(2)}), with no statistically significant watermark pattern.`}
                </p>
              </div>
            </div>

            {/* Progressive Disclosure: Technical Statistical Details */}
            <details className="rounded-xl border border-border dark:border-border-dark bg-panel/50 dark:bg-panel-dark/50 p-3 space-y-3">
              <summary className="text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted cursor-pointer hover:text-ink transition-colors">
                Show Technical Statistical Details (γ, z-score, p-value)
              </summary>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <Stat label="Statistical z-Score" value={watermarkResult.zScore.toFixed(3)}
                  color={watermarkResult.isSignificant ? 'text-danger' : 'text-success'} />
                <Stat label="p-Value" value={watermarkResult.pValue < 0.00001 ? '< 0.00001' : watermarkResult.pValue.toFixed(5)} />
                <Stat label="Green-List Ratio" value={`${(watermarkResult.greenListRatio * 100).toFixed(1)}%`} />
                <Stat label="Tokens Evaluated" value={String(watermarkResult.totalTokens)} />
                <Stat label="Green-List Hits" value={String(watermarkResult.greenListHits)} />
                <Stat label="Detection Duration" value={`${watermarkResult.durationMs.toFixed(1)}ms`} />
              </div>
            </details>

            {/* Token Distribution Visualizer */}
            <div className="p-3.5 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark">
              <h4 className="text-xs font-semibold mb-2 text-ink dark:text-ink-dark">{t('wm.tokenDist')}</h4>
              <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
                {watermarkResult.tokens.slice(0, 200).map((tok, i) => (
                  <span
                    key={i}
                    className={`inline-block px-1.5 py-0.5 text-[11px] font-mono rounded ${
                      tok.isGreenList
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-300/40'
                        : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-300/40'
                    }`}
                    title={`${tok.token} (score: ${tok.score.toFixed(3)}, ${tok.isGreenList ? 'green' : 'red'})`}
                  >
                    {tok.token}
                  </span>
                ))}
                {watermarkResult.tokens.length > 200 && (
                  <span className="text-xs text-ink-muted dark:text-ink-dark-muted self-center ml-1">
                    +{watermarkResult.tokens.length - 200} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {watermarkSweep && !watermarkResult && (
          <div className="text-sm text-ink-muted dark:text-ink-dark-muted p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark">
            {watermarkSweep.summary}
          </div>
        )}

        {rewriteResult && (
          <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-3">
            <h3 className="text-xs font-semibold text-ink dark:text-ink-dark">
              {t('wm.rewriteResults')}{' '}
              <span className="text-ink-muted dark:text-ink-dark-muted font-normal">
                ({rewriteResult.mode} · {
                  rewriteResult.engine === 'local' ? 'local rules'
                    : rewriteResult.engine === 'device' ? 'on-device AI'
                    : 'LLM'
                })
              </span>
            </h3>
            {rewriteResult.engine === 'local' && (
              <div className="grid grid-cols-3 gap-2.5 mb-2">
                <Stat label="Footprint Before" value={`${(rewriteResult.beforeScore * 100).toFixed(0)}%`} />
                <Stat label="Footprint After" value={`${(rewriteResult.afterScore * 100).toFixed(0)}%`}
                  color={rewriteResult.afterScore < rewriteResult.beforeScore ? 'text-success' : 'text-danger'} />
                <Stat label="Edits" value={String(rewriteResult.edits.length)} />
              </div>
            )}
            <div className="space-y-1">
              {rewriteResult.edits.slice(0, 30).map((e, i) => (
                <div key={i} className="text-xs px-2.5 py-1 rounded bg-surface dark:bg-surface-dark flex gap-2">
                  <span className="text-ink-muted shrink-0">{e.type}</span>
                  {e.original && <span className="font-mono line-through text-red-400 truncate">{e.original.slice(0, 40)}</span>}
                  {e.replacement && <span className="text-success font-mono truncate">{e.replacement.slice(0, 40)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {neutralizationResult && (
          <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-3">
            <h3 className="text-xs font-semibold text-ink dark:text-ink-dark">{t('wm.neutralizeResults')}</h3>
            <div className="grid grid-cols-3 gap-2.5 mb-2">
              <Stat label={t('wm.beforeZ')} value={neutralizationResult.beforeZScore.toFixed(3)} />
              <Stat label={t('wm.afterZ')} value={neutralizationResult.afterZScore.toFixed(3)}
                color={neutralizationResult.afterZScore < neutralizationResult.beforeZScore ? 'text-success' : 'text-danger'} />
              <Stat label={t('wm.changes')} value={String(neutralizationResult.appliedCount)} />
            </div>
            <div className="space-y-1">
              {neutralizationResult.suggestions.slice(0, 20).map((s, i) => (
                <div key={i} className="text-xs px-2.5 py-1 rounded bg-surface dark:bg-surface-dark flex gap-2">
                  <span className="text-ink-muted">{s.strategy}</span>
                  <span className="font-mono line-through text-red-400">{s.originalToken}</span>
                  <span className="text-success font-mono">{s.alternatives[0]?.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pollutionResult && (
          <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-3">
            <h3 className="text-xs font-semibold text-ink dark:text-ink-dark">Watermark Pollution</h3>
            <div className="grid grid-cols-3 gap-2.5 mb-2">
              <Stat label="Configs forged" value={String(pollutionResult.forgedConfigs.length)} />
              <Stat label="Substitutions" value={String(pollutionResult.substitutions)} />
              <Stat label="Significant hits after" value={String(pollutionResult.significantHitsAfter)}
                color={pollutionResult.significantHitsAfter > 1 ? 'text-success' : ''} />
            </div>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{pollutionResult.summary}</p>
          </div>
        )}

        {poisonResult && (
          <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-3">
            <h3 className="text-xs font-semibold text-ink dark:text-ink-dark">Token-Boundary Poisoning</h3>
            <div className="grid grid-cols-3 gap-2.5">
              <Stat label="Injections" value={String(poisonResult.injections)} />
              <Stat label="Mode" value={poisonResult.mode} />
              <Stat label="Coverage" value={`${poisonResult.wordsCovered}/${poisonResult.totalWords}`} />
            </div>
          </div>
        )}

        {!watermarkResult && !watermarkSweep && !neutralizationResult && !pollutionResult && !poisonResult && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-muted dark:text-ink-dark-muted space-y-2">
            <span className="text-3xl opacity-40 font-mono">⊕</span>
            <p className="text-xs">Run Detect or Sweep to test for statistical token watermarks.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface dark:bg-surface-dark border border-border/60 dark:border-border-dark/60 rounded-lg px-3 py-2">
      <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted uppercase font-semibold">{label}</div>
      <div className={`text-base font-mono font-bold ${color ?? 'text-ink dark:text-ink-dark'}`}>{value}</div>
    </div>
  );
}
