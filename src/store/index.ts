import { create } from 'zustand';
import type { ScanResult, ScanOptions } from '../core/scanner/types';
import type { CleanupMode, CleanupResult, CleanupHistory } from '../core/cleanup/types';
import type { TextStats, DetectedLanguage } from '../core/input/types';
import type { WatermarkDetectionResult, WatermarkSweepResult, NeutralizationResult } from '../core/watermark/types';
import type { FootprintAnalysis, FootprintRemovalResult } from '../core/footprint/types';
import type { RewriteResult } from '../core/rewrite/types';
import type { IntegrityReport } from '../core/report/types';
import type { LLMConfig } from '../core/llm/types';
import { DEFAULT_LLM_CONFIG } from '../core/llm/types';
import type { OptimizerResult } from '../core/oracle/optimizer';
import type { PollutionResult } from '../core/spoof/pollution';
import type { PoisonResult } from '../core/poison/tokenBoundary';
import type { LMScanResult } from '../core/lm/scorer';
import type { InjectionAnalysisResult } from '../core/injection/types';
import type { Language } from '../i18n/strings';

const LANG_KEY = 'tii-lang';
function loadLanguage(): Language {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'en' || v === 'es' || v === 'fr' || v === 'pt-BR' || v === 'it') return v;
  } catch { /* ignore */ }
  return 'en';
}
function persistLanguage(lang: Language): void {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
}

// --- localStorage persistence for LLM config + app mode ---
const LLM_KEY = 'tii-llm-config';
const MODE_KEY = 'tii-app-mode';

function loadLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(LLM_KEY);
    if (!raw) return DEFAULT_LLM_CONFIG;
    return { ...DEFAULT_LLM_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LLM_CONFIG;
  }
}

