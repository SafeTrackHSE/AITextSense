import type { LLMConfig, LLMResponse, LLMProvider } from './types';

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

export async function rewriteWithLLM(
  text: string,
  instruction: string,
  config: LLMConfig,
): Promise<LLMResponse> {
  assertEndpoint(config.endpoint);
  const start = performance.now();

  switch (inferProvider(config)) {
    case 'ollama':    return ollamaGenerate(text, instruction, config, start);
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
