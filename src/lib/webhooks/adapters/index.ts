// ============================================================
// AI API Relay — Webhook Adapter Registry
// ============================================================
// Maps platform names to adapter instances and provides a
// unified dispatch function for sending webhook messages.
// ============================================================

import type { WebhookPlatform, WebhookConfig, WebhookResult } from '../types';
import type { WebhookAdapter, WebhookMessage } from './types';

import { WeComAdapter } from './wecom';
import { FeishuAdapter } from './feishu';
import { DingTalkAdapter } from './dingtalk';
import { SlackAdapter } from './slack';
import { GenericAdapter } from './generic';

export { type WebhookAdapter, type WebhookMessage } from './types';

const adapters: Record<WebhookPlatform, WebhookAdapter> = {
  wecom: new WeComAdapter(),
  feishu: new FeishuAdapter(),
  dingtalk: new DingTalkAdapter(),
  slack: new SlackAdapter(),
  generic: new GenericAdapter(),
};

/**
 * Get the adapter for a given platform.
 */
export function getAdapter(platform: WebhookPlatform): WebhookAdapter {
  return adapters[platform];
}

/**
 * Dispatch a message to a single webhook config.
 * Uses the platform from the config to select the right adapter.
 */
export async function dispatchWebhook(
  config: WebhookConfig,
  msg: WebhookMessage,
): Promise<WebhookResult> {
  const adapter = getAdapter(config.platform);
  return adapter.send(config, msg);
}

/**
 * Dispatch a message to all enabled webhooks in a list.
 * Returns an array of results (one per webhook).
 * Failed webhooks do NOT prevent others from being sent.
 */
export async function dispatchAll(
  configs: WebhookConfig[],
  msg: WebhookMessage,
): Promise<WebhookResult[]> {
  const enabled = configs.filter(c => c.enabled);
  const results = await Promise.allSettled(
    enabled.map(c => dispatchWebhook(c, msg))
  );
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      webhookId: enabled[i].id,
      webhookName: enabled[i].name,
      success: false,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}
