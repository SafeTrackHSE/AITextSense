/**
 * On-device rewrite via Transformers.js (Hugging Face).
 * Runs a small instruction-tuned model entirely in the browser — no API key,
 * no server, and the text never leaves the device. The model weights are
 * downloaded once from the Hugging Face CDN and cached by the browser, so
 * later runs work offline.
 *
 * Built for non-technical users: everything reports human-readable progress,
 * and failures return plain-language guidance.
 */
import type { LLMResponse, LLMConfig } from './types';
import { LOCAL_MODELS, LOCAL_AUX_MODELS, type LocalModelOption } from './types';
import type { RewriteMode } from '../rewrite/types';

export { LOCAL_MODELS, LOCAL_AUX_MODELS, type LocalModelOption };

/**
 * Short, T5-style task prefixes. Small instruction models (LaMini-Flan-T5)
 * follow a single terse directive far better than the long, meta REWRITE_PROMPTS
 * used for full LLMs — those cause the model to paraphrase the instruction itself.
 */
const LOCAL_TASKS: Record<RewriteMode, string> = {
  humanize: 'Paraphrase the following text in a natural, casual style: ',
  deparaphrase: 'Rewrite the following text using different words and sentence structure: ',
  neutralize: 'Rewrite the following text more simply and vary the sentence structure: ',
};

export const DEFAULT_LOCAL_MODEL = LOCAL_MODELS[0].id;

/** Progress states surfaced to the UI, in plain language. */
export type LocalLoadStatus = 'idle' | 'downloading' | 'preparing' | 'ready' | 'error';

export interface LocalProgress {
  status: LocalLoadStatus;
  /** 0..100 overall download progress (best-effort across files). */
  percent: number;
  /** Human-readable line, e.g. "Downloading model (42%)". */
  message: string;
}

export type ProgressFn = (p: any, status?: string) => void;

function notifyProgress(onProgress: ProgressFn | undefined, status: LocalLoadStatus, percent: number, message: string) {
  if (!onProgress) return;
  const p: LocalProgress = { status, percent, message };
  if (onProgress.length >= 2) {
    (onProgress as (progress: number, status: string) => void)(percent, message);
  } else {
    (onProgress as (p: LocalProgress) => void)(p);
  }
}

// One cached pipeline per model id, plus the in-flight promise to dedupe loads.
const pipelineCache = new Map<string, unknown>();
const loadingPromises = new Map<string, Promise<unknown>>();

/** True when this browser exposes WebGPU (much faster than the WASM fallback). */
export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && !!(navigator as any).gpu;
}

/** Detect hardware acceleration capability. */
export async function detectHardwareAcceleration(): Promise<'webgpu' | 'wasm'> {
  if (hasWebGPU()) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch {
      // fallback to wasm
    }
  }
  return 'wasm';
}

/** Whether a model is already downloaded + ready in this session. */
export function isModelReady(modelId: string): boolean {
  return pipelineCache.has(modelId);
}

export async function getPipeline(modelId: string, onProgress?: ProgressFn): Promise<unknown> {
  if (pipelineCache.has(modelId)) return pipelineCache.get(modelId);
  if (loadingPromises.has(modelId)) return loadingPromises.get(modelId);

  const load = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    // Always fetch from the Hugging Face hub (no bundled local models).
    env.allowLocalModels = false;

    // Track per-file download progress and report a best-effort aggregate.
    const fileProgress = new Map<string, number>();
    const progress_callback = (data: {
      status?: string; file?: string; progress?: number; name?: string;
    }) => {
      if (data.status === 'progress' && data.file) {
        fileProgress.set(data.file, data.progress ?? 0);
        const vals = [...fileProgress.values()];
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        notifyProgress(onProgress, 'downloading', Math.round(avg), `Downloading model (${Math.round(avg)}%)`);
      } else if (data.status === 'done' || data.status === 'ready') {
        notifyProgress(onProgress, 'preparing', 100, 'Preparing model…');
      }
    };

    const device = hasWebGPU() ? 'webgpu' : 'wasm';
    notifyProgress(onProgress, 'downloading', 0, 'Starting download…');

    const modelOption = LOCAL_MODELS.find(m => m.id === modelId);
    const isTextGen = modelOption?.pipelineTask === 'text-generation';
    const task = isTextGen ? 'text-generation' : 'text2text-generation';
    const dtype = modelOption?.dtype ?? (isTextGen ? 'q4' : 'q8');

    let pipe: unknown;
    try {
      pipe = await pipeline(task as any, modelId, { device, dtype: dtype as any, progress_callback });
    } catch {
      // WebGPU can fail on some webviews (e.g. macOS Tauri) — fall back to WASM.
      pipe = await pipeline(task as any, modelId, { device: 'wasm', dtype: dtype as any, progress_callback });
    }

    pipelineCache.set(modelId, pipe);
    notifyProgress(onProgress, 'ready', 100, 'Model ready — runs on your device.');
    return pipe;
  })();

  loadingPromises.set(modelId, load);
  try {
    return await load;
  } finally {
    loadingPromises.delete(modelId);
  }
}

