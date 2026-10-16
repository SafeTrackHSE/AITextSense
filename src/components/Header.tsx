import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import HelpModal from './HelpModal';
import { useT, LANGUAGES, type Language } from '../i18n';
import logoImg from '../assets/AITextSense_Logo.png';
import horizontalLogo from '../assets/AITextSense_Horizontal.png';
import { APP_VERSION, APP_TAGLINE } from '../version';
import { isModelReady } from '../core/llm/local';

const HELP_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function Header() {
  const { darkMode, toggleDarkMode, appMode, setAppMode, reset, uiLanguage, setUiLanguage, helpOpen, openHelp, closeHelp, llmConfig } = useStore();
  const t = useT();
  const [isTauri, setIsTauri] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const checkMaximized = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
        const { invoke } = await import('@tauri-apps/api/core');
        const max = await invoke<boolean>('app_is_maximized');
        setIsMaximized(Boolean(max));
        return;
      }
    } catch {
      // fallback
    }

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const max = await getCurrentWindow().isMaximized();
      setIsMaximized(Boolean(max));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const tauriEnv = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    setIsTauri(Boolean(tauriEnv));

    if (tauriEnv) {
      checkMaximized();
      const interval = setInterval(checkMaximized, 1000);

      let unlistenResize: (() => void) | undefined;
      import('@tauri-apps/api/window')
        .then(({ getCurrentWindow }) => {
          return getCurrentWindow().onResized(async () => {
            await checkMaximized();
          });
        })
        .then((unlisten) => {
          unlistenResize = unlisten;
        })
        .catch(() => {});

      return () => {
        clearInterval(interval);
        unlistenResize?.();
      };
    }
  }, [checkMaximized]);

  const handleMinimize = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('app_minimize');
      return;
    } catch {
      // fallback
    }

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      // ignore
    }
  };

  const handleToggleMaximize = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const nextMax = await invoke<boolean>('app_toggle_maximize');
      setIsMaximized(Boolean(nextMax));
      return;
    } catch {
      // fallback
    }

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      await win.toggleMaximize();
      const max = await win.isMaximized();
      setIsMaximized(Boolean(max));
    } catch {
      // ignore
    }
  };

  const handleClose = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('app_close');
      return;
    } catch {
      // fallback
    }

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      // ignore
    }
  };

  const isCloudActive = appMode === 'online' && ['openai', 'anthropic', 'gemini'].includes(llmConfig.provider);
  const isLocalAIReady = (appMode === 'offline' || llmConfig.provider === 'local') && (isModelReady(llmConfig.model) || llmConfig.provider === 'local');

  return (
    <>
      <header
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="border-b border-border dark:border-border-dark px-4 py-2 flex items-center justify-between bg-surface dark:bg-surface-dark shrink-0 select-none cursor-default"
      >
        <div data-tauri-drag-region className="flex items-center gap-2.5 min-w-0">
          <div data-tauri-drag-region className="relative flex items-center justify-center pointer-events-none">
            <img
              src={logoImg}
              alt="AI TextSense Logo"
              className="w-7 h-7 rounded-md object-contain shadow-sm border border-slate-700/40"
              data-tauri-drag-region
            />
          </div>
          <div data-tauri-drag-region className="flex items-center gap-2 min-w-0 pointer-events-none">
            <img
              src={horizontalLogo}
              alt="AI TextSense"
              className="h-5 w-auto object-contain brightness-95 dark:brightness-105 shrink-0"
              data-tauri-drag-region
            />
            <span data-tauri-drag-region className="text-[11px] text-ink-muted dark:text-ink-dark-muted font-mono hidden md:inline shrink-0">|</span>
            <span data-tauri-drag-region className="text-[11px] text-ink-muted dark:text-ink-dark-muted font-mono truncate hidden lg:inline">{APP_TAGLINE}</span>
            <span data-tauri-drag-region className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-accent/15 text-accent border border-accent/30 shrink-0">
              v{APP_VERSION}
            </span>
            <span data-tauri-drag-region className="text-[10px] text-ink-faint dark:text-ink-dark-faint font-mono opacity-70 shrink-0 hidden sm:inline">© Wilson Volpe</span>
          </div>
        </div>

        <div
          className="flex items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* 3-State Privacy Status Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold border transition-all ${
              isCloudActive
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : isLocalAIReady
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
            title={
              isCloudActive
                ? 'Cloud API provider active for AI reasoning'
                : isLocalAIReady
                  ? 'On-Device AI ready — 100% private local model inference'
                  : 'Air-Gapped mode active — zero network requests, pure client-side deterministic algorithms'
            }
          >
            <span>
              {isCloudActive
                ? t('privacy.cloudActive')
                : isLocalAIReady
                  ? t('privacy.localAI')
                  : t('privacy.airGapped')}
            </span>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded p-0.5 gap-0.5">
            {(['offline', 'online'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                id={`mode-${mode}`}
                onClick={() => setAppMode(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all duration-150 ${
                  appMode === mode
                    ? 'bg-accent text-white shadow-sm font-semibold'
                    : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark'
                }`}
              >
                {t(`mode.${mode}`)}
              </button>
            ))}
          </div>

          {/* Interface language */}
          <select
            value={uiLanguage}
            onChange={e => setUiLanguage(e.target.value as Language)}
            title={t('lang.label')}
            aria-label={t('lang.label')}
            className="text-[11px] bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded px-1.5 py-1 text-ink-muted dark:text-ink-dark-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag}</option>
            ))}
          </select>

          {/* Help */}
          <button
            type="button"
            id="open-help"
            onClick={() => openHelp()}
            title={t('action.help')}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-panel dark:hover:bg-panel-dark transition-colors duration-150 text-ink-muted dark:text-ink-dark-muted hover:text-accent dark:hover:text-accent focus:outline-none"
            aria-label="Open help"
          >
            {HELP_ICON}
          </button>

          {/* Dark mode toggle */}
          <button
            type="button"
            id="toggle-dark-mode"
            onClick={toggleDarkMode}
            title={darkMode ? t('theme.toLight') : t('theme.toDark')}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-panel dark:hover:bg-panel-dark transition-colors duration-150 text-ink-muted dark:text-ink-dark-muted focus:outline-none"
            aria-label={darkMode ? t('theme.toLight') : t('theme.toDark')}
          >
            {darkMode
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          <div className="w-px h-4 bg-border dark:bg-border-dark" />

          <button
            type="button"
            id="clear-all"
            onClick={reset}
            title={t('action.resetTitle')}
            className="px-2.5 py-1 text-xs text-ink-muted dark:text-ink-dark-muted hover:text-danger transition-colors duration-150 rounded hover:bg-danger-muted focus:outline-none"
          >
            {t('action.reset')}
          </button>

          {/* Embedded Desktop Window Controls */}
          {isTauri && (
            <>
              <div className="w-px h-4 bg-border dark:bg-border-dark ml-1 mr-0.5" />
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleMinimize}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-panel dark:hover:bg-panel-dark transition-colors text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark focus:outline-none"
                  title="Minimize"
                  aria-label="Minimize"
                >
                  <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
                    <rect width="10" height="1" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleToggleMaximize}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-panel dark:hover:bg-panel-dark transition-colors text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark focus:outline-none"
                  title={isMaximized ? 'Restore' : 'Maximize'}
                  aria-label={isMaximized ? 'Restore' : 'Maximize'}
                >
                  {isMaximized ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M2.5 1.5h6v6M1.5 3.5h6v6h-6z" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <rect x="1.5" y="1.5" width="7" height="7" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#e81123] hover:text-white transition-colors text-ink-muted dark:text-ink-dark-muted focus:outline-none"
                  title="Close"
                  aria-label="Close"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M1 1l8 8M9 1L1 9" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <HelpModal open={helpOpen} onClose={closeHelp} />
    </>
  );
}
