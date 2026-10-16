import { create } from 'zustand';
import type { ScanResult, ScanOptions } from '../core/scanner/types';
import type { CleanupMode, CleanupResult, CleanupHistory } from '../core/cleanup/types';
import type { TextStats, DetectedLanguage } from '../core/input/types';
import type { WatermarkDetectionResult, WatermarkSweepResult, NeutralizationResult } from '../core/watermark/types';
import type { FootprintAnalysis, FootprintRemovalResult } from '../core/footprint/types';
import type { AIFingerprintScrubReport, SentenceFingerprintOverlay } from '../core/footprint';
import type { RewriteResult } from '../core/rewrite/types';
import type { IntegrityReport } from '../core/report/types';
import type { LLMConfig } from '../core/llm/types';
import { DEFAULT_LLM_CONFIG } from '../core/llm/types';
import type { OptimizerResult } from '../core/oracle/optimizer';
import type { PollutionResult } from '../core/spoof/pollution';
import type { PoisonResult } from '../core/poison/tokenBoundary';
import type { LMScanResult } from '../core/lm/scorer';
import type { InjectionAnalysisResult } from '../core/injection/types';
import type { ThreatAnalysisResult } from '../core/threat/types';
import type { Language } from '../i18n/strings';
import type { ReferenceDocument, PlagiarismAnalysisResult } from '../core/plagiarism';
import type { AttackVectorBriefing } from '../core/security/explainer';

import { scan } from '../core/scanner';
import { analyzeInjection } from '../core/injection';
import { analyzeThreat } from '../core/threat';
import { detectWatermark, sweepDetection } from '../core/watermark';
import { analyzeFootprint, computeSentenceFingerprintHeatmap } from '../core/footprint';
import { analyzePlagiarism } from '../core/plagiarism';
import { buildReport } from '../core/report/export';
import { createHistory, pushSnapshot, undo, redo, canUndo, canRedo } from '../core/cleanup/history';

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

export type ActivePanel =
  | 'overview'
  | 'scanner'
  | 'injection'
  | 'threat'
  | 'watermark'
  | 'footprint'
  | 'plagiarism'
  | 'report'
  | 'optimizer';

export type AppMode = 'offline' | 'online';

export type MutationSource =
  | 'scanner-clean'
  | 'injection-neutralize'
  | 'watermark-neutralize'
  | 'footprint-scrub'
  | 'roundtrip-regen';

export interface MutationSnapshot {
  text: string;
  source: MutationSource;
  label: string;
  timestamp: number;
}

export interface AppState {
  originalText: string;
  cleanedText: string | null;
  activePanel: ActivePanel;
  appMode: AppMode;
  darkMode: boolean;
  uiLanguage: Language;
  helpOpen: boolean;
  /** Glossary entry id to scroll to/highlight when Help opens — lets any panel deep-link a jargon term straight to its plain-language definition. */
  helpFocusTerm: string | null;

  textStats: TextStats | null;
  language: DetectedLanguage | null;

  scanResult: ScanResult | null;
  scanOptions: Partial<ScanOptions>;
  isScanning: boolean;

  cleanupMode: CleanupMode;
  cleanupResult: CleanupResult | null;
  history: CleanupHistory | null;

  mutationHistory: MutationSnapshot[];
  mutationRedoStack: MutationSnapshot[];
  applyTextMutation: (newText: string, sourceOrLabel: MutationSource | string, labelOpt?: string) => void;
  undoMutation: () => void;
  redoMutation: () => void;

  watermarkResult: WatermarkDetectionResult | null;
  watermarkSweep: WatermarkSweepResult | null;
  neutralizationResult: NeutralizationResult | null;
  isDetectingWatermark: boolean;

  footprintAnalysis: FootprintAnalysis | null;
  footprintRemoval: FootprintRemovalResult | null;
  footprintScrubReport: AIFingerprintScrubReport | null;
  setFootprintScrubReport: (report: AIFingerprintScrubReport | null) => void;
  sentenceHeatmap: SentenceFingerprintOverlay[];
  setSentenceHeatmap: (heatmap: SentenceFingerprintOverlay[]) => void;
  isAnalyzingFootprint: boolean;

  rewriteResult: RewriteResult | null;

  referenceDocuments: ReferenceDocument[];
  addReferenceDocument: (doc: ReferenceDocument) => void;
  removeReferenceDocument: (id: string) => void;
  clearReferenceDocuments: () => void;

