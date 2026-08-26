import { useCallback, useState, useEffect } from 'react';
import { useStore } from '../store';
import { testConnection } from '../core/llm/client';
import { PROVIDER_PRESETS } from '../core/llm/types';
import type { LLMProvider } from '../core/llm/types';
import { LOCAL_MODELS, preloadLocalModel, isModelReady, hasWebGPU, getModelStorage, clearModelStorage } from '../core/llm/local';
import type { LocalProgress } from '../core/llm/local';
import { openExternal } from '../lib/openExternal';
import { useT } from '../i18n';

const PLUG_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
  </svg>
);

// 'local' first so the friendly, no-setup option is the default the user sees.
const PROVIDER_ORDER: LLMProvider[] = ['local', 'ollama', 'openai', 'anthropic', 'gemini'];

export default function LLMConfigPanel() {
  const { llmConfig, setLLMConfig, llmConnected, setLLMConnected, appMode } = useStore();
  const t = useT();
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState<LocalProgress | null>(null);
  const [storage, setStorage] = useState<{ files: number; usageMb: number | null; supported: boolean } | null>(null);

  const preset = PROVIDER_PRESETS[llmConfig.provider] ?? PROVIDER_PRESETS.local;
  const isLocal = !!preset.local;

  const refreshStorage = useCallback(() => { getModelStorage().then(setStorage); }, []);
  useEffect(() => { if (isLocal) refreshStorage(); }, [isLocal, refreshStorage]);

  const handleClearModel = useCallback(async () => {
    if (!confirm('Delete the downloaded on-device model from this browser? You can download it again anytime.')) return;
    await clearModelStorage();
    setLocalProgress(null);
    refreshStorage();
  }, [refreshStorage]);

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

  const handleDownload = useCallback(async () => {
    setTestError(null);
    setLocalProgress({ status: 'downloading', percent: 0, message: 'Starting…' });
    try {
      await preloadLocalModel(llmConfig.model, setLocalProgress);
      refreshStorage();
    } catch {
      /* error already surfaced via progress */
    }
  }, [llmConfig.model, refreshStorage]);

  if (appMode !== 'online') return null;

  const ready = isLocal && (isModelReady(llmConfig.model) || localProgress?.status === 'ready');

  return (
    <div className="border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint dark:text-ink-dark-faint shrink-0">
          {PLUG_ICON} LLM
        </span>

        {/* Provider selector */}
        <select
          value={llmConfig.provider}
          onChange={e => handleProviderChange(e.target.value as LLMProvider)}
          className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 shrink-0"
          aria-label="LLM provider"
        >
          {PROVIDER_ORDER.map(p => (
            <option key={p} value={p}>{PROVIDER_PRESETS[p].label}</option>
          ))}
        </select>

        {isLocal ? (
          <>
            {/* On-device model picker */}
            <select
              value={llmConfig.model}
              onChange={e => { setLLMConfig({ model: e.target.value }); setLocalProgress(null); }}
              className="px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50"
              aria-label="On-device model"
            >
              {LOCAL_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label} · ~{m.approxSizeMb} MB</option>
              ))}
            </select>

            <button
              onClick={handleDownload}
              disabled={localProgress?.status === 'downloading' || localProgress?.status === 'preparing'}
              className="btn-primary py-1 text-[11px] shrink-0 disabled:opacity-50"
            >
              {ready ? t('llm.reload') : localProgress?.status === 'downloading' ? t('llm.downloading') : t('llm.download')}
            </button>

            <button
              type="button"
              onClick={handleClearModel}
              disabled={!storage?.files || storage.files === 0}
              title={t('llm.deleteTitle')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-danger-muted text-danger dark:text-red-400 hover:bg-danger/25 border border-danger/30 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              {t('llm.deleteModel')}
            </button>

            {ready && (
              <span className="flex items-center gap-1 text-[10px] text-success dark:text-emerald-400 font-medium shrink-0">
                <span className="w-2 h-2 rounded-full bg-success" /> {t('llm.ready')}
              </span>
            )}
          </>
        ) : (
          <>
            {/* Endpoint */}
            <input
              value={llmConfig.endpoint}
              onChange={e => { setLLMConfig({ endpoint: e.target.value }); setTestError(null); }}
              placeholder={preset.endpoint}
              className="flex-1 min-w-[180px] max-w-xs px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-ink-faint dark:placeholder:text-ink-dark-faint"
              aria-label="LLM endpoint URL"
            />

            {/* Model */}
            <input
              value={llmConfig.model}
              onChange={e => setLLMConfig({ model: e.target.value })}
              placeholder={preset.model}
              className="w-40 px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] font-mono text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-ink-faint dark:placeholder:text-ink-dark-faint"
              aria-label="Model name"
            />

            {/* API Key — hidden for providers that don't need one */}
            {preset.needsKey && (
              <input
                value={llmConfig.apiKey ?? ''}
                onChange={e => { setLLMConfig({ apiKey: e.target.value || undefined }); setTestError(null); }}
                placeholder="API key"
                type="password"
                className="w-40 px-2 py-1 bg-surface dark:bg-surface-dark rounded border border-border dark:border-border-dark text-[11px] text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-ink-faint dark:placeholder:text-ink-dark-faint"
                aria-label="API key"
              />
            )}

            {/* Get-key link — uses window.open (plain <a target=_blank> is blocked in the app webview) */}
            {preset.needsKey && preset.keyUrl && (
              <button
                type="button"
                onClick={() => openExternal(preset.keyUrl!)}
                className="text-[10px] text-accent hover:underline shrink-0"
                title={preset.keyHint}
              >
                {t('llm.getKey')}
              </button>
            )}

            {/* Test button */}
            <button
              id="llm-test-connection"
              onClick={handleTest}
              disabled={testing}
              className="btn-primary py-1 text-[11px] shrink-0"
            >
              {testing ? t('llm.testing') : t('llm.test')}
            </button>

            {/* Status dot */}
            <span
              title={llmConnected ? 'Connected' : 'Not connected'}
              className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${
                llmConnected ? 'bg-success' : 'bg-border dark:bg-border-dark'
              }`}
            />
            {llmConnected && (
              <span className="text-[10px] text-success dark:text-emerald-400 font-medium shrink-0">{t('llm.connected')}</span>
            )}
          </>
        )}
      </div>

      {/* Local download progress bar */}
      {isLocal && localProgress && localProgress.status !== 'ready' && localProgress.status !== 'idle' && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-[10px] text-ink-muted dark:text-ink-dark-muted mb-1">
            <span>{localProgress.message}</span>
            {localProgress.status === 'downloading' && <span>{localProgress.percent}%</span>}
          </div>
          <div className="w-full h-1 bg-surface dark:bg-surface-dark rounded-full overflow-hidden border border-border dark:border-border-dark">
            <div
              className={`h-full rounded-full transition-all duration-300 ${localProgress.status === 'error' ? 'bg-danger' : 'bg-accent'}`}
              style={{ width: `${localProgress.status === 'error' ? 100 : localProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Provider note */}
      {preset.note && !testError && (
        preset.warn ? (
          <div className="flex items-start gap-2 mx-4 mb-2 px-2.5 py-1.5 rounded border border-warning/40 bg-warning/10 text-[10px] text-warning leading-relaxed">
            <span className="shrink-0 mt-px">⚠</span>
            <span>{preset.note}</span>
          </div>
        ) : (
          <div className="px-4 pb-2 text-[10px] text-ink-faint dark:text-ink-dark-faint leading-relaxed">
            {preset.note}
            {isLocal && (
              <span className="opacity-80">
                {' '}Runs faster with {hasWebGPU() ? 'your GPU (WebGPU detected)' : 'CPU (this browser has no WebGPU — it still works, just slower)'}.
                {' '}Tip: click “Download model” once, then use Rewrite in the Watermark tab.
              </span>
            )}
            {preset.keyHint && preset.needsKey && <span className="opacity-80"> · Key: {preset.keyHint}</span>}
          </div>
        )
      )}

      {/* On-device model storage (item: choose where to save the model) */}
      {isLocal && (
        <div className="flex items-center gap-2 flex-wrap mx-4 mb-2 px-2.5 py-1.5 rounded border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-[10px] text-ink-muted dark:text-ink-dark-muted">
          <span className="font-semibold text-ink dark:text-ink-dark">{t('llm.storage')}</span>
          <span>
            {storage
              ? `${storage.files} cached file${storage.files === 1 ? '' : 's'}${storage.usageMb != null ? ` · ~${storage.usageMb} MB app storage` : ''}`
              : 'checking…'}
          </span>
          <button
            type="button"
            onClick={handleClearModel}
            className="ml-1 px-2 py-0.5 rounded bg-danger/15 text-danger hover:bg-danger/25 transition-colors"
          >
            {t('llm.clear')}
          </button>
          <span className="basis-full text-ink-faint dark:text-ink-dark-faint">
            {t('llm.folderNote')}
          </span>
        </div>
      )}

      {/* Inline error */}
      {testError && (
        <div className="flex items-start gap-2 px-4 pb-2 text-[10px] text-danger dark:text-red-400 font-mono leading-relaxed animate-slide-up">
          <span className="shrink-0 mt-px">⚠</span>
          <span>{testError}</span>
        </div>
      )}
    </div>
  );
}
