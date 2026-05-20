// ============================================================
// AI API Relay — Provider Configuration & Routing
// ============================================================

import type { ProviderConfig, ProviderName } from './types';

/** All supported providers and their configurations */
export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelPrefixes: ['gpt-', 'o1-', 'o3-', 'o4-', 'chatgpt-', 'dall-e-'],
    headerFormat: 'openai',
    envKeyField: 'OPENAI_KEYS',
    envBaseUrlField: 'OPENAI_BASE_URL',
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    modelPrefixes: ['claude-'],
    headerFormat: 'anthropic',
    envKeyField: 'CLAUDE_KEYS',
    envBaseUrlField: 'CLAUDE_BASE_URL',
  },
  deepseek: {
    name: 'deepseek',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    modelPrefixes: ['deepseek-'],
    headerFormat: 'openai',
    envKeyField: 'DEEPSEEK_KEYS',
    envBaseUrlField: 'DEEPSEEK_BASE_URL',
  },
  xiaomi: {
    name: 'xiaomi',
    displayName: 'Xiaomi (MiMo)',
    baseUrl: 'https://api.xiaomi.com/v1',
    modelPrefixes: ['mimo-'],
    headerFormat: 'openai',
    envKeyField: 'XIAOMI_KEYS',
    envBaseUrlField: 'XIAOMI_BASE_URL',
  },
};

/**
 * Model alias mapping — lets users request common names that get
 * transparently rewritten to the actual upstream model ID.
 *
 * Add entries here when you want to support shortcuts like "gpt-4"
 * routing to "gpt-4-turbo", or custom aliases for your team.
 */
const MODEL_ALIASES: Record<string, string> = {
  'gpt-4': 'gpt-4-turbo',
  'gpt-3.5': 'gpt-3.5-turbo',
  'claude-3': 'claude-3-5-sonnet-20241022',
  'claude-3-opus': 'claude-3-opus-20240229',
  'claude-3-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-3-haiku': 'claude-3-5-haiku-20241022',
};

/**
 * Resolve a model alias to its actual model name.
 * Returns the original name if no alias exists.
 */
export function resolveModelAlias(model: string): string {
  const lower = model.toLowerCase();
  return MODEL_ALIASES[lower] || model;
}

/**
 * Resolve which provider a model name belongs to.
 * Automatically resolves aliases before matching.
 * Returns null if no provider matches.
 */
export function resolveProvider(model: string): ProviderConfig | null {
  const resolved = resolveModelAlias(model);
  const lowerModel = resolved.toLowerCase();
  for (const provider of Object.values(PROVIDERS)) {
    for (const prefix of provider.modelPrefixes) {
      if (lowerModel.startsWith(prefix)) {
        return provider;
      }
    }
  }
  return null;
}

/**
 * Get the upstream URL for a provider's chat completions endpoint.
 */
export function getUpstreamUrl(provider: ProviderConfig): string {
  const customBase = provider.envBaseUrlField
    ? process.env[provider.envBaseUrlField]
    : undefined;
  const base = customBase || provider.baseUrl;

  if (provider.headerFormat === 'anthropic') {
    return `${base}/messages`;
  }
  return `${base}/chat/completions`;
}
