import type { LLMConfig, LLMResponse, LLMProvider } from './types';
import { isInstructLocalModel, PROVIDER_PRESETS } from './types';
import { generateLocalJSON } from './local';

/** Appends a path segment to a base URL only if the URL doesn't already end with it. */
function buildUrl(base: string, path: string): string {
  const trimmed = base.replace(/\/+$/, '');
  if (trimmed.endsWith(path)) return trimmed;
  return `${trimmed}${path}`;
}

/** Validates the endpoint is non-empty and looks like a URL before we hit the network. */
function assertEndpoint(endpoint: string): void {
  if (!endpoint || endpoint.trim() === '') {
    throw new Error('LLM endpoint is not configured. Enter a URL in the LLM Config bar.');
  }
  try {
    new URL(endpoint);
  } catch {
    throw new Error(`LLM endpoint is not a valid URL: "${endpoint}"`);
  }
}

/**
 * Falls back to URL-sniffing when a config predates the provider field
 * (e.g. an older persisted config in localStorage).
 */
function inferProvider(config: LLMConfig): LLMProvider {
  if (config.provider) return config.provider;
  const ep = (config.endpoint || '').toLowerCase();
  if (ep.includes('anthropic')) return 'anthropic';
  if (ep.includes('generativelanguage') || ep.includes('gemini')) return 'gemini';
  if (ep.includes(':1234')) return 'lmstudio';
  if (ep.includes('opencode')) return 'opencode-zen';
  if (ep.includes('pollinations')) return 'pollinations-free';
  if (ep.includes('openrouter')) return 'openrouter-free';
  if (ep.includes('groq')) return 'groq-free';
  if (ep.includes('11434') || ep.includes('ollama') || ep.includes('/api/generate') || ep.includes('/api/chat')) return 'ollama';
  return 'openai';
}

/**
 * Universal neutral fetch that works transparently across all operating systems,
 * desktop runtimes (Tauri native IPC with zero CORS/PNA gates), and browser environments
 * (with automatic IPv4 loopback fallback and Vite dev/preview server proxy).
 */
export async function neutralFetch(url: string, init?: RequestInit): Promise<Response> {
  // Normalize headers helper
  const extractHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => { headers[k] = v; });
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) headers[k] = v;
      } else {
        Object.assign(headers, init.headers as Record<string, string>);
      }
    }
    if (!headers['User-Agent'] && !headers['user-agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
    return headers;
  };

  // 1. If running inside Tauri desktop app, use native Rust HTTP command (0 CORS, 0 PNA restrictions)
  if (typeof window !== 'undefined') {
    const tauri = (window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__;
    const invoke = tauri?.core?.invoke || tauri?.invoke;
    if (typeof invoke === 'function') {
      try {
        const headers = extractHeaders();
        const bodyStr = typeof init?.body === 'string' ? init.body : undefined;
        const res: { status: number; body: string; headers: Record<string, string> } = await invoke('native_http_request', {
          url,
          method: init?.method || 'GET',
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          body: bodyStr,
        });

        return new Response(res.body, {
          status: res.status,
          headers: res.headers,
        });
      } catch {
        // Fall back to standard fetch if invoke encounters an internal error
      }
    }
  }

  // Helper to dispatch through Vite /api/llm-proxy
  const callProxy = async (targetUrl: string): Promise<Response | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const headers = extractHeaders();
      const proxyRes = await fetch('/api/llm-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          method: init?.method || 'GET',
          headers,
          body: init?.body,
        }),
      });
      if (
        proxyRes.ok ||
        proxyRes.status === 400 ||
        proxyRes.status === 401 ||
        proxyRes.status === 403 ||
        proxyRes.status === 404 ||
        proxyRes.status === 500
      ) {
        return proxyRes;
      }
    } catch {
      // Proxy not running or failed
    }
    return null;
  };

  // 2. Cloud endpoints that Cloudflare Turnstile blocks from browser origins (e.g. Pollinations, OpenCode)
  // route through /api/llm-proxy immediately when in browser
  const isCloudTurnstileTarget = url.includes('pollinations.ai') || url.includes('opencode.ai');
  if (isCloudTurnstileTarget) {
    const proxyRes = await callProxy(url);
    if (proxyRes) return proxyRes;
  }

  // 3. Direct browser fetch with automatic localhost <-> 127.0.0.1 dual-stack fallback
  try {
    const res = await fetch(url, init);
    // If direct fetch returned 403 (Turnstile or Cloudflare protection) or CORS blocked, retry via proxy
    if (res.status === 403 && !isCloudTurnstileTarget) {
      const clone = res.clone();
      const text = await clone.text().catch(() => '');
      if (text.includes('Turnstile') || text.includes('1010') || text.includes('Cloudflare')) {
        const proxyRes = await callProxy(url);
        if (proxyRes) return proxyRes;
      }
    }
    return res;
  } catch (err: any) {
    // If connection refused on localhost, try 127.0.0.1 immediately
    if (url.includes('localhost')) {
      const altUrl = url.replace('localhost', '127.0.0.1');
      try {
        return await fetch(altUrl, init);
      } catch {
        // Fall through to proxy
      }
    } else if (url.includes('127.0.0.1')) {
      const altUrl = url.replace('127.0.0.1', 'localhost');
      try {
        return await fetch(altUrl, init);
      } catch {
        // Fall through to proxy
      }
    }

    // 4. Proxy fallback
    const proxyRes = await callProxy(url);
    if (proxyRes) return proxyRes;

    throw err;
  }
}