  plagiarismResult: PlagiarismAnalysisResult | null;
  setPlagiarismResult: (result: PlagiarismAnalysisResult | null) => void;
  isAnalyzingPlagiarism: boolean;
  setIsAnalyzingPlagiarism: (v: boolean) => void;

  report: IntegrityReport | null;

  optimizerResult: OptimizerResult | null;
  isOptimizing: boolean;
  pollutionResult: PollutionResult | null;
  poisonResult: PoisonResult | null;
  lmScore: LMScanResult | null;

  injectionResult: InjectionAnalysisResult | null;
  isAnalyzingInjection: boolean;

  threatResult: ThreatAnalysisResult | null;
  isAnalyzingThreat: boolean;

  attackBriefings: Record<string, AttackVectorBriefing>;
  setAttackBriefing: (key: string, briefing: AttackVectorBriefing) => void;

  isFullScanning: boolean;
  runFullScan: () => Promise<void>;

  llmConfig: LLMConfig;
  llmConnected: boolean;
  isLLMProcessing: boolean;

  setOriginalText: (text: string) => void;
  setCleanedText: (text: string | null) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setAppMode: (mode: AppMode) => void;
  toggleDarkMode: () => void;
  setUiLanguage: (lang: Language) => void;
  /** Opens Help. Pass a glossary term id to jump straight to its Glossary tab entry. */
  openHelp: (focusTerm?: string) => void;
  closeHelp: () => void;
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
  setThreatResult: (result: ThreatAnalysisResult | null) => void;
  setIsAnalyzingThreat: (v: boolean) => void;
  setLLMConfig: (config: Partial<LLMConfig>) => void;
  setLLMConnected: (v: boolean) => void;
  setIsLLMProcessing: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  originalText: '',
  cleanedText: null as string | null,
  activePanel: 'overview' as ActivePanel,
  appMode: loadAppMode() as AppMode,
  darkMode: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  uiLanguage: loadLanguage() as Language,
  helpOpen: false,
  helpFocusTerm: null as string | null,
  textStats: null as TextStats | null,
  language: null as DetectedLanguage | null,
  scanResult: null as ScanResult | null,
  scanOptions: {} as Partial<ScanOptions>,
  isScanning: false,
  cleanupMode: 'report-only' as CleanupMode,
  cleanupResult: null as CleanupResult | null,
  history: null as CleanupHistory | null,
  mutationHistory: [] as MutationSnapshot[],
  mutationRedoStack: [] as MutationSnapshot[],
  watermarkResult: null as WatermarkDetectionResult | null,
  watermarkSweep: null as WatermarkSweepResult | null,
  neutralizationResult: null as NeutralizationResult | null,
  isDetectingWatermark: false,
  footprintAnalysis: null as FootprintAnalysis | null,
  footprintRemoval: null as FootprintRemovalResult | null,
  footprintScrubReport: null as AIFingerprintScrubReport | null,
  sentenceHeatmap: [] as SentenceFingerprintOverlay[],
  isAnalyzingFootprint: false,
  rewriteResult: null as RewriteResult | null,
  referenceDocuments: [] as ReferenceDocument[],
  plagiarismResult: null as PlagiarismAnalysisResult | null,
  isAnalyzingPlagiarism: false,
  report: null as IntegrityReport | null,
  optimizerResult: null as OptimizerResult | null,
  isOptimizing: false,
  pollutionResult: null as PollutionResult | null,
  poisonResult: null as PoisonResult | null,
  lmScore: null as LMScanResult | null,
  injectionResult: null as InjectionAnalysisResult | null,
  isAnalyzingInjection: false,
  threatResult: null as ThreatAnalysisResult | null,
  isAnalyzingThreat: false,
  attackBriefings: {} as Record<string, AttackVectorBriefing>,
  isFullScanning: false,
  llmConfig: loadLLMConfig(),
  llmConnected: false,
  isLLMProcessing: false,
};

