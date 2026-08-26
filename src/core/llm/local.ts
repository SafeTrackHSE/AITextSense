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
import type { LLMResponse } from './types';
import type { RewriteMode } from '../rewrite/types';

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

/** Curated small models — kept intentionally short so the picker isn't overwhelming. */
export interface LocalModelOption {
  id: string;
  label: string;
  approxSizeMb: number;
  blurb: string;
}

export const LOCAL_MODELS: LocalModelOption[] = [
  {
    id: 'Xenova/LaMini-Flan-T5-77M',
    label: 'Fast (77M)',
    approxSizeMb: 80,
    blurb: 'Smallest and quickest. Good for light rewrites on any machine.',
  },
  {
    id: 'Xenova/LaMini-Flan-T5-248M',
    label: 'Better (248M)',
    approxSizeMb: 250,
    blurb: 'Larger download, noticeably stronger rewrites. Needs a bit more memory.',
  },
];

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

export type ProgressFn = (p: LocalProgress) => void;

// One cached pipeline per model id, plus the in-flight promise to dedupe loads.
const pipelineCache = new Map<string, unknown>();
const loadingPromises = new Map<string, Promise<unknown>>();

/** True when this browser exposes WebGPU (much faster than the WASM fallback). */
export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/** Whether a model is already downloaded + ready in this session. */
export function isModelReady(modelId: string): boolean {
  return pipelineCache.has(modelId);
}

async function getPipeline(modelId: string, onProgress?: ProgressFn): Promise<unknown> {
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
        onProgress?.({ status: 'downloading', percent: Math.round(avg), message: `Downloading model (${Math.round(avg)}%)` });
      } else if (data.status === 'done' || data.status === 'ready') {
        onProgress?.({ status: 'preparing', percent: 100, message: 'Preparing model…' });
      }
    };

    const device = hasWebGPU() ? 'webgpu' : 'wasm';
    onProgress?.({ status: 'downloading', percent: 0, message: 'Starting download…' });

    let pipe: unknown;
    try {
      pipe = await pipeline('text2text-generation', modelId, { device, progress_callback });
    } catch {
      // WebGPU can fail on some webviews (e.g. macOS Tauri) — fall back to WASM.
      pipe = await pipeline('text2text-generation', modelId, { device: 'wasm', progress_callback });
    }

    pipelineCache.set(modelId, pipe);
    onProgress?.({ status: 'ready', percent: 100, message: 'Model ready — runs on your device.' });
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
    onProgress?.({
      status: 'error',
      percent: 0,
      message: `Could not load the model. Check your internet connection and try again. (${err instanceof Error ? err.message : String(err)})`,
    });
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
  const pipe = (await getPipeline(modelId, onProgress)) as (
    input: string, opts: Record<string, unknown>
  ) => Promise<Array<{ generated_text: string }>>;

  onProgress?.({ status: 'ready', percent: 100, message: 'Rewriting on your device…' });

  // Small T5 models handle one sentence at a time far better than a whole
  // paragraph, so rewrite sentence-by-sentence and rejoin.
  const task = LOCAL_TASKS[mode];
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const rewritten: string[] = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length < 3) { rewritten.push(s); continue; }
    const approxWords = trimmed.split(/\s+/).length;
    const maxNewTokens = Math.min(256, Math.max(32, Math.round(approxWords * 2)));
    const output = await pipe(task + trimmed, {
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
