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
    setCleanedText(result.neutralized);
  }, [text, strategies, intensity, setNeutralizationResult, setCleanedText]);

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
    setCleanedText(res.text);
    setNeutralizationResult({
      original: text,
      neutralized: res.text,
      suggestions: [],
      appliedCount: res.applied,
      beforeZScore: res.beforeZ,
      afterZScore: res.afterZ,
      iterationCount: 1,
      durationMs: 0,
    });
  }, [text, setCleanedText, setNeutralizationResult]);

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

    // Offline: deterministic local pipelines.
    if (rewriteMode === 'neutralize') {
      handleNeutralize();
      setRewriteResult(null);
      return;
    }
    const result = rewriteMode === 'humanize'
      ? humanize(text, intensity)
      : deparaphrase(text, intensity);
    setRewriteResult(result);
    setCleanedText(result.rewritten);
  }, [text, appMode, rewriteMode, intensity, llmConfig, handleNeutralize, setCleanedText, setRewriteResult, setIsLLMProcessing]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border dark:border-border-dark flex-wrap">
        <button onClick={handleDetect} disabled={!text || isDetectingWatermark}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors">
          {t('wm.detect')}
        </button>
        <button onClick={handleSweep} disabled={!text || isDetectingWatermark}
          className="px-3 py-1.5 bg-panel dark:bg-panel-dark text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
          {t('wm.sweep')}
        </button>
        <div className="h-4 w-px bg-border dark:bg-border-dark mx-1" />
        <button onClick={handleNeutralize} disabled={!text}
          className="px-3 py-1.5 bg-warning/20 text-warning text-sm rounded-lg hover:bg-warning/30 disabled:opacity-40 transition-colors">
          {t('wm.neutralize')}
        </button>
        <button onClick={handleWindowAware} disabled={!text} title="Sweep first, then surgically kill the strongest watermark config with exact Δz-ranked edits"
          className="px-3 py-1.5 bg-warning/20 text-warning text-sm rounded-lg hover:bg-warning/30 disabled:opacity-40 transition-colors">
          v2 Kill
        </button>

        <div className="h-4 w-px bg-border dark:bg-border-dark mx-1" />
        <button onClick={() => handlePoison('nfd')} disabled={!text} title="Inject NFD combining marks — visually invisible, shifts every downstream token boundary"
          className="px-3 py-1.5 bg-danger/10 text-danger text-sm rounded-lg hover:bg-danger/20 disabled:opacity-40 transition-colors">
          Poison·NFD
        </button>
        <button onClick={() => handlePoison('word-joiner')} disabled={!text} title="Inject zero-width joiners inside words"
          className="px-3 py-1.5 bg-danger/10 text-danger text-sm rounded-lg hover:bg-danger/20 disabled:opacity-40 transition-colors">
          Poison·ZW
        </button>
        <button onClick={handleDepoison} disabled={!text} title="Strip poisoning artifacts (inverse)"
          className="px-2 py-1.5 text-xs bg-panel dark:bg-panel-dark rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40">
          ↺
        </button>
        <button onClick={handlePollute} disabled={!text} title="Forge 2 alternative watermarks so sweeps report conflicting evidence"
          className="px-3 py-1.5 bg-danger/20 text-danger text-sm font-semibold rounded-lg hover:bg-danger/30 disabled:opacity-40 transition-colors">
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
          className="px-3 py-1.5 bg-success/20 text-success text-sm rounded-lg hover:bg-success/30 disabled:opacity-40 transition-colors">
          {isLLMProcessing ? t('wm.rewriting') : t('wm.rewrite')}
        </button>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel dark:bg-panel-dark text-gray-400" title="Offline uses deterministic local transforms; Online uses your configured LLM.">
          {t('wm.engine')}: {engineLabel}
        </span>
      </div>

      <div className="px-3 py-2 border-b border-border dark:border-border-dark flex items-center gap-3 text-xs flex-wrap">
        <span className="text-gray-400">{t('wm.intensity')}</span>
        {(['light', 'moderate', 'heavy'] as const).map(i => (
          <button key={i} onClick={() => setIntensity(i)}
            className={`px-2 py-0.5 rounded ${intensity === i ? 'bg-accent text-white' : 'bg-panel dark:bg-panel-dark'}`}>
            {t(`common.${i}`)}
          </button>
        ))}
        <div className="h-3 w-px bg-border dark:bg-border-dark mx-1" />
        <span className="text-gray-400" title="Strategies apply to the statistical Neutralize path.">{t('wm.strategies')}</span>
        {(Object.entries(strategies) as Array<[string, boolean]>).map(([key, val]) => (
          <label key={key} className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={val}
              onChange={() => setStrategies(s => ({ ...s, [key]: !val }))}
              className="w-3 h-3" />
            <span>{key}</span>
          </label>
        ))}
      </div>

      {/* On-device model progress (first run downloads the model) */}
      {localProgress && (
        <div className="px-3 py-2 border-b border-border dark:border-border-dark">
          <div className="flex items-center justify-between text-[11px] text-ink-muted dark:text-ink-dark-muted mb-1">
            <span>{localProgress.message}</span>
            {localProgress.status === 'downloading' && <span>{localProgress.percent}%</span>}
          </div>
          <div className="w-full h-1 bg-panel dark:bg-panel-dark rounded-full overflow-hidden border border-border dark:border-border-dark">
            <div className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${localProgress.status === 'downloading' ? localProgress.percent : 100}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-ink-faint dark:text-ink-dark-faint">
            The model downloads once, then runs on your device — no key, fully private.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 text-sm">
        {watermarkResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Stat label={t('wm.zscore')} value={watermarkResult.zScore.toFixed(3)}
                color={watermarkResult.isSignificant ? 'text-danger' : 'text-success'} />
              <Stat label={t('wm.pvalue')} value={watermarkResult.pValue.toFixed(5)} />
              <Stat label={t('wm.greenratio')} value={`${(watermarkResult.greenListRatio * 100).toFixed(1)}%`} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat label={t('wm.tokens')} value={String(watermarkResult.totalTokens)} />
              <Stat label={t('wm.greenhits')} value={String(watermarkResult.greenListHits)} />
              <Stat label={t('wm.duration')} value={`${watermarkResult.durationMs.toFixed(1)}ms`} />
            </div>

            <div className={`px-3 py-2 rounded-lg text-sm ${
              watermarkResult.isSignificant
                ? 'bg-red-50 dark:bg-red-900/20 text-danger'
                : 'bg-green-50 dark:bg-green-900/20 text-success'
            }`}>
              {watermarkResult.isSignificant
                ? `${t('wm.detected')} (z=${watermarkResult.zScore.toFixed(2)}, gamma=${watermarkResult.gamma})`
                : `${t('wm.nosignal')} (z=${watermarkResult.zScore.toFixed(2)})`
              }
            </div>

            <div className="mt-3">
              <h4 className="text-xs font-semibold mb-2">{t('wm.tokenDist')}</h4>
              <div className="flex flex-wrap gap-0.5">
                {watermarkResult.tokens.slice(0, 200).map((t, i) => (
                  <span key={i}
                    className={`inline-block px-1 py-0.5 text-xs rounded ${
                      t.isGreenList
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                    }`}
                    title={`${t.token} (score: ${t.score.toFixed(3)}, ${t.isGreenList ? 'green' : 'red'})`}
                  >
                    {t.token}
                  </span>
                ))}
                {watermarkResult.tokens.length > 200 && (
                  <span className="text-xs text-gray-400 self-center ml-1">
                    ...{watermarkResult.tokens.length - 200} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {watermarkSweep && !watermarkResult && (
          <div className="text-sm text-gray-400">{watermarkSweep.summary}</div>
        )}

        {rewriteResult && (
          <div className="mt-4 pt-4 border-t border-border dark:border-border-dark">
            <h3 className="text-xs font-semibold mb-2">
              {t('wm.rewriteResults')} <span className="text-gray-400 font-normal">({rewriteResult.mode} · {
                rewriteResult.engine === 'local' ? 'local rules'
                  : rewriteResult.engine === 'device' ? 'on-device AI'
                  : 'LLM'
              })</span>
            </h3>
            {rewriteResult.engine === 'local' && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                <Stat label="Footprint Before" value={`${(rewriteResult.beforeScore * 100).toFixed(0)}%`} />
                <Stat label="Footprint After" value={`${(rewriteResult.afterScore * 100).toFixed(0)}%`}
                  color={rewriteResult.afterScore < rewriteResult.beforeScore ? 'text-success' : 'text-danger'} />
                <Stat label="Edits" value={String(rewriteResult.edits.length)} />
              </div>
            )}
            <div className="space-y-1">
              {rewriteResult.edits.slice(0, 30).map((e, i) => (
                <div key={i} className="text-xs px-2 py-1 rounded bg-panel dark:bg-panel-dark flex gap-2">
                  <span className="text-gray-400 shrink-0">{e.type}</span>
                  {e.original && <span className="font-mono line-through text-red-400 truncate">{e.original.slice(0, 40)}</span>}
                  {e.replacement && <span className="text-success font-mono truncate">{e.replacement.slice(0, 40)}</span>}
                </div>
              ))}
              {rewriteResult.engine !== 'local' && rewriteResult.edits.length === 0 && (
                <p className="text-xs text-gray-400">
                  {rewriteResult.engine === 'device' ? 'On-device rewrite applied' : 'LLM rewrite applied'} ({rewriteResult.durationMs.toFixed(0)}ms). See the diff view for changes.
                </p>
              )}
            </div>
          </div>
        )}

        {neutralizationResult && (
          <div className="mt-4 pt-4 border-t border-border dark:border-border-dark">
            <h3 className="text-xs font-semibold mb-2">{t('wm.neutralizeResults')}</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Stat label={t('wm.beforeZ')} value={neutralizationResult.beforeZScore.toFixed(3)} />
              <Stat label={t('wm.afterZ')} value={neutralizationResult.afterZScore.toFixed(3)}
                color={neutralizationResult.afterZScore < neutralizationResult.beforeZScore ? 'text-success' : 'text-danger'} />
              <Stat label={t('wm.changes')} value={String(neutralizationResult.appliedCount)} />
            </div>
            <div className="space-y-1">
              {neutralizationResult.suggestions.slice(0, 20).map((s, i) => (
                <div key={i} className="text-xs px-2 py-1 rounded bg-panel dark:bg-panel-dark flex gap-2">
                  <span className="text-gray-400">{s.strategy}</span>
                  <span className="font-mono line-through text-red-400">{s.originalToken}</span>
                  <span className="text-success font-mono">{s.alternatives[0]?.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {pollutionResult && (
          <div className="mt-4 pt-4 border-t border-border dark:border-border-dark">
            <h3 className="text-xs font-semibold mb-2">Watermark Pollution</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Stat label="Configs forged" value={String(pollutionResult.forgedConfigs.length)} />
              <Stat label="Substitutions" value={String(pollutionResult.substitutions)} />
              <Stat label="Sweep significant hits" value={String(pollutionResult.significantHitsAfter)}
                color={pollutionResult.significantHitsAfter > 1 ? 'text-success' : ''} />
            </div>
            <div className="space-y-1">
              {pollutionResult.forgedConfigs.map((f, i) => (
                <div key={i} className="text-xs px-2 py-1 rounded bg-panel dark:bg-panel-dark flex gap-2 font-mono">
                  <span className="text-gray-400">key={f.config.hashKey}</span>
                  <span>z: {f.beforeZ.toFixed(2)} → <span className="text-success">{f.afterZ.toFixed(2)}</span></span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">{pollutionResult.summary}</p>
          </div>
        )}

        {poisonResult && (
          <div className="mt-4 pt-4 border-t border-border dark:border-border-dark">
            <h3 className="text-xs font-semibold mb-2">Token-Boundary Poisoning</h3>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Injections" value={String(poisonResult.injections)} />
              <Stat label="Mode" value={poisonResult.mode} />
              <Stat label="Coverage" value={`${poisonResult.wordsCovered}/${poisonResult.totalWords}`} />
            </div>
          </div>
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
