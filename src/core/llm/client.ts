import type { LLMConfig, LLMResponse, LLMProvider } from './types';
import { isInstructLocalModel } from './types';
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
  const ep = config.endpoint.toLowerCase();
  if (ep.includes('anthropic')) return 'anthropic';
  if (ep.includes('generativelanguage') || ep.includes('gemini')) return 'gemini';
  if (ep.includes('11434') || ep.includes('ollama') || ep.includes('/api/generate') || ep.includes('/api/chat')) return 'ollama';
  return 'openai';
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
      case 'openai':    return await openAIGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
      case 'gemini':     return await geminiGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
      case 'anthropic':  return await anthropicGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
      case 'ollama':
      case 'uncensored-offline':
        return await ollamaGenerateJSON<T>(systemPrompt, userContent, config, spec, start);
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
  const ep = config.endpoint.replace(/\/+$/, '');
  const url = ep.endsWith('/chat/completions') ? ep : ep.includes('/v1') ? buildUrl(ep, '/chat/completions') : buildUrl(ep, '/v1/chat/completions');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  // OpenAI's json_object mode requires the word "JSON" to appear in the prompt — guaranteed here
  // regardless of what the caller's systemPrompt says.
  const jsonInstruction = `${systemPrompt}\n\nRespond ONLY with a single valid JSON object matching this shape: ${JSON.stringify(spec.schema)}`;

  const response = await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'system', content: jsonInstruction }, { role: 'user', content: userContent }],
      response_format: { type: 'json_object' },
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  }).catch(err => { throw new Error(`Cannot reach API at "${url}". (${err instanceof Error ? err.message : err})`); });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`);
  }

  const data = await response.json();
  const raw: string = data.choices?.[0]?.message?.content ?? '';
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

  const response = await fetch(url, {
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

  const response = await fetch(url, {
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
  const url = buildUrl(config.endpoint, '/api/generate');
  const prompt = `${systemPrompt}\n\nRespond ONLY with a single valid JSON object matching this shape: ${JSON.stringify(spec.schema)}\n\n${userContent}`;

  const response = await fetch(url, {
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
  }).catch(err => { throw new Error(`Cannot reach Ollama at "${url}". Is Ollama running? (${err instanceof Error ? err.message : err})`); });

  if (!response.ok) {
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

  switch (inferProvider(config)) {
    case 'ollama':
    case 'uncensored-offline':
      return ollamaGenerate(text, instruction, config, start);
    case 'anthropic': return anthropicGenerate(text, instruction, config, start);
    case 'gemini':    return geminiGenerate(text, instruction, config, start);
    case 'openai':
    default:          return openAIGenerate(text, instruction, config, start);
  }
}

async function ollamaGenerate(
  text: string, instruction: string, config: LLMConfig, start: number,
): Promise<LLMResponse> {
  const url = buildUrl(config.endpoint, '/api/generate');
  const prompt = `${instruction}\n\nText:\n${text}\n\nRewritten text:`;

  let response: Response;
  try {
    response = await fetch(url, {
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
    throw new Error(
      `Cannot reach Ollama at "${url}". Is Ollama running? (${err instanceof Error ? err.message : err})`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }

  const data = await response.json();
  return { text: data.response?.trim() ?? '', tokensUsed: data.eval_count ?? 0, durationMs: performance.now() - start };
}

async function openAIGenerate(
  text: string, instruction: string, config: LLMConfig, start: number,
): Promise<LLMResponse> {
  const ep = config.endpoint.replace(/\/+$/, '');
  const url = ep.endsWith('/chat/completions')
    ? ep
    : ep.includes('/v1')
      ? buildUrl(ep, '/chat/completions')
      : buildUrl(ep, '/v1/chat/completions');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: instruction },
          { role: 'user', content: text },
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    });
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
  return {
    text: data.choices?.[0]?.message?.content?.trim() ?? '',
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
    response = await fetch(url, {
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
    response = await fetch(url, {
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
    return { ok: result.text.length > 0 };
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