function persistLLMConfig(config: LLMConfig): void {
  try { localStorage.setItem(LLM_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

function loadAppMode(): 'offline' | 'online' {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    return raw === 'online' ? 'online' : 'offline';
  } catch {
    return 'offline';
  }
}

function persistAppMode(mode: 'offline' | 'online'): void {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
}

export type ActivePanel = 'scanner' | 'injection' | 'watermark' | 'footprint' | 'report' | 'optimizer';
export type AppMode = 'offline' | 'online';

interface AppState {
  originalText: string;
  cleanedText: string | null;
  activePanel: ActivePanel;
  appMode: AppMode;
  darkMode: boolean;
  uiLanguage: Language;

  textStats: TextStats | null;
  language: DetectedLanguage | null;

  scanResult: ScanResult | null;
  scanOptions: Partial<ScanOptions>;
  isScanning: boolean;

  cleanupMode: CleanupMode;
  cleanupResult: CleanupResult | null;
  history: CleanupHistory | null;

  watermarkResult: WatermarkDetectionResult | null;
  watermarkSweep: WatermarkSweepResult | null;
  neutralizationResult: NeutralizationResult | null;
  isDetectingWatermark: boolean;

  footprintAnalysis: FootprintAnalysis | null;
  footprintRemoval: FootprintRemovalResult | null;
  isAnalyzingFootprint: boolean;

  rewriteResult: RewriteResult | null;

  report: IntegrityReport | null;

  optimizerResult: OptimizerResult | null;
  isOptimizing: boolean;
  pollutionResult: PollutionResult | null;
  poisonResult: PoisonResult | null;
  lmScore: LMScanResult | null;

  injectionResult: InjectionAnalysisResult | null;
  isAnalyzingInjection: boolean;

  llmConfig: LLMConfig;
  llmConnected: boolean;
  isLLMProcessing: boolean;

  setOriginalText: (text: string) => void;
  setCleanedText: (text: string | null) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setAppMode: (mode: AppMode) => void;
  toggleDarkMode: () => void;
  setUiLanguage: (lang: Language) => void;
  setTextStats: (stats: TextStats) => void;
  setLanguage: (lang: DetectedLanguage) => void;
  setScanResult: (result: ScanResult | null) => void;
  setScanOptions: (options: Partial<ScanOptions>) => void;
  setIsScanning: (v: boolean) => void;
  setCleanupMode: (mode: CleanupMode) => void;
  setCleanupResult: (result: CleanupResult | null) => void;
  setHistory: (history: CleanupHistory | null) => void;
  setWatermarkResult: (result: WatermarkDetectionResult | null) => void;
  setWatermarkSweep: (sweep: WatermarkSweepResult | null) => void;
  setNeutralizationResult: (result: NeutralizationResult | null) => void;
  setIsDetectingWatermark: (v: boolean) => void;
  setFootprintAnalysis: (result: FootprintAnalysis | null) => void;
  setFootprintRemoval: (result: FootprintRemovalResult | null) => void;
  setIsAnalyzingFootprint: (v: boolean) => void;
  setRewriteResult: (result: RewriteResult | null) => void;
  setReport: (report: IntegrityReport | null) => void;
  setOptimizerResult: (result: OptimizerResult | null) => void;
  setIsOptimizing: (v: boolean) => void;
  setPollutionResult: (result: PollutionResult | null) => void;
  setPoisonResult: (result: PoisonResult | null) => void;
  setLmScore: (result: LMScanResult | null) => void;
  setInjectionResult: (result: InjectionAnalysisResult | null) => void;
  setIsAnalyzingInjection: (v: boolean) => void;
  setLLMConfig: (config: Partial<LLMConfig>) => void;
  setLLMConnected: (v: boolean) => void;
  setIsLLMProcessing: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  originalText: '',
  cleanedText: null as string | null,
  activePanel: 'scanner' as ActivePanel,
  appMode: loadAppMode() as AppMode,
  darkMode: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  uiLanguage: loadLanguage() as Language,
  textStats: null as TextStats | null,
  language: null as DetectedLanguage | null,
  scanResult: null as ScanResult | null,
  scanOptions: {} as Partial<ScanOptions>,
  isScanning: false,
  cleanupMode: 'report-only' as CleanupMode,
  cleanupResult: null as CleanupResult | null,
  history: null as CleanupHistory | null,
  watermarkResult: null as WatermarkDetectionResult | null,
  watermarkSweep: null as WatermarkSweepResult | null,
  neutralizationResult: null as NeutralizationResult | null,
  isDetectingWatermark: false,
  footprintAnalysis: null as FootprintAnalysis | null,
  footprintRemoval: null as FootprintRemovalResult | null,
  isAnalyzingFootprint: false,
  rewriteResult: null as RewriteResult | null,
  report: null as IntegrityReport | null,
  optimizerResult: null as OptimizerResult | null,
  isOptimizing: false,
  pollutionResult: null as PollutionResult | null,
  poisonResult: null as PoisonResult | null,
  lmScore: null as LMScanResult | null,
  injectionResult: null as InjectionAnalysisResult | null,
  isAnalyzingInjection: false,
  llmConfig: loadLLMConfig(),
  llmConnected: false,
  isLLMProcessing: false,
};

export const useStore = create<AppState>((set) => ({
  ...initialState,

  setOriginalText: (text) => set({ originalText: text, cleanedText: null, scanResult: null, cleanupResult: null, watermarkResult: null, footprintAnalysis: null, report: null, optimizerResult: null, pollutionResult: null, poisonResult: null, lmScore: null, injectionResult: null }),
  setCleanedText: (text) => set({ cleanedText: text }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setAppMode: (mode) => { persistAppMode(mode); set({ appMode: mode }); },
  toggleDarkMode: () => set((s) => {
    const next = !s.darkMode;
    document.documentElement.classList.toggle('dark', next);
    return { darkMode: next };
  }),
  setUiLanguage: (lang) => { persistLanguage(lang); set({ uiLanguage: lang }); },
  setTextStats: (stats) => set({ textStats: stats }),
  setLanguage: (lang) => set({ language: lang }),
  setScanResult: (result) => set({ scanResult: result }),
  setScanOptions: (options) => set({ scanOptions: options }),
  setIsScanning: (v) => set({ isScanning: v }),
  setCleanupMode: (mode) => set({ cleanupMode: mode }),
  setCleanupResult: (result) => set({ cleanupResult: result }),
  setHistory: (history) => set({ history }),
  setWatermarkResult: (result) => set({ watermarkResult: result }),
  setWatermarkSweep: (sweep) => set({ watermarkSweep: sweep }),
  setNeutralizationResult: (result) => set({ neutralizationResult: result }),
  setIsDetectingWatermark: (v) => set({ isDetectingWatermark: v }),
  setFootprintAnalysis: (result) => set({ footprintAnalysis: result }),
  setFootprintRemoval: (result) => set({ footprintRemoval: result }),
  setIsAnalyzingFootprint: (v) => set({ isAnalyzingFootprint: v }),
  setRewriteResult: (result) => set({ rewriteResult: result }),
  setReport: (report) => set({ report }),
  setOptimizerResult: (result) => set({ optimizerResult: result }),
  setIsOptimizing: (v) => set({ isOptimizing: v }),
  setPollutionResult: (result) => set({ pollutionResult: result }),
  setPoisonResult: (result) => set({ poisonResult: result }),
  setLmScore: (result) => set({ lmScore: result }),
  setInjectionResult: (result) => set({ injectionResult: result }),
  setIsAnalyzingInjection: (v) => set({ isAnalyzingInjection: v }),
  setLLMConfig: (config) => set((s) => { const next = { ...s.llmConfig, ...config }; persistLLMConfig(next); return { llmConfig: next }; }),
  setLLMConnected: (v) => set({ llmConnected: v }),
  setIsLLMProcessing: (v) => set({ isLLMProcessing: v }),
  reset: () => set(initialState),
}));
