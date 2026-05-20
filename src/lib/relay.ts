// ============================================================
// AI API Relay — Core Relay Logic
// ============================================================

import type { ProviderConfig, ChatCompletionRequest, ApiKey } from './types';
import { resolveProvider, getUpstreamUrl, resolveModelAlias } from './providers';
import { selectKey, markCooldown } from './key-manager';
import { recordUsage } from './usage';

/** Result of a relay operation */
export interface RelayResult {
  response: Response;
  provider: ProviderConfig;
  apiKey: ApiKey;
}

/**
 * Validate the relay API key from the Authorization header.
 */
export function validateAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const validKeys = (process.env.RELAY_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  return validKeys.includes(token);
}

/**
 * Transform OpenAI-format request to Anthropic format.
 */
function transformToAnthropic(body: ChatCompletionRequest): Record<string, unknown> {
  const { messages, model, max_tokens, temperature, top_p, stream, stop } = body;

  // Extract system message
  const systemMsg = messages.find((m) => m.role === 'system');
  const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

  const anthropicBody: Record<string, unknown> = {
    model,
    max_tokens: max_tokens || 4096,
    messages: nonSystemMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || '',
    })),
  };

  if (systemMsg?.content) {
    anthropicBody.system = systemMsg.content;
  }
  if (temperature !== undefined) anthropicBody.temperature = temperature;
  if (top_p !== undefined) anthropicBody.top_p = top_p;
  if (stream !== undefined) anthropicBody.stream = stream;
  if (stop) anthropicBody.stop_sequences = Array.isArray(stop) ? stop : [stop];

  return anthropicBody;
}

/**
 * Build upstream request headers based on provider format.
 */
function buildHeaders(
  provider: ProviderConfig,
  apiKey: ApiKey,
  isStream: boolean
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider.headerFormat === 'anthropic') {
    headers['x-api-key'] = apiKey.key;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = `Bearer ${apiKey.key}`;
  }

  if (isStream) {
    headers['Accept'] = 'text/event-stream';
  }

  return headers;
}

/**
 * Core relay function — forwards a chat completion request to the upstream provider.
 * Supports both streaming and non-streaming.
 */
export async function relayRequest(
  body: ChatCompletionRequest
): Promise<RelayResult> {
  const provider = resolveProvider(body.model);
  if (!provider) {
    throw new RelayError(
      `Unknown model: ${body.model}. Supported prefixes: gpt-, claude-, deepseek-, mimo-`,
      'invalid_request_error',
      400
    );
  }

  // Resolve model alias (e.g. gpt-4 → gpt-4-turbo)
  const resolvedModel = resolveModelAlias(body.model);

  // Select an API key
  const apiKey = selectKey(provider);
  if (!apiKey) {
    throw new RelayError(
      `No API keys configured for provider: ${provider.displayName}`,
      'server_error',
      503
    );
  }

  const url = getUpstreamUrl(provider);
  const headers = buildHeaders(provider, apiKey, !!body.stream);
  const isAnthropic = provider.headerFormat === 'anthropic';

  // Transform request body if needed (use resolved model name)
  const bodyWithResolvedModel = { ...body, model: resolvedModel };
  const requestBody = isAnthropic ? transformToAnthropic(bodyWithResolvedModel) : bodyWithResolvedModel;

  // Make the upstream request
  const maxRetries = Math.min(
    (process.env.RELAY_API_KEY || '').split(',').length,
    3
  );
  let lastError: Error | null = null;
  let currentKey = apiKey;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const upstreamResponse = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(provider, currentKey, !!body.stream),
        body: JSON.stringify(requestBody),
      });

      // 429 or 5xx → try next key
      if (upstreamResponse.status === 429 || upstreamResponse.status >= 500) {
        markCooldown(currentKey);
        const nextKey = selectKey(provider);
        if (nextKey && nextKey.hash !== currentKey.hash) {
          currentKey = nextKey;
          continue; // Retry with next key
        }
        // No more keys — return the error response
        return { response: upstreamResponse, provider, apiKey: currentKey };
      }

      // Success or client error (4xx except 429) — return as-is
      // Track usage asynchronously (non-streaming only, for streaming we'd need to parse SSE)
      if (!body.stream && upstreamResponse.ok) {
        trackUsageAsync(currentKey, upstreamResponse.clone());
      }

      return { response: upstreamResponse, provider, apiKey: currentKey };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      markCooldown(currentKey);
      const nextKey = selectKey(provider);
      if (nextKey && nextKey.hash !== currentKey.hash) {
        currentKey = nextKey;
        continue;
      }
    }
  }

  throw new RelayError(
    `All retry attempts failed for ${provider.displayName}: ${lastError?.message}`,
    'server_error',
    502
  );
}

/**
 * Track usage from a non-streaming response (async, fire-and-forget).
 */
function trackUsageAsync(apiKey: ApiKey, response: Response): void {
  response
    .clone()
    .json()
    .then((data) => {
      const usage = data?.usage;
      if (usage) {
        recordUsage(apiKey.hash, {
          prompt: usage.prompt_tokens || 0,
          completion: usage.completion_tokens || 0,
        });
      }
    })
    .catch(() => {}); // Silent fail
}

/**
 * Custom error class for relay errors (returns OpenAI-compatible error format).
 */
export class RelayError extends Error {
  constructor(
    message: string,
    public type: string = 'server_error',
    public status: number = 500
  ) {
    super(message);
    this.name = 'RelayError';
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        error: {
          message: this.message,
          type: this.type,
          code: this.status,
        },
      }),
      {
        status: this.status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