/**
 * Where on-device models live. Transformers.js caches weights in the browser's
 * Cache Storage (under the app origin) — NOT a filesystem folder the user can
 * pick. This reports what's cached and the origin's total storage usage so the
 * UI can show it and offer a Clear button.
 */
export async function getModelStorage(): Promise<{ files: number; usageMb: number | null; supported: boolean }> {
  let files = 0;
  let usageMb: number | null = null;
  let supported = false;
  try {
    if (typeof caches !== 'undefined') {
      supported = true;
      for (const name of await caches.keys()) {
        if (/transformers/i.test(name)) {
          const c = await caches.open(name);
          files += (await c.keys()).length;
        }
      }
    }
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est.usage != null) usageMb = Math.round(est.usage / (1024 * 1024));
    }
  } catch { /* ignore */ }
  return { files, usageMb, supported };
}

/** Delete cached model weights and drop the in-memory pipelines. */
export async function clearModelStorage(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      for (const name of await caches.keys()) {
        if (/transformers/i.test(name)) await caches.delete(name);
      }
    }
  } catch { /* ignore */ }
  pipelineCache.clear();
}

/** Pre-download + initialize a model (used by the "Download model" button). */
export async function preloadLocalModel(modelId: string, onProgress?: ProgressFn): Promise<void> {
  try {
    await getPipeline(modelId, onProgress);
  } catch (err) {
    notifyProgress(
      onProgress,
      'error',
      0,
      `Could not load the model. Check your internet connection and try again. (${err instanceof Error ? err.message : String(err)})`,
    );
    throw err;
  }
}

/**
 * Rewrite `text` on-device using `instruction`. Loads the model on first use
 * (reporting progress) and reuses it afterward.
 */