/** Fetches currently available / loaded models from an endpoint (LM Studio, Ollama, etc.) */
export async function fetchAvailableModels(config: LLMConfig): Promise<string[]> {
  const ep = (config.endpoint || '').trim().replace(/\/+$/, '');
  if (!ep) return [];

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  try {
    const isOllama = config.provider === 'ollama' || config.provider === 'uncensored-offline' || ep.includes(':11434');
    const isOpenAI = !isOllama || ep.includes(':1234') || ep.includes('/v1') || ep.includes('/chat/completions');

    if (isOpenAI) {
      const modelsUrl = ep.endsWith('/v1')
        ? `${ep}/models`
        : ep.includes('/v1')
          ? buildUrl(ep, '/models')
          : `${ep}/v1/models`;
      const res = await neutralFetch(modelsUrl, { headers, signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          return data.data.map((m: any) => (typeof m === 'string' ? m : m.id)).filter(Boolean);
        }
      }
    }

    if (isOllama) {
      const tagsUrl = buildUrl(ep, '/api/tags');
      const res = await neutralFetch(tagsUrl, { headers, signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.models)) {
          return data.models.map((m: any) => m.name).filter(Boolean);
        }
      }
    }
  } catch {
    // Graceful fallback on network timeout/failure
  }
  return [];
}

// ---------------------------------------------------------------------------
// JSON-mode structured output — used by features that need a reliable typed
// response (e.g. Injection semantic evaluation, Threat capability review)
// instead of free-text generation. Each provider gets its OWN native
// structured-output mechanism rather than a single "please respond in JSON"
// prompt trick applied everywhere — that's what actually gets reliability:
//   - OpenAI:   response_format: json_object (API-enforced JSON syntax)
//   - Gemini:   generationConfig.responseMimeType: application/json
//   - Ollama:   format: 'json' (grammar-constrained decoding — the strongest
//               guarantee of the four, and works fully offline)
//   - Anthropic: no native JSON mode. Tool-use is the reliable mechanism —
//               forcing a single tool call means Anthropic itself validates
//               the response against the JSON Schema before returning it.
// ---------------------------------------------------------------------------

/** Minimal JSON Schema description used for Anthropic tool input / documented in-prompt for others. */
export interface JSONModeSpec {
  /** Short machine name, e.g. "threat_explanation" — used as the Anthropic tool name. */
  name: string;
  /** One sentence describing the shape, used as the Anthropic tool description and folded into prompts. */
  description: string;
  /** JSON Schema object (standard draft-07 subset — type/properties/required is enough for all providers used here). */
  schema: Record<string, unknown>;
}