export const useStore = create<AppState>((set, get) => ({
  ...initialState,

  setOriginalText: (text) => set({
    originalText: text,
    cleanedText: null,
    scanResult: null,
    cleanupResult: null,
    history: null,
    mutationHistory: [],
    mutationRedoStack: [],
    watermarkResult: null,
    watermarkSweep: null,
    neutralizationResult: null,
    footprintAnalysis: null,
    footprintRemoval: null,
    footprintScrubReport: null,
    sentenceHeatmap: [],
    plagiarismResult: null,
    report: null,
    optimizerResult: null,
    pollutionResult: null,
    poisonResult: null,
    lmScore: null,
    injectionResult: null,
    threatResult: null,
    attackBriefings: {},
  }),
  setCleanedText: (text) => set({ cleanedText: text }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setAppMode: (mode) => { persistAppMode(mode); set({ appMode: mode }); },
  toggleDarkMode: () => set((s) => {
    const next = !s.darkMode;
    document.documentElement.classList.toggle('dark', next);
    return { darkMode: next };
  }),
  setUiLanguage: (lang) => { persistLanguage(lang); set({ uiLanguage: lang }); },
  openHelp: (focusTerm) => set({ helpOpen: true, helpFocusTerm: focusTerm ?? null }),
  closeHelp: () => set({ helpOpen: false, helpFocusTerm: null }),
  setTextStats: (stats) => set({ textStats: stats }),
  setLanguage: (lang) => set({ language: lang }),
  setScanResult: (result) => set({ scanResult: result }),
  setScanOptions: (options) => set({ scanOptions: options }),
  setIsScanning: (v) => set({ isScanning: v }),
  setCleanupMode: (mode) => set({ cleanupMode: mode }),
  setCleanupResult: (result) => set({ cleanupResult: result }),
  setHistory: (history) => set({ history }),

  applyTextMutation: (newText: string, sourceOrLabel: MutationSource | string, labelOpt?: string) => {
    const validSources: MutationSource[] = [
      'scanner-clean',
      'injection-neutralize',
      'watermark-neutralize',
      'footprint-scrub',
      'roundtrip-regen',
    ];
    const source: MutationSource =
      labelOpt !== undefined
        ? (sourceOrLabel as MutationSource)
        : validSources.includes(sourceOrLabel as MutationSource)
          ? (sourceOrLabel as MutationSource)
          : 'scanner-clean';
    const label: string = labelOpt ?? sourceOrLabel;

    set((s) => {
      const snapshot: MutationSnapshot = {
        text: newText,
        source,
        label,
        timestamp: Date.now(),
      };
      const prevHistory = s.history ?? createHistory(s.originalText);
      const updatedHistory = pushSnapshot(prevHistory, newText, label);
      return {
        cleanedText: newText,
        mutationHistory: [...s.mutationHistory, snapshot],
        mutationRedoStack: [],
        history: updatedHistory,
      };
    });
  },

  undoMutation: () => {
    set((s) => {
      if (s.mutationHistory.length === 0) return {};
      const popped = s.mutationHistory[s.mutationHistory.length - 1];
      const newHistory = s.mutationHistory.slice(0, -1);
      const targetText = newHistory.length > 0 ? newHistory[newHistory.length - 1].text : null;
      let newLegacyHistory = s.history;
      if (s.history && canUndo(s.history)) {
        newLegacyHistory = undo(s.history);
      }
      return {
        cleanedText: targetText,
        mutationHistory: newHistory,
        mutationRedoStack: [...s.mutationRedoStack, popped],
        history: newLegacyHistory,
      };
    });
  },

  redoMutation: () => {
    set((s) => {
      if (s.mutationRedoStack.length === 0) return {};
      const toRedo = s.mutationRedoStack[s.mutationRedoStack.length - 1];
      const newRedoStack = s.mutationRedoStack.slice(0, -1);
      let newLegacyHistory = s.history;
      if (s.history && canRedo(s.history)) {
        newLegacyHistory = redo(s.history);
      }
      return {
        cleanedText: toRedo.text,
        mutationHistory: [...s.mutationHistory, toRedo],
        mutationRedoStack: newRedoStack,
        history: newLegacyHistory,
      };
    });
  },

  setWatermarkResult: (result) => set({ watermarkResult: result }),
  setWatermarkSweep: (sweep) => set({ watermarkSweep: sweep }),
  setNeutralizationResult: (result) => set({ neutralizationResult: result }),
  setIsDetectingWatermark: (v) => set({ isDetectingWatermark: v }),
  setFootprintAnalysis: (result) => set({ footprintAnalysis: result }),
  setFootprintRemoval: (result) => set({ footprintRemoval: result }),
  setFootprintScrubReport: (report) => set({ footprintScrubReport: report }),
  setSentenceHeatmap: (heatmap) => set({ sentenceHeatmap: heatmap }),
  setIsAnalyzingFootprint: (v) => set({ isAnalyzingFootprint: v }),
  setRewriteResult: (result) => set({ rewriteResult: result }),

  addReferenceDocument: (doc) => set((s) => ({ referenceDocuments: [...s.referenceDocuments, doc] })),
  removeReferenceDocument: (id) => set((s) => ({ referenceDocuments: s.referenceDocuments.filter(d => d.id !== id) })),
  clearReferenceDocuments: () => set({ referenceDocuments: [] }),

  setPlagiarismResult: (result) => set({ plagiarismResult: result }),
  setIsAnalyzingPlagiarism: (v) => set({ isAnalyzingPlagiarism: v }),

  setReport: (report) => set({ report }),
  setOptimizerResult: (result) => set({ optimizerResult: result }),
  setIsOptimizing: (v) => set({ isOptimizing: v }),
  setPollutionResult: (result) => set({ pollutionResult: result }),
  setPoisonResult: (result) => set({ poisonResult: result }),
  setLmScore: (result) => set({ lmScore: result }),
  setInjectionResult: (result) => set({ injectionResult: result }),
  setIsAnalyzingInjection: (v) => set({ isAnalyzingInjection: v }),
  setThreatResult: (result) => set({ threatResult: result }),
  setIsAnalyzingThreat: (v) => set({ isAnalyzingThreat: v }),
  setAttackBriefing: (key, briefing) => set((s) => ({ attackBriefings: { ...s.attackBriefings, [key]: briefing } })),

  runFullScan: async () => {
    const {
      originalText,
      scanOptions,
      llmConfig,
      appMode,
      referenceDocuments,
      cleanedText,
      footprintRemoval,
      footprintScrubReport,
    } = get();

    if (!originalText || !originalText.trim()) return;

    set({
      isFullScanning: true,
      isScanning: true,
      isAnalyzingInjection: true,
      isAnalyzingThreat: true,
      isDetectingWatermark: true,
      isAnalyzingFootprint: true,
      isAnalyzingPlagiarism: true,
    });

    try {
      const sResult = scan(originalText, scanOptions);
      const iResult = await analyzeInjection(originalText, { llmConfig });
      const tResult = await analyzeThreat(originalText, {
        runCapabilityReview: appMode !== 'offline',
        llmConfig,
      });
      const wResult = detectWatermark(originalText);
      const wSweep = sweepDetection(originalText);
      const fResult = analyzeFootprint(originalText);
      const heatmapOverlay = computeSentenceFingerprintHeatmap(originalText);
      const pResult = await analyzePlagiarism(originalText, referenceDocuments);

      const scrubReportSection = footprintScrubReport ? {
        beforeScore: footprintScrubReport.beforeScore,
        afterScore: footprintScrubReport.afterScore,
        transformsApplied: footprintScrubReport.transforms.length,
        llmWordsRemoved: Math.max(0, footprintScrubReport.breakdown.llmWordsBefore - footprintScrubReport.breakdown.llmWordsAfter),
        hedgingRemoved: Math.max(0, footprintScrubReport.breakdown.hedgingBefore - footprintScrubReport.breakdown.hedgingAfter),
        templatesReplaced: Math.max(0, footprintScrubReport.breakdown.templatesBefore - footprintScrubReport.breakdown.templatesAfter),
        typographicFixed: Math.max(0, footprintScrubReport.breakdown.typographicBefore - footprintScrubReport.breakdown.typographicAfter),
      } : null;

      const fullReport = await buildReport({
        originalText,
        cleanedText: cleanedText || undefined,
        scanResult: sResult,
        injectionResult: iResult,
        threatResult: tResult,
        watermarkResult: wResult,
        footprintResult: fResult,
        footprintRemoval,
        footprintScrubReport: scrubReportSection,
        plagiarismResult: pResult,
      });

      set({
        scanResult: sResult,
        injectionResult: iResult,
        threatResult: tResult,
        watermarkResult: wResult,
        watermarkSweep: wSweep,
        footprintAnalysis: fResult,
        sentenceHeatmap: [heatmapOverlay],
        plagiarismResult: pResult,
        report: fullReport,
      });
    } catch (err) {
      console.error('runFullScan failed:', err);
    } finally {
      set({
        isFullScanning: false,
        isScanning: false,
        isAnalyzingInjection: false,
        isAnalyzingThreat: false,
        isDetectingWatermark: false,
        isAnalyzingFootprint: false,
        isAnalyzingPlagiarism: false,
      });
    }
  },

  setLLMConfig: (config) => set((s) => {
    const next = { ...s.llmConfig, ...config };
    persistLLMConfig(next);
    return { llmConfig: next };
  }),
  setLLMConnected: (v) => set({ llmConnected: v }),
  setIsLLMProcessing: (v) => set({ isLLMProcessing: v }),
  reset: () => set(initialState),
}));
