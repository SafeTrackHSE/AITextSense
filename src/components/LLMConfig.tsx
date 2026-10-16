import { useCallback, useState, useEffect } from 'react';
import { useStore } from '../store';
import { testConnection, fetchAvailableModels } from '../core/llm/client';
import {
  PROVIDER_PRESETS,
  LOCAL_MODELS,
  LOCAL_AUX_MODELS,
  FREE_ONLINE_MODELS,
  type LocalModelOption,
} from '../core/llm/types';
import type { LLMProvider } from '../core/llm/types';
import {
  preloadLocalModel,
  isModelReady,
  detectHardwareAcceleration,
  setHardwareAccelerationOverride,
  evaluateHardwareProfile,
  type HardwareProfile,
  getModelStorage,
  clearModelStorage,
} from '../core/llm/local';
import type { LocalProgress } from '../core/llm/local';
import { openExternal } from '../lib/openExternal';
import { useT } from '../i18n';

function getModelMeta(id: string, defaultLabel: string, defaultBlurb: string, t: (k: string) => string) {
  const map: Record<string, { labelKey: string; blurbKey: string; recKey: string }> = {
    'Xenova/LaMini-Flan-T5-77M': { labelKey: 'hub.model.77m.label', blurbKey: 'hub.model.77m.blurb', recKey: 'hub.model.77m.rec' },
    'Xenova/LaMini-Flan-T5-248M': { labelKey: 'hub.model.248m.label', blurbKey: 'hub.model.248m.blurb', recKey: 'hub.model.248m.rec' },
    'onnx-community/SmolLM2-360M-Instruct-ONNX': { labelKey: 'hub.model.360m.label', blurbKey: 'hub.model.360m.blurb', recKey: 'hub.model.360m.rec' },
    'onnx-community/Qwen2.5-0.5B-Instruct': { labelKey: 'hub.model.500m.label', blurbKey: 'hub.model.500m.blurb', recKey: 'hub.model.500m.rec' },
    'onnx-community/SmolLM2-135M-ONNX': { labelKey: 'hub.aux.smollm.label', blurbKey: 'hub.aux.smollm.blurb', recKey: '' },
    'Xenova/gpt2': { labelKey: 'hub.aux.gpt2.label', blurbKey: 'hub.aux.gpt2.blurb', recKey: '' },
    'Xenova/all-MiniLM-L6-v2': { labelKey: 'hub.aux.minilm.label', blurbKey: 'hub.aux.minilm.blurb', recKey: '' },
  };

  const entry = map[id];
  if (!entry) return { label: defaultLabel, blurb: defaultBlurb, rec: '' };
  const label = t(entry.labelKey);
  const blurb = t(entry.blurbKey);
  const rec = entry.recKey ? t(entry.recKey) : '';
  return {
    label: label !== entry.labelKey ? label : defaultLabel,
    blurb: blurb !== entry.blurbKey ? blurb : defaultBlurb,
    rec: rec !== entry.recKey ? rec : '',
  };
}

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

const ALL_PROVIDERS: LLMProvider[] = [
  'local',
  'lmstudio',
  'ollama',
  'uncensored-offline',
  'opencode-zen',
  'pollinations-free',
  'openrouter-free',
  'groq-free',
  'openai',
  'anthropic',
  'gemini',
];
const OFFLINE_SAFE_PROVIDERS: LLMProvider[] = ['local', 'lmstudio', 'ollama', 'uncensored-offline'];