export async function rewriteLocal(
  text: string,
  mode: RewriteMode,
  modelId: string,
  onProgress?: ProgressFn,
): Promise<LLMResponse> {
  const start = performance.now();
  const pipe = await getPipeline(modelId, onProgress);
  const modelOption = LOCAL_MODELS.find(m => m.id === modelId);

  notifyProgress(onProgress, 'ready', 100, 'Rewriting on your device…');

  // Causal Instruct models (SmolLM2-360M, Qwen2.5-0.5B)
  if (modelOption?.pipelineTask === 'text-generation') {
    const messages = [
      {
        role: 'system',
        content: 'You are an expert humanizing editor. Rewrite the following text to sound completely natural, engaging, and human-written. Eliminate all repetitive rhythm, buzzwords, and AI clichés. Return ONLY the rewritten text.',
      },
      {
        role: 'user',
        content: `${LOCAL_TASKS[mode]}${text}`,
      },
    ];

    const output = await (pipe as any)(messages, {
      max_new_tokens: 512,
      temperature: 0.2,
      do_sample: false,
      return_full_text: false,
    });

    let rawText = '';
    if (Array.isArray(output) && output.length > 0) {
      const item = output[0];
      if (typeof item?.generated_text === 'string') {
        rawText = item.generated_text;
      } else if (Array.isArray(item?.generated_text)) {
        const last = item.generated_text[item.generated_text.length - 1];
        rawText = last?.content ?? '';
      } else if (item?.content) {
        rawText = item.content;
      }
    }

    let out = rawText.trim()
      .replace(/^(?:paraphrase|rewrite)[^:]*:\s*/i, '');
    return { text: out.trim() || text, tokensUsed: 0, durationMs: performance.now() - start };
  }

  // Seq2Seq models (LaMini-Flan-T5-77M, 248M) handle one sentence at a time
  const task = LOCAL_TASKS[mode];
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const rewritten: string[] = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length < 3) { rewritten.push(s); continue; }
    const approxWords = trimmed.split(/\s+/).length;
    const maxNewTokens = Math.min(256, Math.max(32, Math.round(approxWords * 2)));
    const output = await (pipe as any)(task + trimmed, {
      max_new_tokens: maxNewTokens,
      temperature: 0.7,
      do_sample: true,
      repetition_penalty: 1.3,
      no_repeat_ngram_size: 3,
    });
    const piece = Array.isArray(output) ? (output[0]?.generated_text ?? '').trim() : '';
    rewritten.push(piece || trimmed);
  }

  let out = rewritten.join(' ').replace(/\s+/g, ' ').trim();
  // Guard against the model echoing the task prefix back.
  out = out.replace(/paraphrase the following text[^:]*:\s*/i, '')
           .replace(/rewrite the following text[^:]*:\s*/i, '');
  return { text: out.trim(), tokensUsed: 0, durationMs: performance.now() - start };
}

/**
 * Generate freeform or instruction-driven text on-device using a local model.
 */
export async function generateLocal(
  prompt: string,
  modelId: string,
  options: { max_new_tokens?: number; temperature?: number } = {},
): Promise<string> {
  const pipe = await getPipeline(modelId);
  const modelOption = LOCAL_MODELS.find(m => m.id === modelId);

  if (modelOption?.pipelineTask === 'text-generation') {
    const messages = [
      { role: 'user', content: prompt },
    ];
    const output = await (pipe as any)(messages, {
      max_new_tokens: options.max_new_tokens ?? 512,
      temperature: options.temperature ?? 0.2,
      do_sample: false,
      return_full_text: false,
    });
    if (Array.isArray(output) && output.length > 0) {
      const item = output[0];
      if (typeof item?.generated_text === 'string') return item.generated_text;
      if (Array.isArray(item?.generated_text)) {
        const last = item.generated_text[item.generated_text.length - 1];
        return last?.content ?? '';
      }
      if (item?.content) return item.content;
    }
    return '';
  } else {
    const output = await (pipe as any)(prompt, {
      max_new_tokens: options.max_new_tokens ?? 256,
      temperature: options.temperature ?? 0.2,
      do_sample: false,
    });
    if (Array.isArray(output) && output.length > 0) {
      return output[0]?.generated_text ?? '';
    }
    return '';
  }
}

function tryParseLocalJSON<T>(raw: string): T | null {
  const trimmed = raw.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    const match = unfenced.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { /* fall through */ }
    }
    return null;
  }
}

export async function generateLocalJSON<T>(
  systemPrompt: string,
  userContent: string,
  config: LLMConfig,
  spec: { schema: Record<string, unknown> },
): Promise<{ data: T | null; raw: string; parseError: boolean; declinedTool: boolean; error?: string; durationMs: number }> {
  const start = performance.now();
  const prompt = `${systemPrompt}\n\nRespond ONLY with a single valid JSON object matching this schema: ${JSON.stringify(spec.schema)}\n\n${userContent}`;

  try {
    const raw = await generateLocal(prompt, config.model, {
      max_new_tokens: config.maxTokens ?? 512,
      temperature: config.temperature ?? 0.2,
    });
    const data = tryParseLocalJSON<T>(raw);
    return {
      data,
      raw,
      parseError: data === null,
      declinedTool: false,
      durationMs: performance.now() - start,
    };
  } catch (err) {
    return {
      data: null,
      raw: '',
      parseError: false,
      declinedTool: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: performance.now() - start,
    };
  }
}