export interface JSONModeResult<T = unknown> {
  /** Parsed JSON on success; null if the provider didn't return something parseable as JSON at all. */
  data: T | null;
  /** Raw text actually returned — kept even on success so callers/UI can show it for transparency. */
  raw: string;
  /** True when the response failed to parse as JSON syntax (distinct from "parsed, but doesn't match our shape" — that's the caller's job to check). */
  parseError: boolean;
  /** True specifically for the Anthropic path when the model responded with prose instead of calling the forced tool — the clearest cross-provider refusal signal available. */
  declinedTool: boolean;
  error?: string;
  durationMs: number;
}

export function tryParseJSON<T>(raw: string): T | null {
  const trimmed = raw.trim();
  // Providers occasionally wrap JSON in a ```json fence even in JSON-mode; strip it defensively.
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    // Last resort: grab the outermost {...} block in case of leading/trailing prose.
    const match = unfenced.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { /* fall through */ }
    }
    return null;
  }
}

export const parseJsonResponse = tryParseJSON;

export async function generateJSON<T = unknown>(
  systemPrompt: string,
  userContent: string,
  config: LLMConfig,
  spec: JSONModeSpec,
): Promise<JSONModeResult<T>> {
  const start = performance.now();
  const provider = inferProvider(config);

  // Checked before assertEndpoint: 'local' legitimately has no endpoint (it's the on-device
  // model, routed through llm/local.ts, not through fetch at all), so the generic
  // "endpoint not configured" error would be misleading here — give the specific reason instead.
  if (provider === 'local') {
    if (isInstructLocalModel(config.model)) {
      return await generateLocalJSON<T>(systemPrompt, userContent, config, spec);
    }
    return {
      data: null, raw: '', parseError: false, declinedTool: false,
      error: `Structured JSON output isn't supported for the on-device T5 model — pick Smart Local AI (360M), Pro Local AI (500M), Ollama, or a cloud provider.`,
      durationMs: performance.now() - start,
    };
  }

  try {
    assertEndpoint(config.endpoint);
    switch (provider) {
      case 'openai':
      case 'lmstudio':
      case 'opencode-zen':
      case 'pollinations-free':
      case 'openrouter-free':
      case 'groq-free':
        return await openAIGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
      case 'gemini':     return await geminiGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
      case 'anthropic':  return await anthropicGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
      case 'ollama':
      case 'uncensored-offline':
        if (config.endpoint.includes('1234') || config.endpoint.replace(/\/+$/, '').endsWith('/v1') || config.endpoint.includes('/chat/completions')) {
          return await openAIGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
        }
        return await ollamaGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
      default:
        return await openAIGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
    }
  } catch (err) {
    return {
      data: null, raw: '', parseError: false, declinedTool: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: performance.now() - start,
    };
  }
}

