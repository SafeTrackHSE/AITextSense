import { useState, useEffect, useCallback } from 'react';
import appLogo from '../assets/AITextSense_Logo.png';

export default function TitleBar() {
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
    checkMaximized();

    const interval = setInterval(checkMaximized, 1000);

    let unlistenResize: (() => void) | undefined;
    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
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
    }

    return () => {
      clearInterval(interval);
      unlistenResize?.();
    };
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
      // ignore in browser
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
      // ignore in browser
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
      // ignore in browser
    }
  };

  return (
    <div
      className="h-8 bg-[#0d1117] border-b border-border/80 dark:border-border-dark/80 flex items-center justify-between select-none text-xs text-ink-muted dark:text-ink-dark-muted shrink-0 z-50 px-2"
    >
      {/* Draggable region */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="flex items-center gap-2 flex-1 h-full pl-1 cursor-default select-none overflow-hidden"
      >
        <img
          src={appLogo}
          alt="AI TextSense Icon"
          className="w-4 h-4 object-contain pointer-events-none rounded-sm"
          data-tauri-drag-region
        />
        <span
          data-tauri-drag-region
          className="font-mono text-[11px] tracking-wide text-slate-300 font-medium select-none truncate"
        >
          AI TextSense <span className="opacity-40 font-normal">| Forensic Text Inspector</span>
        </span>
      </div>

      {/* Non-draggable window controls */}
      <div
        className="flex items-center h-full -mr-2 select-none"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleMinimize}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-11 h-full flex items-center justify-center hover:bg-white/10 active:bg-white/15 transition-colors text-slate-400 hover:text-white focus:outline-none"
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
          className="w-11 h-full flex items-center justify-center hover:bg-white/10 active:bg-white/15 transition-colors text-slate-400 hover:text-white focus:outline-none"
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M2.5 1.5h6v6M1.5 3.5h6v6h-6z" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="1.5" y="1.5" width="7" height="7" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-11 h-full flex items-center justify-center hover:bg-[#e81123] active:bg-[#c4101f] transition-colors text-slate-400 hover:text-white focus:outline-none"
          title="Close"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M1 1l8 8M9 1L1 9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