export default function LLMConfigPanel() {
  const { llmConfig, setLLMConfig, llmConnected, setLLMConnected, appMode, openHelp } = useStore();
  const t = useT();

  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState<LocalProgress | null>(null);
  const [storage, setStorage] = useState<{ files: number; usageMb: number | null; supported: boolean } | null>(null);
  const [hwAccel, setHwAccel] = useState<'webgpu' | 'wasm'>('wasm');
  const [hwProfile, setHwProfile] = useState<HardwareProfile | null>(null);
  const [hubOpen, setHubOpen] = useState(false);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  useEffect(() => {
    detectHardwareAcceleration().then(setHwAccel);
    evaluateHardwareProfile().then(setHwProfile);
  }, []);

  const availableProviders = appMode === 'offline' ? OFFLINE_SAFE_PROVIDERS : ALL_PROVIDERS;
  const isLocal = llmConfig.provider === 'local';
  const isLocalServer = ['lmstudio', 'ollama', 'uncensored-offline'].includes(llmConfig.provider);
  const freeModels = FREE_ONLINE_MODELS[llmConfig.provider];

  const handleDetectModels = useCallback(async () => {
    if (!isLocalServer) return;
    setFetchingModels(true);
    try {
      const models = await fetchAvailableModels(llmConfig);
      setDetectedModels(models);
      if (models.length > 0) {
        const cur = (llmConfig.model || '').toLowerCase();
        const matching = models.find(m => m.toLowerCase().includes(cur) || (cur && cur.includes(m.toLowerCase())));
        setLLMConfig({ model: matching || models[0] });
      }
    } catch {
      // ignore
    } finally {
      setFetchingModels(false);
    }
  }, [isLocalServer, llmConfig, setLLMConfig]);

  useEffect(() => {
    if (isLocalServer) {
      fetchAvailableModels(llmConfig)
        .then(models => {
          setDetectedModels(models);
          if (models.length > 0 && (!llmConfig.model || llmConfig.model === 'local-model' || llmConfig.model === 'llama3.2')) {
            setLLMConfig({ model: models[0] });
          } else if (models.length > 0 && llmConfig.model) {
            const cur = llmConfig.model.toLowerCase();
            const matching = models.find(m => m.toLowerCase().includes(cur) || cur.includes(m.toLowerCase()));
            if (matching && matching !== llmConfig.model) {
              setLLMConfig({ model: matching });
            }
          }
        })
        .catch(() => {});
    } else {
      setDetectedModels([]);
    }
  }, [llmConfig.provider, llmConfig.endpoint, isLocalServer]);

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
    const currentPreset = PROVIDER_PRESETS[llmConfig.provider] ?? PROVIDER_PRESETS.local;
    if (currentPreset.needsKey && !llmConfig.apiKey?.trim()) {
      setTestError(
        `Please enter an API key for ${currentPreset.label}. Click 'Get key' to generate your free key.`
      );
      setLLMConnected(false);
      return;
    }
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
      if (hwAccel === 'webgpu' && (err?.message?.includes('webgpu') || err?.message?.includes('backend'))) {
        setHwAccel('wasm');
        setHardwareAccelerationOverride('wasm');
      }
      setTestError(err?.message ?? 'Download failed');
    }
  }, [llmConfig.model, refreshStorage, hwAccel]);

  const ready = isLocal && (isModelReady(llmConfig.model) || localProgress?.status === 'ready');
  const preset = PROVIDER_PRESETS[llmConfig.provider] ?? PROVIDER_PRESETS.local;

  return (
    <div className="border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
      {/* Main configuration bar */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint dark:text-ink-dark-faint shrink-0">
          {isLocal ? BRAIN_ICON : PLUG_ICON}
          {isLocal ? t('hub.title') : t('llm.provider')}
        </span>

        {/* Hardware Acceleration Indicator / Toggle */}
        {isLocal && (
          <button
            type="button"
            onClick={() => {
              const next = hwAccel === 'webgpu' ? 'wasm' : 'webgpu';
              setHwAccel(next);
              setHardwareAccelerationOverride(next);
            }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border transition-all cursor-pointer ${
              hwAccel === 'webgpu'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 hover:bg-slate-500/20'
            }`}
            title={hwAccel === 'webgpu' ? 'WebGPU enabled. Click to switch to CPU WebAssembly (WASM).' : 'CPU WebAssembly active. Click to switch to WebGPU.'}
          >
            {hwAccel === 'webgpu' ? '⚡ WEBGPU' : '⚙ WASM'}
          </button>
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
              {LOCAL_MODELS.map(m => {
                const meta = getModelMeta(m.id, m.label, m.blurb, t);
                return (
                  <option key={m.id} value={m.id}>
                    {meta.label} · ~{m.approxSizeMb} MB {m.supportsJsonAnalysis ? '✓ JSON' : ''}
                  </option>
                );
              })}
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
              {hubOpen ? t('llm.closeHub') : t('llm.modelsCatalog')}
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
                placeholder={preset.keyHint ?? "API Key"}
                title={preset.keyHint ?? "Enter API Key"}
                className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 w-32"
                aria-label="API Key"
              />
            )}

            {/* Model selector: Free preset models or detected local server models or text input */}
            {freeModels ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {t('llm.freeBadge')}
                </span>
                <select
                  value={llmConfig.model}
                  onChange={e => setLLMConfig({ model: e.target.value })}
                  className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 max-w-[200px]"
                  aria-label="Free Model"
                >
                  {freeModels.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            ) : isLocalServer ? (
              <div className="flex items-center gap-1 shrink-0">
                {detectedModels.length > 0 && (
                  <select
                    value={detectedModels.includes(llmConfig.model) ? llmConfig.model : '__custom__'}
                    onChange={e => {
                      if (e.target.value !== '__custom__') {
                        setLLMConfig({ model: e.target.value });
                      }
                    }}
                    className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 max-w-[170px]"
                    aria-label="Detected model"
                  >
                    <optgroup label={t('llm.detectedModels')}>
                      {detectedModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </optgroup>
                    <option value="__custom__">{t('llm.customModel')}</option>
                  </select>
                )}
                {(!detectedModels.length || !detectedModels.includes(llmConfig.model)) && (
                  <input
                    type="text"
                    value={llmConfig.model}
                    onChange={e => setLLMConfig({ model: e.target.value })}
                    placeholder="Model name"
                    className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 w-28"
                    aria-label="Model name"
                  />
                )}
                <button
                  type="button"
                  onClick={handleDetectModels}
                  disabled={fetchingModels}
                  title={fetchingModels ? t('llm.fetchingModels') : t('llm.refreshModels')}
                  className="px-1.5 py-1 text-[11px] rounded border border-border dark:border-border-dark hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors text-ink-muted hover:text-ink shrink-0"
                >
                  {fetchingModels ? '...' : '↻'}
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={llmConfig.model}
                onChange={e => setLLMConfig({ model: e.target.value })}
                placeholder="Model name"
                className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 w-28"
                aria-label="Model name"
              />
            )}

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
                {BRAIN_ICON} {t('llm.hubTitle')}
              </h4>
              <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted">
                {t('llm.hubDesc')}
              </p>
            </div>
            <div className="text-[10px] font-mono text-ink-faint dark:text-ink-dark-faint">
              {t('llm.storageLabel')}: {storage?.usageMb ? `${storage.usageMb.toFixed(1)} MB` : '0 MB'} ({storage?.files ?? 0} files)
            </div>
          </div>

          {/* Hardware Audit Evaluation Banner */}
          {hwProfile && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-hover/80 dark:bg-surface-dark-hover/80 border border-border dark:border-border-dark text-[11px] mb-3 flex-wrap">
              <span className="font-semibold text-accent flex items-center gap-1.5 shrink-0">
                ⚡ {t('hub.hwAudit')}:
              </span>
              <span className="font-mono text-ink-muted dark:text-ink-dark-muted">
                {hwProfile.summary}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-auto border shrink-0 ${
                hwProfile.tier === 'high-performance'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : hwProfile.tier === 'entry'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
              }`}>
                {t(`hub.tier.${hwProfile.tier}`)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Primary Models */}
            {LOCAL_MODELS.map((m: LocalModelOption) => {
              const isSelected = llmConfig.model === m.id;
              const isReady = isModelReady(m.id);
              const meta = getModelMeta(m.id, m.label, m.blurb, t);
              const hwRec = hwProfile?.recommendations[m.id];

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
                      {meta.label}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shrink-0">
                      ~{m.approxSizeMb} MB
                    </span>
                  </div>

                  <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted line-clamp-2 mb-2 leading-relaxed">
                    {meta.blurb}
                  </p>

                  {/* Hardware Recommendation Pill */}
                  {hwRec && (
                    <div className="mb-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        hwRec.badge === 'recommended'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : hwRec.badge === 'warning'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
                      }`}>
                        {hwRec.badge === 'recommended' ? '★ ' : hwRec.badge === 'warning' ? '⚠ ' : '✓ '}
                        {t(`hub.badge.${hwRec.badge}`)}
                      </span>
                      {meta.rec && (
                        <span className="text-[9px] text-ink-faint dark:text-ink-dark-faint block mt-0.5">
                          {meta.rec}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mb-2">
                    {m.supportsJsonAnalysis && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {t('llm.jsonAnalysis')}
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
                      {isReady ? t('llm.readyInMemory') : t('llm.notCached')}
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
                      {isReady ? t('llm.reload') : t('llm.download')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auxiliary Task-Specific Models */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-ink-faint dark:text-ink-dark-faint mb-2">
              {t('llm.auxTitle')}
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {LOCAL_AUX_MODELS.map((aux: LocalModelOption) => {
                const auxMeta = getModelMeta(aux.id, aux.label, aux.blurb, t);
                return (
                  <div
                    key={aux.id}
                    className="p-2 rounded border border-border dark:border-border-dark bg-panel/50 dark:bg-panel-dark/50 text-[11px]"
                  >
                    <div className="flex items-center justify-between font-semibold text-ink dark:text-ink-dark">
                      <span>{auxMeta.label}</span>
                      <span className="text-[9px] font-mono opacity-70">~{aux.approxSizeMb} MB</span>
                    </div>
                    <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                      {auxMeta.blurb}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
