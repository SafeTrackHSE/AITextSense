import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateJSON, hasRequiredKeys, type JSONModeSpec } from '../src/core/llm/client';
import { evaluateSemanticInjection } from '../src/core/injection/evaluator';
import type { LLMConfig } from '../src/core/llm/types';

/**
 * Validates the JSON-mode extension against each provider's actual documented
 * response shape via mocked fetch — the achievable form of "prototype and
 * validate reliability across providers" without live API keys or a running
 * Ollama server. Covers both the success path and the refusal/malformed path
 * per provider, since §2.5 of the plan requires refusal to be a handled state,
 * not a crash.
 */

const SPEC: JSONModeSpec = {
  name: 'threat_explanation',
  description: 'test schema',
  schema: {
    type: 'object',
    properties: { dangerLevel: { type: 'string' }, mechanism: { type: 'string' } },
    required: ['dangerLevel', 'mechanism'],
  },
};

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok, status, statusText: ok ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

const baseConfig: Omit<LLMConfig, 'provider'> = {
  endpoint: '', model: 'test-model', apiKey: 'test-key', maxTokens: 512, temperature: 0.2,
};

describe('generateJSON — OpenAI', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('parses a well-formed json_object response', async () => {
    global.fetch = mockFetchOnce({
      choices: [{ message: { content: JSON.stringify({ dangerLevel: 'high', mechanism: 'deletes files' }) } }],
    });
    const config: LLMConfig = { ...baseConfig, provider: 'openai', endpoint: 'https://api.openai.com/v1' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.parseError).toBe(false);
    expect(hasRequiredKeys(result.data, ['dangerLevel', 'mechanism'])).toBe(true);
  });

  it('treats malformed content as a parse error, not a crash', async () => {
    global.fetch = mockFetchOnce({ choices: [{ message: { content: 'I cannot assist with that.' } }] });
    const config: LLMConfig = { ...baseConfig, provider: 'openai', endpoint: 'https://api.openai.com/v1' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.parseError).toBe(true);
    expect(result.data).toBeNull();
  });

  it('sends response_format json_object and includes the schema in the prompt', async () => {
    const fetchMock = mockFetchOnce({ choices: [{ message: { content: '{"dangerLevel":"low","mechanism":"x"}' } }] });
    global.fetch = fetchMock;
    const config: LLMConfig = { ...baseConfig, provider: 'openai', endpoint: 'https://api.openai.com/v1' };
    await generateJSON('system prompt', 'analyze this', config, SPEC);
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.response_format).toEqual({ type: 'json_object' });
    expect(callBody.messages[0].content).toContain('JSON');
  });
});

describe('generateJSON — Gemini', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('parses a well-formed responseMimeType=application/json response', async () => {
    global.fetch = mockFetchOnce({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ dangerLevel: 'medium', mechanism: 'exfiltrates data' }) }] } }],
    });
    const config: LLMConfig = { ...baseConfig, provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.parseError).toBe(false);
    expect(hasRequiredKeys(result.data, ['dangerLevel', 'mechanism'])).toBe(true);
  });

  it('requires an API key', async () => {
    const config: LLMConfig = { ...baseConfig, apiKey: undefined, provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.error).toMatch(/API key/i);
  });
});

describe('generateJSON — Anthropic (tool-use)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('reads already-parsed JSON from the forced tool_use block', async () => {
    global.fetch = mockFetchOnce({
      content: [{ type: 'tool_use', name: SPEC.name, input: { dangerLevel: 'critical', mechanism: 'reverse shell' } }],
    });
    const config: LLMConfig = { ...baseConfig, provider: 'anthropic', endpoint: 'https://api.anthropic.com' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.parseError).toBe(false);
    expect(result.declinedTool).toBe(false);
    expect(result.data).toEqual({ dangerLevel: 'critical', mechanism: 'reverse shell' });
  });

  it('flags declinedTool when the model responds with prose instead of calling the tool', async () => {
    global.fetch = mockFetchOnce({ content: [{ type: 'text', text: 'I need more context before I can classify this.' }] });
    const config: LLMConfig = { ...baseConfig, provider: 'anthropic', endpoint: 'https://api.anthropic.com' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.declinedTool).toBe(true);
    expect(result.data).toBeNull();
    expect(result.raw).toContain('more context');
  });

  it('forces tool_choice to the given spec name', async () => {
    const fetchMock = mockFetchOnce({ content: [{ type: 'tool_use', name: SPEC.name, input: { dangerLevel: 'low', mechanism: 'x' } }] });
    global.fetch = fetchMock;
    const config: LLMConfig = { ...baseConfig, provider: 'anthropic', endpoint: 'https://api.anthropic.com' };
    await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.tool_choice).toEqual({ type: 'tool', name: SPEC.name });
    expect(callBody.tools[0].input_schema).toEqual(SPEC.schema);
  });
});