async function openAIGenerateJSON<T>(
  systemPrompt: string, userContent: string, config: LLMConfig, spec: JSONModeSpec, start: number,
): Promise<JSONModeResult<T>> {
  const p = inferProvider(config);
  const preset = PROVIDER_PRESETS[p];
  if (preset?.needsKey && !config.apiKey?.trim()) {
    throw new Error(`Please enter an API key for ${preset.label}. Click 'Get key' to generate your free key.`);
  }

  let modelName = config.model;
  const isLocalServer = config.endpoint.includes('localhost') || config.endpoint.includes('127.0.0.1');

  if (isLocalServer && (!modelName || modelName === 'local-model' || modelName === 'llama3.2')) {
    const detected = await fetchAvailableModels(config);
    if (detected.length > 0) {
      modelName = detected[0];
    }
  }

  const ep = config.endpoint.replace(/\/+$/, '');
  const url = ep.endsWith('/chat/completions') ? ep : ep.includes('/v1') ? buildUrl(ep, '/chat/completions') : buildUrl(ep, '/v1/chat/completions');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  // OpenAI's json_object mode requires the word "JSON" to appear in the prompt — guaranteed here
  // regardless of what the caller's systemPrompt says.
  const jsonInstruction = `${systemPrompt}\n\nRespond ONLY with a single valid JSON object matching this shape: ${JSON.stringify(spec.schema)}`;

  const postJSON = async (m: string, withFormat: boolean) => {
    const body: Record<string, any> = {
      model: m,
      messages: [{ role: 'system', content: jsonInstruction }, { role: 'user', content: userContent }],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    };
    if (withFormat) {
      body.response_format = { type: 'json_object' };
    }
    return await neutralFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  };

  let response: Response;
  try {
    response = await postJSON(modelName, true);
    // If 400 (e.g. LM Studio GGUF template rejects response_format: json_object), retry without response_format
    if (response.status === 400) {
      const errText = await response.clone().text().catch(() => '');
      if (errText.includes('response_format') || isLocalServer) {
        response = await postJSON(modelName, false);
      }
    }
    // If local server returned 404 or 400 (model not found), retry with fetched model
    if (!response.ok && isLocalServer && (response.status === 400 || response.status === 404)) {
      const detected = await fetchAvailableModels(config);
      if (detected.length > 0 && detected[0] !== modelName) {
        modelName = detected[0];
        response = await postJSON(modelName, false);
      }
    }
  } catch (err) {
    throw new Error(`Cannot reach API at "${url}". (${err instanceof Error ? err.message : err})`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`);
  }

  const data = await response.json();
  const msg = data.choices?.[0]?.message;
  let raw: string = (msg?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!raw && msg?.reasoning_content) {
    const jsonMatch = msg.reasoning_content.match(/\{[\s\S]*\}/);
    if (jsonMatch) raw = jsonMatch[0];
  }
  const parsed = tryParseJSON<T>(raw);
  return { data: parsed, raw, parseError: parsed === null, declinedTool: false, durationMs: performance.now() - start };
}

async function geminiGenerateJSON<T>(
  systemPrompt: string, userContent: string, config: LLMConfig, spec: JSONModeSpec, start: number,
): Promise<JSONModeResult<T>> {
  if (!config.apiKey) throw new Error('Gemini requires an API key. Get one at aistudio.google.com → Get API key.');
  const base = config.endpoint.replace(/\/+$/, '');
  const url = `${base}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const jsonInstruction = `${systemPrompt}\n\nRespond ONLY with a single valid JSON object matching this shape: ${JSON.stringify(spec.schema)}`;

  const response = await neutralFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: jsonInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      // responseMimeType alone (without responseSchema) reliably constrains output to valid JSON
      // syntax without depending on Gemini's schema-format quirks across API versions.
      generationConfig: { responseMimeType: 'application/json', temperature: config.temperature, maxOutputTokens: config.maxTokens },
    }),
  }).catch(err => { throw new Error(`Cannot reach Gemini. (${err instanceof Error ? err.message : err})`); });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const raw: string = parts.map((p: { text?: string }) => p.text ?? '').join('');
  const parsed = tryParseJSON<T>(raw);
  return { data: parsed, raw, parseError: parsed === null, declinedTool: false, durationMs: performance.now() - start };
}

