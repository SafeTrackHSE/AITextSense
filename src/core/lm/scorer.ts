/**
 * AI TextSense v2 — Real-LM Perplexity Scorer
 *
 * Replaces v1's self-frequency perplexity PROXY with an actual causal LM
 * (GPT-2 class, quantized, WebGPU→WASM fallback) running fully on-device.
 *
 * Output is a windowed negative-log-likelihood curve over the text plus a
 * distance metric against a calibrated HUMAN baseline — so "humanization"
 * becomes a measurable target instead of a heuristic.
 */
import type { ProgressFn } from '../llm/local';

export interface PerplexityWindow {
  startToken: number;
  endToken: number;
  meanNll: number;
  perplexity: number;
}

export interface LMScanResult {
  windows: PerplexityWindow[];
  meanNll: number;
  stdNll: number;
  uniformity: number;
  /** Composite distance from the human baseline (lower = more human-like). */
  humanDistance: number;
  /** 0..1 — how confidently this reads as machine-uniform vs human-varied. */
  machineLikelihood: number;
  totalTokens: number;
  durationMs: number;
}

/**
 * Human baseline calibration constants for windowed GPT-2-small NLL on
 * natural human prose (~64-token windows): mean ≈ 3.85 nats/token,
 * σ across windows ≈ 0.62. Tunable — recalibrate from the UI later.
 */
export const HUMAN_BASELINE = {
  meanNll: 3.85,
  stdNll: 0.62,
};

type CacheEntry = { tokenizer: unknown; model: unknown };
const lmCache = new Map<string, Promise<CacheEntry>>();

async function getLM(
  modelId = 'Xenova/gpt2',
  onProgress?: ProgressFn,
): Promise<CacheEntry> {
  if (!lmCache.has(modelId)) {
    const load = (async () => {
      const { AutoTokenizer, AutoModelForCausalLM, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      onProgress?.({ status: 'downloading', percent: 5, message: 'Loading scorer model…' });

      const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
      const device = hasWebGPU ? 'webgpu' : 'wasm';

      const tokenizer = await AutoTokenizer.from_pretrained(modelId);
      let model;
      try {
        model = await AutoModelForCausalLM.from_pretrained(modelId, { device, dtype: 'q8' });
      } catch {
        model = await AutoModelForCausalLM.from_pretrained(modelId, { device: 'wasm', dtype: 'q8' });
      }
      onProgress?.({ status: 'ready', percent: 100, message: 'Scorer ready.' });
      return { tokenizer, model };
    })();
    lmCache.set(modelId, load);
    load.catch(() => lmCache.delete(modelId));
  }
  return lmCache.get(modelId)!;
}

export function isScorerReady(modelId = 'Xenova/gpt2'): boolean {
  return lmCache.has(modelId);
}

/**
 * Score text with a real causal LM: windowed NLL curve + human-distance.
 */
export async function scoreWithLM(
  text: string,
  options: {
    modelId?: string;
    windowTokens?: number;
    stride?: number;
    maxTokens?: number;
    onProgress?: ProgressFn;
  } = {},
): Promise<LMScanResult> {
  const start = performance.now();
  const windowTokens = options.windowTokens ?? 64;
  const stride = options.stride ?? 32;
  const maxTokens = options.maxTokens ?? 2048;

  const { tokenizer, model } = await getLM(options.modelId ?? 'Xenova/gpt2', options.onProgress);
  const onProgress = options.onProgress;

  const encoded = (tokenizer as { encode: (t: string) => number[] }).encode(text);
  const ids = encoded.slice(0, maxTokens);
  if (ids.length < windowTokens + 1) {
    throw new Error(`Text too short for LM scoring (${ids.length} tokens; need ≥ ${windowTokens + 1}).`);
  }

  const windows: PerplexityWindow[] = [];
  const T = ids.length;

  for (let ws = 0; ws + windowTokens < T; ws += stride) {
    const we = Math.min(ws + windowTokens, T - 1);
    const chunk = ids.slice(ws, we + 1);

    const tok = tokenizer as unknown as {
      (input: number[]): { input_ids: unknown };
    };
    const inputs = tok(chunk);

    const modelFn = model as unknown as (
      i: Record<string, unknown>,
    ) => Promise<{ logits: { data: Float32Array; dims: number[] } }>;
    const out = await modelFn(inputs as unknown as Record<string, unknown>);

    const [seqLen, vocabSize] = [out.logits.dims[0], out.logits.dims[2]];
    let nllSum = 0;
    let count = 0;
    // Shift: token t predicted from logits row t-1.
    for (let t = 1; t <= seqLen - 1; t++) {
      const target = chunk[t];
      const rowOffset = (t - 1) * vocabSize;
      // log-softmax
      let maxV = -Infinity;
      for (let v = 0; v < vocabSize; v++) {
        const val = out.logits.data[rowOffset + v];
        if (val > maxV) maxV = val;
      }
      let sumExp = 0;
      for (let v = 0; v < vocabSize; v++) sumExp += Math.exp(out.logits.data[rowOffset + v] - maxV);
      const logZ = maxV + Math.log(sumExp);
      nllSum += logZ - out.logits.data[rowOffset + target];
      count++;
    }

    const meanNll = nllSum / count;
    windows.push({
      startToken: ws,
      endToken: we,
      meanNll,
      perplexity: Math.exp(meanNll),
    });

    if (onProgress && windows.length % 4 === 0) {
      const pct = Math.min(95, Math.round((ws / T) * 100));
      onProgress?.({ status: 'ready', percent: pct, message: `Scoring… ${pct}%` });
    }
  }

  const nlls = windows.map(w => w.meanNll);
  const mean = nlls.reduce((a, b) => a + b, 0) / nlls.length;
  const variance = nlls.reduce((a, b) => a + (b - mean) ** 2, 0) / nlls.length;
  const std = Math.sqrt(variance);
  const uniformity = std > 0 ? 1 / (1 + std) : 1;

  // Distance from human manifold: penalize BOTH too-flat curves AND
  // absolute mismatch with human NLL statistics.
  const meanGap = Math.abs(mean - HUMAN_BASELINE.meanNll) / HUMAN_BASELINE.stdNll;
  const stdRatio = std / HUMAN_BASELINE.stdNll;
  const stdPenalty = stdRatio < 1 ? 1 - stdRatio : 0; // flatter than human = machine-ish
  const humanDistance = meanGap * 0.5 + stdPenalty * 1.2 + (uniformity > 0.7 ? (uniformity - 0.7) * 2 : 0);
  const machineLikelihood = Math.min(1, Math.max(0, humanDistance));

  onProgress?.({ status: 'ready', percent: 100, message: 'Score complete.' });

  return {
    windows,
    meanNll: mean,
    stdNll: std,
    uniformity,
    humanDistance,
    machineLikelihood,
    totalTokens: ids.length,
    durationMs: performance.now() - start,
  };
}
