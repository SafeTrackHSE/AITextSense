import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, type ActivePanel } from './store';
import Header from './components/Header';
import SplashScreen from './components/SplashScreen';
import TextInput from './components/TextInput';
import DashboardPanel from './components/DashboardPanel';
import ScannerPanel from './components/ScannerPanel';
import InjectionPanel from './components/InjectionPanel';
import ThreatPanel from './components/ThreatPanel';
import WatermarkPanel from './components/WatermarkPanel';
import FootprintPanel from './components/FootprintPanel';
import OptimizerPanel from './components/OptimizerPanel';
import PlagiarismPanel from './components/PlagiarismPanel';
import ReportPanel from './components/ReportPanel';
import OutputPanel from './components/OutputPanel';
import LLMConfigPanel from './components/LLMConfig';
import Splitter from './components/Splitter';
import { useT } from './i18n';

interface TabSection {
  id: string;
  labelKey: string;
  tabs: { key: ActivePanel; icon: string }[];
}

const TAB_SECTIONS: TabSection[] = [
  {
    id: 'overview',
    labelKey: 'section.overview',
    tabs: [
      { key: 'overview', icon: '◈' },
    ],
  },
  {
    id: 'safety',
    labelKey: 'section.safety',
    tabs: [
      { key: 'scanner', icon: '◈' },
      { key: 'injection', icon: '⛨' },
      { key: 'threat', icon: '☠' },
    ],
  },
  {
    id: 'artifacts',
    labelKey: 'section.artifacts',
    tabs: [
      { key: 'footprint', icon: '⊗' },
      { key: 'watermark', icon: '⊕' },
      { key: 'optimizer', icon: '⟁' },
    ],
  },
  {
    id: 'synthesis',
    labelKey: 'section.synthesis',
    tabs: [
      { key: 'plagiarism', icon: '§' },
      { key: 'report', icon: '≡' },
    ],
  },
];