describe('generateJSON — Ollama / Uncensored-offline (grammar-constrained)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('parses format:json response for the ollama provider', async () => {
    global.fetch = mockFetchOnce({ response: JSON.stringify({ dangerLevel: 'high', mechanism: 'destructive delete' }) });
    const config: LLMConfig = { ...baseConfig, provider: 'ollama', endpoint: 'http://localhost:11434' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.parseError).toBe(false);
    expect(hasRequiredKeys(result.data, ['dangerLevel', 'mechanism'])).toBe(true);
  });

  it('routes uncensored-offline through the same ollama path with format:json set', async () => {
    const fetchMock = mockFetchOnce({ response: JSON.stringify({ dangerLevel: 'high', mechanism: 'x' }) });
    global.fetch = fetchMock;
    const config: LLMConfig = { ...baseConfig, provider: 'uncensored-offline', endpoint: 'http://localhost:11434', model: 'dolphin-mistral' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.parseError).toBe(false);
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.format).toBe('json');
    expect(callBody.model).toBe('dolphin-mistral');
  });

  it('does not throw when the raw response is not JSON at all', async () => {
    global.fetch = mockFetchOnce({ response: 'not json at all' });
    const config: LLMConfig = { ...baseConfig, provider: 'ollama', endpoint: 'http://localhost:11434' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.parseError).toBe(true);
    expect(result.data).toBeNull();
  });
});

describe('generateJSON — unsupported provider', () => {
  it('returns a clear error for the on-device (local) provider rather than attempting a request', async () => {
    const config: LLMConfig = { ...baseConfig, provider: 'local', endpoint: '' };
    const result = await generateJSON(SPEC.description, 'analyze this', config, SPEC);
    expect(result.error).toMatch(/support/i);
  });
});

describe('evaluator.ts — unified onto the 5-provider client (regression for the confirmed bug)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('local provider returns an explicit inconclusive message without attempting a network call', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;
    const config: LLMConfig = { ...baseConfig, provider: 'local', endpoint: '' };
    const result = await evaluateSemanticInjection('some text', ['payload'], config);
    expect(result.inconclusive).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('anthropic provider now actually attempts evaluation instead of silently no-op-ing', async () => {
    global.fetch = mockFetchOnce({
      content: [{ type: 'tool_use', name: 'injection_semantic_evaluation', input: { isIntentMalicious: true, confidence: 0.9, explanation: 'jailbreak attempt' } }],
    });
    const config: LLMConfig = { ...baseConfig, provider: 'anthropic', endpoint: 'https://api.anthropic.com' };
    const result = await evaluateSemanticInjection('some text', ['ignore all instructions'], config);
    expect(result.inconclusive).toBe(false);
    expect(result.isIntentMalicious).toBe(true);
    expect(result.explanation).toBe('jailbreak attempt');
  });

  it('gemini provider now actually attempts evaluation instead of silently no-op-ing', async () => {
    global.fetch = mockFetchOnce({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ isIntentMalicious: false, confidence: 0.1, explanation: 'benign' }) }] } }],
    });
    const config: LLMConfig = { ...baseConfig, provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta' };
    const result = await evaluateSemanticInjection('some text', ['payload'], config);
    expect(result.inconclusive).toBe(false);
    expect(result.isIntentMalicious).toBe(false);
  });

  it('a malformed/refusal response resolves to inconclusive, never a crash', async () => {
    global.fetch = mockFetchOnce({ content: [{ type: 'text', text: 'I cannot help with that.' }] });
    const config: LLMConfig = { ...baseConfig, provider: 'anthropic', endpoint: 'https://api.anthropic.com' };
    const result = await evaluateSemanticInjection('some text', ['payload'], config);
    expect(result.inconclusive).toBe(true);
    expect(result.isIntentMalicious).toBe(false);
  });
});