async function anthropicGenerateJSON<T>(
  systemPrompt: string, userContent: string, config: LLMConfig, spec: JSONModeSpec, start: number,
): Promise<JSONModeResult<T>> {
  if (!config.apiKey) throw new Error('Anthropic requires an API key. Get one at console.anthropic.com → Settings → API keys.');
  const url = buildUrl(config.endpoint, '/v1/messages');

  const response = await neutralFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      // Forcing a single tool call is the reliable structured-output mechanism for Claude —
      // Anthropic validates the tool_use input against input_schema before returning it,
      // rather than us hoping a "respond in JSON" instruction is followed.
      tools: [{ name: spec.name, description: spec.description, input_schema: spec.schema }],
      tool_choice: { type: 'tool', name: spec.name },
    }),
  }).catch(err => { throw new Error(`Cannot reach Anthropic. If this is a CORS error, the browser blocked the direct call. (${err instanceof Error ? err.message : err})`); });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Anthropic ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`);
  }

  const data = await response.json();
  const blocks: Array<{ type: string; input?: unknown; text?: string }> = Array.isArray(data.content) ? data.content : [];
  const toolBlock = blocks.find(b => b.type === 'tool_use');

  if (toolBlock) {
    return { data: (toolBlock.input as T) ?? null, raw: JSON.stringify(toolBlock.input ?? {}), parseError: false, declinedTool: false, durationMs: performance.now() - start };
  }

  // No tool_use block means Claude responded with prose instead of calling the forced tool —
  // the clearest available refusal/decline signal for this provider.
  const textBlock = blocks.find(b => b.type === 'text');
  return { data: null, raw: textBlock?.text ?? '', parseError: false, declinedTool: true, durationMs: performance.now() - start };
}

async function ollamaGenerateJSON<T>(
  systemPrompt: string, userContent: string, config: LLMConfig, spec: JSONModeSpec, start: number,
): Promise<JSONModeResult<T>> {
  if (config.endpoint.includes('1234') || config.endpoint.replace(/\/+$/, '').endsWith('/v1') || config.endpoint.includes('/chat/completions')) {
    return await openAIGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
  }

  const url = buildUrl(config.endpoint, '/api/generate');
  const prompt = `${systemPrompt}\n\nRespond ONLY with a single valid JSON object matching this shape: ${JSON.stringify(spec.schema)}\n\n${userContent}`;

  let response: Response;
  try {
    response = await neutralFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt,
        // Grammar-constrained JSON decoding — the strongest reliability guarantee of the four
        // providers, and it works fully offline.
        format: 'json',
        stream: false,
        options: { temperature: config.temperature, num_predict: config.maxTokens },
      }),
    });
  } catch (err) {
    try {
      return await openAIGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
    } catch {
      throw new Error(`Cannot reach Ollama at "${url}". Is Ollama running? (${err instanceof Error ? err.message : err})`);
    }
  }

  if (!response.ok) {
    if (response.status === 404 || response.status === 400) {
      try {
        return await openAIGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
      } catch {
        /* fall through to error */
      }
    }
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }

  const data = await response.json();
  const raw: string = data.response ?? '';
  const parsed = tryParseJSON<T>(raw);
  return { data: parsed, raw, parseError: parsed === null, declinedTool: false, durationMs: performance.now() - start };
}

/** Generic shape-conformance check — callers use this to decide "parsed JSON, but not what we asked for" (treat as inconclusive), not a crash. */
export function hasRequiredKeys<T extends Record<string, unknown>>(data: unknown, keys: (keyof T)[]): data is T {
  if (!data || typeof data !== 'object') return false;
  return keys.every(k => Object.prototype.hasOwnProperty.call(data, k));
}

export async function rewriteWithLLM(
  text: string,
  instruction: string,
  config: LLMConfig,
): Promise<LLMResponse> {
  assertEndpoint(config.endpoint);
  const start = performance.now();
  const provider = inferProvider(config);
  const ep = (config.endpoint || '').toLowerCase();
  const isLikelyOpenAI =
    ep.includes('1234') ||
    ep.endsWith('/v1') ||
    ep.includes('/chat/completions') ||
    ep.includes('groq') ||
    ep.includes('pollinations') ||
    ep.includes('openrouter') ||
    ep.includes('opencode');

  if (provider === 'ollama' || provider === 'uncensored-offline') {
    if (isLikelyOpenAI) {
      return openAIGenerate(text, instruction, config, start);
    }
    return ollamaGenerate(text, instruction, config, start);
  }

  switch (provider) {
    case 'anthropic': return anthropicGenerate(text, instruction, config, start);
    case 'gemini':    return geminiGenerate(text, instruction, config, start);
    case 'openai':
    case 'lmstudio':
    case 'opencode-zen':
    case 'pollinations-free':
    case 'openrouter-free':
    case 'groq-free':
    default:          return openAIGenerate(text, instruction, config, start);
  }
}

async function ollamaGenerate(
  text: string, instruction: string, config: LLMConfig, start: number,
): Promise<LLMResponse> {
  if (config.endpoint.includes('1234') || config.endpoint.replace(/\/+$/, '').endsWith('/v1') || config.endpoint.includes('/chat/completions')) {
    return openAIGenerate(text, instruction, config, start);
  }

  const url = buildUrl(config.endpoint, '/api/generate');
  const prompt = `${instruction}\n\nText:\n${text}\n\nRewritten text:`;

  let response: Response;
  try {
    response = await neutralFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false,
        options: { temperature: config.temperature, num_predict: config.maxTokens },
      }),
    });
  } catch (err) {
    try {
      return await openAIGenerate(text, instruction, config, start);
    } catch {
      throw new Error(
        `Cannot reach Ollama at "${url}". Is Ollama running? (${err instanceof Error ? err.message : err})`
      );
    }
  }

  if (!response.ok) {
    if (response.status === 404 || response.status === 400) {
      try {
        return await openAIGenerate(text, instruction, config, start);
      } catch {
        /* fall through to error */
      }
    }
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }

  const data = await response.json();
  return { text: data.response?.trim() ?? '', tokensUsed: data.eval_count ?? 0, durationMs: performance.now() - start };
}

async function openAIGenerate(
  text: string, instruction: string, config: LLMConfig, start: number,
): Promise<LLMResponse> {
  const p = inferProvider(config);
  const preset = PROVIDER_PRESETS[p];
  if (preset?.needsKey && !config.apiKey?.trim()) {
    throw new Error(`Please enter an API key for ${preset.label}. Click 'Get key' to generate your free key.`);
  }

  let modelName = config.model;
  const isLocalServer = config.endpoint.includes('localhost') || config.endpoint.includes('127.0.0.1');

  if (isLocalServer && (!modelName || modelName === 'local-model' || modelName === 'llama3.2')) {
    const detected = await fetchAvailableModels(config);
    if (detected.length > 0) {
      modelName = detected[0];
    }
  }

  const ep = config.endpoint.replace(/\/+$/, '');
  const url = ep.endsWith('/chat/completions')
    ? ep
    : ep.includes('/v1')
      ? buildUrl(ep, '/chat/completions')
      : buildUrl(ep, '/v1/chat/completions');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const estimatedTokens = Math.ceil(text.length / 3);
  const tokenBudget = Math.max(config.maxTokens || 2048, estimatedTokens + 2048);

  const doFetch = async (m: string) => {
    return await neutralFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: m,
        messages: [
          { role: 'system', content: instruction },
          { role: 'user', content: text },
        ],
        max_tokens: isLocalServer ? tokenBudget : config.maxTokens,
        temperature: config.temperature,
      }),
    });
  };

  let response: Response;
  try {
    response = await doFetch(modelName);
    if (!response.ok && isLocalServer && (response.status === 400 || response.status === 404)) {
      const detected = await fetchAvailableModels(config);
      if (detected.length > 0 && detected[0] !== modelName) {
        modelName = detected[0];
        response = await doFetch(modelName);
      }
    }
  } catch (err) {
    throw new Error(
      `Cannot reach API at "${url}". Check the endpoint URL and that the server is running. (${err instanceof Error ? err.message : err})`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`);
  }

  const data = await response.json();
  const msg = data.choices?.[0]?.message;
  let outText = msg?.content?.trim() ?? '';

  // Sanitize any inline <think> tags if model emitted them in content
  outText = outText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // If content is empty, handle reasoning models cleanly without leaking raw thought traces
  if (!outText) {
    const finishReason = data.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      throw new Error(
        `The reasoning model (${modelName}) ran out of tokens during its thinking process before generating the final text. Please try selecting a shorter text segment or increasing Max Tokens.`
      );
    }
    const rc = msg?.reasoning_content?.trim() ?? '';
    // Look for explicit rewritten answer inside scratchpad if present
    const answerMatch = rc.match(/(?:(?:final\s+)?rewrite|output|rewritten\s+text):\s*["']?([\s\S]+?)(?:["']?\s*$)/i);
    if (answerMatch && answerMatch[1].trim().length > 20) {
      outText = answerMatch[1].trim();
    } else {
      throw new Error(
        `The reasoning model (${modelName}) completed thinking but did not produce a final response. Please re-run or choose a general instruction model.`
      );
    }
  }

  return {
    text: outText,
    tokensUsed: data.usage?.total_tokens ?? 0,
    durationMs: performance.now() - start,
  };
}

