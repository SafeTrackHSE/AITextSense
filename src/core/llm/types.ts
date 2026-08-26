export type LLMProvider = 'local' | 'ollama' | 'openai' | 'anthropic' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  endpoint: string;
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
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