// --- persisted layout ---
function loadNum(key: string, fallback: number): number {
  try {
    const v = parseFloat(localStorage.getItem(key) ?? '');
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === 'true';
  } catch {
    return fallback;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export default function App() {
  const {
    activePanel,
    setActivePanel,
    darkMode,
    scanResult,
    injectionResult,
    threatResult,
    footprintAnalysis,
    watermarkResult,
    plagiarismResult,
    report,
  } = useStore();

  const t = useT();

  const mainRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  const [leftPct, setLeftPct] = useState(() => loadNum('tii-left-pct', 50));
  const [diffPct, setDiffPct] = useState(() => loadNum('tii-diff-pct', 32));
  const [rightCollapsed, setRightCollapsed] = useState(() => loadBool('tii-right-collapsed', false));
  const [topCollapsed, setTopCollapsed] = useState(() => loadBool('tii-top-collapsed', false));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    save('tii-left-pct', String(leftPct));
  }, [leftPct]);

  useEffect(() => {
    save('tii-diff-pct', String(diffPct));
  }, [diffPct]);

  useEffect(() => {
    save('tii-right-collapsed', String(rightCollapsed));
  }, [rightCollapsed]);

  useEffect(() => {
    save('tii-top-collapsed', String(topCollapsed));
  }, [topCollapsed]);

  const resizeMain = useCallback((clientX: number) => {
    const rect = mainRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setLeftPct(Math.min(85, Math.max(22, pct)));
  }, []);

  const resizeLeft = useCallback((_x: number, clientY: number) => {
    const rect = leftRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((rect.bottom - clientY) / rect.height) * 100;
    setDiffPct(Math.min(75, Math.max(12, pct)));
  }, []);

  // Compute live badges for tabs
  const getBadge = (key: ActivePanel): string | number | null => {
    switch (key) {
      case 'scanner': {
        if (!scanResult) return null;
        const count = scanResult.findings.length + scanResult.stegoPatterns.length + scanResult.bidiIssues.length;
        return count > 0 ? count : null;
      }
      case 'injection': {
        if (!injectionResult || injectionResult.findings.length === 0) return null;
        return injectionResult.findings.length;
      }
      case 'threat': {
        if (!threatResult || threatResult.findings.length === 0) return null;
        return threatResult.findings.length;
      }
      case 'footprint': {
        if (!footprintAnalysis) return null;
        return `${Math.round(footprintAnalysis.overallScore * 100)}%`;
      }
      case 'watermark': {
        if (!watermarkResult || !watermarkResult.isSignificant) return null;
        return `z=${watermarkResult.zScore.toFixed(1)}`;
      }
      case 'plagiarism': {
        if (!plagiarismResult) return null;
        const total =
          plagiarismResult.shingleMatches.length +
          plagiarismResult.semanticMatches.length +
          plagiarismResult.intrinsicAnomalies.length;
        return total > 0 ? total : null;
      }
      case 'report': {
        return report ? '✓' : null;
      }
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark overflow-hidden select-none">
      <SplashScreen durationMs={3000} />
      <Header />
      <LLMConfigPanel />

      <div ref={mainRef} className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: text input + output (diff / editor) */}
        <div
          ref={leftRef}
          className="flex flex-col min-w-0"
          style={{ width: rightCollapsed ? '100%' : `${leftPct}%` }}
        >
          {topCollapsed ? (
            <button
              onClick={() => setTopCollapsed(false)}
              title={t('input.expand')}
              aria-label={t('input.expand')}
              className="shrink-0 w-full border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark hover:bg-accent/10 flex items-center gap-2 px-3 py-1.5 text-ink-muted dark:text-ink-dark-muted hover:text-accent transition-colors"
            >
              <span className="text-sm">▾</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest">{t('input.rawText')}</span>
            </button>
          ) : (
            <div className="flex-1 overflow-hidden min-h-0">
              <TextInput onCollapse={() => setTopCollapsed(true)} />
            </div>
          )}
          {!topCollapsed && (
            <Splitter orientation="horizontal" onResize={resizeLeft} title="Drag to resize the output panel" />
          )}
          <div
            className="overflow-hidden min-h-0"
            style={topCollapsed ? { flex: '1 1 0%' } : { height: `${diffPct}%` }}
          >
            <OutputPanel />
          </div>
        </div>

        {/* Vertical splitter */}
        {!rightCollapsed && (
          <Splitter orientation="vertical" onResize={resizeMain} title="Drag to resize the analysis panel" />
        )}

        {/* Right: analysis panels (collapsible) */}
        {rightCollapsed ? (
          <button
            onClick={() => setRightCollapsed(false)}
            title="Expand analysis panel"
            aria-label="Expand analysis panel"
            className="w-7 shrink-0 border-l border-border dark:border-border-dark bg-panel dark:bg-panel-dark hover:bg-accent/10 flex flex-col items-center justify-center gap-2 text-ink-muted dark:text-ink-dark-muted hover:text-accent transition-colors"
          >
            <span className="text-sm">‹</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>
              {t('panel.analysis')}
            </span>
          </button>
        ) : (
          <div className="flex flex-col min-w-0" style={{ width: `${100 - leftPct}%` }}>
            {/* 3-Pillar Grouped Navigation Bar */}
            <div className="flex items-center border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
              <div className="flex flex-1 min-w-0 overflow-x-auto items-center py-0.5">
                {TAB_SECTIONS.map((section, sIdx) => (
                  <div key={section.id} className="flex items-center">
                    {sIdx > 0 && (
                      <div
                        className="h-4 w-px bg-border dark:border-border-dark mx-1.5 shrink-0 opacity-60"
                        title={t(section.labelKey)}
                      />
                    )}
                    <div className="flex items-center" title={t(section.labelKey)}>
                      {section.tabs.map(p => {
                        const badge = getBadge(p.key);
                        const isActive = activePanel === p.key;

                        return (
                          <button
                            key={p.key}
                            id={`tab-${p.key}`}
                            onClick={() => setActivePanel(p.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-150 border-b-2 focus:outline-none shrink-0 ${
                              isActive
                                ? 'border-accent text-accent dark:text-accent bg-surface dark:bg-surface-dark font-semibold'
                                : 'border-transparent text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark hover:bg-panel2 dark:hover:bg-panel2-dark'
                            }`}
                          >
                            <span className="text-[11px] opacity-75">{p.icon}</span>
                            <span className="tracking-wide uppercase text-[10px]">{t(`tab.${p.key}`)}</span>
                            {badge !== null && (
                              <span
                                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold leading-tight ${
                                  isActive
                                    ? 'bg-accent/20 text-accent'
                                    : 'bg-border dark:bg-border-dark text-ink-muted dark:text-ink-dark-muted'
                                }`}
                              >
                                {badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setRightCollapsed(true)}
                title="Collapse analysis panel"
                className="px-2.5 py-2 shrink-0 text-ink-muted dark:text-ink-dark-muted hover:text-accent transition-colors"
                aria-label="Collapse analysis panel"
              >
                ›
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-hidden animate-fade-in min-h-0">
              {activePanel === 'overview' && <DashboardPanel />}
              {activePanel === 'scanner' && <ScannerPanel />}
              {activePanel === 'injection' && <InjectionPanel />}
              {activePanel === 'threat' && <ThreatPanel />}
              {activePanel === 'footprint' && <FootprintPanel />}
              {activePanel === 'watermark' && <WatermarkPanel />}
              {activePanel === 'optimizer' && <OptimizerPanel />}
              {activePanel === 'plagiarism' && <PlagiarismPanel />}
              {activePanel === 'report' && <ReportPanel />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