async function anthropicGenerate(
  text: string, instruction: string, config: LLMConfig, start: number,
): Promise<LLMResponse> {
  if (!config.apiKey) throw new Error('Anthropic requires an API key. Get one at console.anthropic.com → Settings → API keys.');
  const url = buildUrl(config.endpoint, '/v1/messages');

  let response: Response;
  try {
    response = await neutralFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        // Required for direct browser calls (no server proxy).
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: instruction,
        messages: [{ role: 'user', content: text }],
      }),
    });
  } catch (err) {
    throw new Error(
      `Cannot reach Anthropic at "${url}". If this is a CORS error, the browser blocked the direct call. (${err instanceof Error ? err.message : err})`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Anthropic ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`);
  }

  const data = await response.json();
  const out = Array.isArray(data.content)
    ? data.content.map((b: { text?: string }) => b.text ?? '').join('').trim()
    : '';
  const usage = data.usage ? (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0) : 0;
  return { text: out, tokensUsed: usage, durationMs: performance.now() - start };
}

async function geminiGenerate(
  text: string, instruction: string, config: LLMConfig, start: number,
): Promise<LLMResponse> {
  if (!config.apiKey) throw new Error('Gemini requires an API key. Get one at aistudio.google.com → Get API key.');
  const base = config.endpoint.replace(/\/+$/, '');
  const url = `${base}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  let response: Response;
  try {
    response = await neutralFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { temperature: config.temperature, maxOutputTokens: config.maxTokens },
      }),
    });
  } catch (err) {
    throw new Error(
      `Cannot reach Gemini at the generativelanguage API. (${err instanceof Error ? err.message : err})`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const out = parts.map((p: { text?: string }) => p.text ?? '').join('').trim();
  const usage = data.usageMetadata?.totalTokenCount ?? 0;
  return { text: out, tokensUsed: usage, durationMs: performance.now() - start };
}

export async function testConnection(config: LLMConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await rewriteWithLLM('ping', 'Reply with the word "ok" only.', config);
    return { ok: result !== null && typeof result.durationMs === 'number' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const REWRITE_PROMPTS = {
  humanize: `Rewrite the following text to sound more natural and human-written.
Vary sentence length and structure. Use more colloquial language where appropriate.
Reduce formality. Break up long sentences. Add contractions.
Do NOT change the meaning or add new information.
Output ONLY the rewritten text, nothing else.`,

  deparaphrase: `Rewrite the following text using different word choices and sentence structures
while preserving the exact same meaning. Change transitional phrases. Vary paragraph openings.
Replace formal vocabulary with simpler alternatives where possible.
Output ONLY the rewritten text, nothing else.`,

  neutralize: `Rewrite the following text to remove statistical patterns that AI detectors look for.
Vary sentence length significantly. Mix short punchy sentences with longer ones.
Use contractions naturally. Add occasional informal expressions.
Break formulaic paragraph structures. Avoid hedging phrases like "it's important to note".
Preserve all factual content and meaning exactly.
Output ONLY the rewritten text, nothing else.`,
};

/**
 * Structure-only prompt: organize the text with Markdown formatting WITHOUT
 * changing the wording, so it never re-introduces the AI footprint just cleaned.
 */
export const ORGANIZE_PROMPT = `Reformat the following text using Markdown to make it well-organized and readable.
You MAY add: short section headings (##), paragraph breaks, and bullet or numbered lists where the content naturally enumerates.
You MUST NOT change, add, or remove any words — keep the exact original wording. Only add structure and Markdown formatting.
Output ONLY the Markdown, nothing else.`;

export const callLLMForJson = generateJSON;

