export type LLMProvider = 'local' | 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'uncensored-offline';

export interface LLMConfig {
  provider: LLMProvider;
  endpoint: string;
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  enabled?: boolean;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  durationMs: number;
}

export interface ProviderPreset {
  label: string;
  endpoint: string;
  model: string;
  /** Whether an API key is required (Ollama runs locally without one). */
  needsKey: boolean;
  /** Where the user obtains a key, shown in the config UI and Help. */
  keyUrl?: string;
  keyHint?: string;
  /** Short note surfaced in the config bar. */
  note?: string;
  /** When true, the note is a privacy warning and rendered prominently. */
  warn?: boolean;
  /** When true, this provider runs a model on-device (no endpoint/key; uses local.ts). */
  local?: boolean;
}

export const PROVIDER_PRESETS: Record<LLMProvider, ProviderPreset> = {
  local: {
    label: 'On-device · Free, private (no key)',
    endpoint: '',
    model: 'Xenova/LaMini-Flan-T5-77M',
    needsKey: false,
    local: true,
    note: 'Runs a small AI model directly on your device. No account, no key, and your text never leaves your computer. The model downloads once, then works offline.',
  },
  ollama: {
    label: 'Ollama (local)',
    endpoint: 'http://localhost:11434',
    model: 'llama3.1',
    needsKey: false,
    note: 'Runs fully on your machine. Nothing leaves the device.',
  },
  openai: {
    label: 'OpenAI-compatible',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'platform.openai.com → API keys',
    note: 'Works with OpenAI or any OpenAI-compatible endpoint.',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    endpoint: 'https://api.anthropic.com',
    model: 'claude-sonnet-5',
    needsKey: true,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'console.anthropic.com → Settings → API keys',
    note: 'Sent direct from the browser (Test confirms CORS access).',
  },
  gemini: {
    label: 'Google (Gemini)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    needsKey: true,
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyHint: 'aistudio.google.com → Get API key',
    note: 'Key is passed in the request URL (fine for personal use).',
  },
  'uncensored-offline': {
    label: 'Uncensored (offline, advanced)',
    endpoint: 'http://localhost:11434',
    model: 'dolphin-mistral',
    needsKey: false,
    warn: true,
    note: 'Runs an unrestricted model locally via Ollama (nothing leaves your device). Reduced built-in safety filtering — use this to eliminate refusal risk on legitimate defensive/forensic analysis, not for general-purpose use. Try "ollama pull dolphin-mistral" or "dolphin-llama3" first.',
  },
};

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  // Default to the on-device model: no key, no signup, nothing to install —
  // the friendliest first experience for a non-technical user.
  provider: 'local',
  endpoint: PROVIDER_PRESETS.local.endpoint,
  model: PROVIDER_PRESETS.local.model,
  maxTokens: 2048,
  temperature: 0.7,
};

export interface LocalModelOption {
  id: string;
  label: string;
  role: 'rewriter-fast' | 'instruct-general' | 'instruct-pro' | 'perplexity-scorer' | 'semantic-embedder';
  pipelineTask: 'text2text-generation' | 'text-generation' | 'causal-lm-scorer' | 'feature-extraction';
  dtype: 'q4' | 'q8' | 'fp16';
  approxSizeMb: number;
  sizeEstimate?: string;
  supportsJsonAnalysis: boolean;
  blurb: string;
  recommendedUse?: string;
  capabilities?: string[];
  meantFor?: string[];
}

