import { useCallback, useState, useEffect } from 'react';
import { useStore } from '../store';
import { testConnection } from '../core/llm/client';
import { PROVIDER_PRESETS, LOCAL_MODELS, LOCAL_AUX_MODELS, type LocalModelOption } from '../core/llm/types';
import type { LLMProvider } from '../core/llm/types';
import {
  preloadLocalModel,
  isModelReady,
  detectHardwareAcceleration,
  getModelStorage,
  clearModelStorage,
} from '../core/llm/local';
import type { LocalProgress } from '../core/llm/local';
import { openExternal } from '../lib/openExternal';
import { useT } from '../i18n';

const PLUG_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
  </svg>
);

const BRAIN_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04"/>
  </svg>
);

const ALL_PROVIDERS: LLMProvider[] = ['local', 'ollama', 'uncensored-offline', 'openai', 'anthropic', 'gemini'];
const OFFLINE_SAFE_PROVIDERS: LLMProvider[] = ['local', 'ollama', 'uncensored-offline'];

export default function LLMConfigPanel() {
  const { llmConfig, setLLMConfig, llmConnected, setLLMConnected, appMode, openHelp } = useStore();
  const t = useT();

  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState<LocalProgress | null>(null);
  const [storage, setStorage] = useState<{ files: number; usageMb: number | null; supported: boolean } | null>(null);
  const [hwAccel, setHwAccel] = useState<'webgpu' | 'wasm'>('wasm');
  const [hubOpen, setHubOpen] = useState(false);

  useEffect(() => {
    detectHardwareAcceleration().then(setHwAccel);
  }, []);

  const availableProviders = appMode === 'offline' ? OFFLINE_SAFE_PROVIDERS : ALL_PROVIDERS;
  const isLocal = llmConfig.provider === 'local';

  const refreshStorage = useCallback(() => {
    getModelStorage().then(setStorage);
  }, []);

  useEffect(() => {
    if (isLocal) refreshStorage();
  }, [isLocal, refreshStorage]);

  const handleClearModel = useCallback(async () => {
    if (!confirm(t('llm.deleteConfirm'))) return;
    await clearModelStorage();
    setLocalProgress(null);
    refreshStorage();
  }, [refreshStorage, t]);

  const handleProviderChange = useCallback((provider: LLMProvider) => {
    const p = PROVIDER_PRESETS[provider];
    setLLMConfig({ provider, endpoint: p.endpoint, model: p.model });
    setLLMConnected(false);
    setTestError(null);
    setLocalProgress(null);
  }, [setLLMConfig, setLLMConnected]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestError(null);
    const result = await testConnection(llmConfig);
    setLLMConnected(result.ok);
    setTestError(result.ok ? null : (result.error ?? 'Connection failed'));
    setTesting(false);
  }, [llmConfig, setLLMConnected]);

  const handleDownload = useCallback(async (targetModel?: string) => {
    const modelToDownload = targetModel ?? llmConfig.model;
    setTestError(null);
    setLocalProgress({ status: 'downloading', percent: 0, message: 'Starting…' });
    try {
      await preloadLocalModel(modelToDownload, setLocalProgress);
      refreshStorage();
    } catch (err: any) {
      setTestError(err?.message ?? 'Download failed');
    }
  }, [llmConfig.model, refreshStorage]);

  const ready = isLocal && (isModelReady(llmConfig.model) || localProgress?.status === 'ready');
  const preset = PROVIDER_PRESETS[llmConfig.provider] ?? PROVIDER_PRESETS.local;

  return (
    <div className="border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
      {/* Main configuration bar */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint dark:text-ink-dark-faint shrink-0">
          {isLocal ? BRAIN_ICON : PLUG_ICON}
          {isLocal ? t('hub.title') : 'LLM Provider'}
        </span>

        {/* Hardware Acceleration Indicator */}
        {isLocal && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${
              hwAccel === 'webgpu'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
            }`}
            title={hwAccel === 'webgpu' ? 'WebGPU accelerated inference' : 'CPU WebAssembly inference'}
          >
            ⚡ {hwAccel.toUpperCase()}
          </span>
        )}

        {/* Provider selector */}
        <select
          value={llmConfig.provider}
          onChange={e => handleProviderChange(e.target.value as LLMProvider)}
          className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 shrink-0"
          aria-label="LLM provider"
        >
          {availableProviders.map(p => (
            <option key={p} value={p}>{PROVIDER_PRESETS[p].label}</option>
          ))}
        </select>

        {isLocal ? (
          <>
            {/* Primary Model dropdown */}
            <select
              value={llmConfig.model}
              onChange={e => { setLLMConfig({ model: e.target.value }); setLocalProgress(null); }}
              className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50"
              aria-label="On-device model"
            >
              {LOCAL_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} · ~{m.approxSizeMb} MB {m.supportsJsonAnalysis ? '✓ JSON' : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleDownload()}
              disabled={localProgress?.status === 'downloading' || localProgress?.status === 'preparing'}
              className="btn-primary py-1 px-2.5 text-[11px] shrink-0 disabled:opacity-50"
            >
              {ready ? t('llm.reload') : localProgress?.status === 'downloading' ? `${localProgress.percent}%` : t('llm.download')}
            </button>

            {/* Hub modal toggle button */}
            <button
              type="button"
              onClick={() => setHubOpen(!hubOpen)}
              className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                hubOpen
                  ? 'bg-accent text-white border-accent'
                  : 'btn-ghost text-ink-muted dark:text-ink-dark-muted hover:text-accent border-border dark:border-border-dark'
              }`}
              title="Explore all on-device models and capabilities"
            >
              {hubOpen ? 'Close Hub ▴' : 'Models Catalog ▾'}
            </button>

            {/* Which Model Should I Pick? guide button */}
            <button
              type="button"
              onClick={() => openHelp('h-local-models')}
              className="text-[11px] text-accent hover:underline flex items-center gap-1 font-medium"
              title="Open Local AI Models Guide in Help"
            >
              {t('hub.whichModel')}
            </button>

            {/* Clear model cache */}
            <button
              type="button"
              onClick={handleClearModel}
              disabled={!storage?.files || storage.files === 0}
              title={t('llm.deleteTitle')}
              className="px-2 py-1 text-[11px] font-semibold rounded bg-danger-muted text-danger dark:text-red-400 hover:bg-danger/25 border border-danger/30 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ml-auto"
            >
              {t('action.deleteLlm')}
            </button>
          </>
        ) : (
          <>
            {/* External / Remote Provider inputs */}
            <input
              type="text"
              value={llmConfig.endpoint}
              onChange={e => setLLMConfig({ endpoint: e.target.value })}
              placeholder="Endpoint URL"
              className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 min-w-[160px]"
              aria-label="Endpoint URL"
            />

            {preset.needsKey && (
              <input
                type="password"
                value={llmConfig.apiKey ?? ''}
                onChange={e => setLLMConfig({ apiKey: e.target.value })}
                placeholder="API Key"
                className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 w-28"
                aria-label="API Key"
              />
            )}

            <input
              type="text"
              value={llmConfig.model}
              onChange={e => setLLMConfig({ model: e.target.value })}
              placeholder="Model name"
              className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 w-28"
              aria-label="Model name"
            />

            <button
              onClick={handleTest}
              disabled={testing}
              className="btn-primary py-1 px-2.5 text-[11px] shrink-0 disabled:opacity-50"
            >
              {testing ? t('llm.testing') : t('llm.test')}
            </button>

            {preset.keyUrl && (
              <button
                type="button"
                onClick={() => openExternal(preset.keyUrl!)}
                className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
              >
                {t('llm.getKey')}
              </button>
            )}

            {llmConnected && (
              <span className="text-[11px] font-mono text-success dark:text-emerald-400">
                ✓ {t('llm.connected')}
              </span>
            )}
          </>
        )}
      </div>

      {/* Download Progress Bar */}
      {localProgress && localProgress.status === 'downloading' && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-[10px] text-ink-muted dark:text-ink-dark-muted mb-1 font-mono">
            <span>{localProgress.message}</span>
            <span>{localProgress.percent}%</span>
          </div>
          <div className="w-full bg-border dark:bg-border-dark rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-accent h-1.5 transition-all duration-200"
              style={{ width: `${localProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {testError && (
        <div className="px-4 pb-2 text-[11px] text-danger dark:text-red-400 font-mono">
          ⚠ {testError}
        </div>
      )}

      {/* Expanded Local AI Models Catalog Tray */}
      {hubOpen && isLocal && (
        <div className="border-t border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4 animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-ink-dark flex items-center gap-1.5">
                {BRAIN_ICON} Local On-Device AI Models Catalog
              </h4>
              <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted">
                100% private in-browser inference via Transformers.js. No server requests or API tokens needed.
              </p>
            </div>
            <div className="text-[10px] font-mono text-ink-faint dark:text-ink-dark-faint">
              Storage: {storage?.usageMb ? `${storage.usageMb.toFixed(1)} MB` : '0 MB'} ({storage?.files ?? 0} files)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Primary Models */}
            {LOCAL_MODELS.map((m: LocalModelOption) => {
              const isSelected = llmConfig.model === m.id;
              const isReady = isModelReady(m.id);

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setLLMConfig({ model: m.id });
                    setLocalProgress(null);
                  }}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-xs'
                      : 'border-border dark:border-border-dark bg-panel dark:bg-panel-dark hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="font-semibold text-xs text-ink dark:text-ink-dark leading-tight">
                      {m.label}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shrink-0">
                      ~{m.approxSizeMb} MB
                    </span>
                  </div>

                  <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted line-clamp-2 mb-2 leading-relaxed">
                    {m.blurb}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {m.supportsJsonAnalysis && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        JSON Analysis
                      </span>
                    )}
                    <span className="px-1 py-0.2 rounded text-[9px] font-mono font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                      {m.dtype.toUpperCase()}
                    </span>
                    <span className="px-1 py-0.2 rounded text-[9px] font-mono text-ink-faint border border-border/50">
                      {m.pipelineTask}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
                    <span className={isReady ? 'text-success dark:text-emerald-400 font-semibold' : 'text-ink-faint'}>
                      {isReady ? '● Ready in Memory' : '○ Not Cached'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLLMConfig({ model: m.id });
                        handleDownload(m.id);
                      }}
                      className="text-accent hover:underline font-semibold"
                    >
                      {isReady ? 'Reload' : 'Download'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auxiliary Task-Specific Models */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-ink-faint dark:text-ink-dark-faint mb-2">
              Auxiliary Pipeline Models (Perplexity Scorer & Plagiarism Embedder)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {LOCAL_AUX_MODELS.map((aux: LocalModelOption) => (
                <div
                  key={aux.id}
                  className="p-2 rounded border border-border dark:border-border-dark bg-panel/50 dark:bg-panel-dark/50 text-[11px]"
                >
                  <div className="flex items-center justify-between font-semibold text-ink dark:text-ink-dark">
                    <span>{aux.label}</span>
                    <span className="text-[9px] font-mono opacity-70">~{aux.approxSizeMb} MB</span>
                  </div>
                  <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                    {aux.blurb}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