export const LOCAL_MODELS: LocalModelOption[] = [
  {
    id: 'Xenova/LaMini-Flan-T5-77M',
    label: 'Fast (77M)',
    role: 'rewriter-fast',
    pipelineTask: 'text2text-generation',
    dtype: 'q8',
    approxSizeMb: 80,
    sizeEstimate: '80 MB',
    supportsJsonAnalysis: false,
    recommendedUse: 'Lightweight rewrites on any hardware',
    capabilities: ['Fast Paraphrasing', 'Text Simplification'],
    blurb: 'Smallest and quickest. Good for light rewrites on any machine.',
    meantFor: ['AI Fingerprint Rewriting'],
  },
  {
    id: 'Xenova/LaMini-Flan-T5-248M',
    label: 'Better (248M)',
    role: 'instruct-general',
    pipelineTask: 'text2text-generation',
    dtype: 'q8',
    approxSizeMb: 250,
    sizeEstimate: '250 MB',
    supportsJsonAnalysis: false,
    recommendedUse: 'Stronger rewrites, needs more memory',
    capabilities: ['High-Quality Paraphrasing', 'Sentence Restructuring'],
    blurb: 'Larger download, noticeably stronger rewrites. Needs a bit more memory.',
    meantFor: ['AI Fingerprint Rewriting'],
  },
  {
    id: 'onnx-community/SmolLM2-360M-Instruct-ONNX',
    label: 'Smart Local AI (360M Instruct)',
    role: 'instruct-general',
    pipelineTask: 'text-generation',
    dtype: 'q4',
    approxSizeMb: 210,
    sizeEstimate: '210 MB',
    supportsJsonAnalysis: true,
    recommendedUse: 'Offline JSON analysis, reasoning, and humanization',
    capabilities: ['Structured JSON Output', 'Defensive Analysis', 'Humanization'],
    blurb: 'Balanced 360M instruction model with full structured JSON output support.',
    meantFor: ['AI Fingerprint Rewriting', 'Attack Vector & Threat AI Explanation'],
  },
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    label: 'Pro Local AI (500M Instruct)',
    role: 'instruct-pro',
    pipelineTask: 'text-generation',
    dtype: 'q4',
    approxSizeMb: 310,
    sizeEstimate: '310 MB',
    supportsJsonAnalysis: true,
    recommendedUse: 'Highest precision offline analysis and rewriting',
    capabilities: ['Deep Threat Analysis', 'Structured JSON Output', 'Pro Humanization'],
    blurb: 'High-precision 0.5B instruction model for offline threat and forensic review.',
    meantFor: ['AI Fingerprint Rewriting', 'Attack Vector & Threat AI Explanation'],
  },
];

export const LOCAL_AUX_MODELS: LocalModelOption[] = [
  {
    id: 'onnx-community/SmolLM2-135M-ONNX',
    label: 'Neural Perplexity Scorer (SmolLM2-135M)',
    role: 'perplexity-scorer',
    pipelineTask: 'causal-lm-scorer',
    dtype: 'q8',
    approxSizeMb: 95,
    sizeEstimate: '95 MB',
    supportsJsonAnalysis: false,
    recommendedUse: 'Real LM perplexity scoring',
    capabilities: ['Token-level NLL evaluation', 'Machine uniformity detection'],
    blurb: 'Lightweight causal LM for perplexity evaluation against human baselines.',
    meantFor: ['Neural Perplexity Scoring'],
  },
  {
    id: 'Xenova/gpt2',
    label: 'Neural Perplexity Scorer (GPT-2)',
    role: 'perplexity-scorer',
    pipelineTask: 'causal-lm-scorer',
    dtype: 'q8',
    approxSizeMb: 125,
    sizeEstimate: '125 MB',
    supportsJsonAnalysis: false,
    recommendedUse: 'Baseline GPT-2 perplexity scoring',
    capabilities: ['Causal LM perplexity', 'Distribution evaluation'],
    blurb: 'Standard GPT-2 small quantized model for windowed perplexity.',
    meantFor: ['Neural Perplexity Scoring'],
  },
  {
    id: 'Xenova/all-MiniLM-L6-v2',
    label: 'Semantic Embedding Engine (MiniLM)',
    role: 'semantic-embedder',
    pipelineTask: 'feature-extraction',
    dtype: 'q8',
    approxSizeMb: 23,
    sizeEstimate: '23 MB',
    supportsJsonAnalysis: false,
    recommendedUse: 'Semantic sentence embeddings for plagiarism detection',
    capabilities: ['Cosine similarity', 'Paraphrase detection'],
    blurb: 'Sentence transformer producing 384-dim dense embeddings.',
    meantFor: ['Plagiarism & Semantic Paraphrase Detection'],
  },
];

export function isInstructLocalModel(modelId: string): boolean {
  const m = LOCAL_MODELS.find(opt => opt.id === modelId);
  return m ? m.supportsJsonAnalysis : false;
}

export function canRunAI(appMode: 'offline' | 'online', config: LLMConfig): boolean {
  return (
    appMode === 'online' ||
    config.provider === 'local' ||
    ((config.provider === 'ollama' || config.provider === 'uncensored-offline') &&
      (config.endpoint.includes('localhost') || config.endpoint.includes('127.0.0.1')))
  );
}

