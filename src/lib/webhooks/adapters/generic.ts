// ============================================================
// AI API Relay — Generic Webhook Adapter
// ============================================================
// Sends a plain JSON payload with the full message data.
// Supports custom template (optional) — if defined, the template
// string is treated as a JSON string with {{variable}} placeholders.
// ============================================================

import type { WebhookConfig, WebhookResult } from '../types';
import type { WebhookAdapter, WebhookMessage } from './types';

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

function buildPayload(config: WebhookConfig, msg: WebhookMessage): unknown {
  const baseVars: Record<string, string> = {
    type: msg.type,
    title: msg.title,
    data: JSON.stringify(msg.data),
  };

  // Daily report specific vars
  if (msg.type === 'daily_report') {
    const d = msg.data as import('../types').DailyReportData;
    Object.assign(baseVars, {
      date: d.date,
      totalRequests: String(d.totalRequests),
      totalTokens: String(d.totalTokens),
      promptTokens: String(d.promptTokens),
      completionTokens: String(d.completionTokens),
    });
  }

  // Alert specific vars
  if (msg.type === 'alert') {
    const a = msg.data as import('../types').AlertData;
    Object.assign(baseVars, {
      provider: a.provider,
      metric: a.metric,
      currentValue: String(a.currentValue),
      threshold: String(a.threshold),
      exceededBy: a.exceededBy.toFixed(1),
      date: a.date,
    });
  }

  if (config.template) {
    try {
      const rendered = applyTemplate(config.template, baseVars);
      return JSON.parse(rendered);
    } catch {
      // Template produced invalid JSON — fall back to raw text payload
      return { text: applyTemplate(config.template, baseVars) };
    }
  }

  // Default: full structured payload
  return {
    type: msg.type,
    title: msg.title,
    data: msg.data,
    timestamp: new Date().toISOString(),
  };
}

export class GenericAdapter implements WebhookAdapter {
  format(msg: WebhookMessage, config?: WebhookConfig): unknown {
    if (config) {
      return buildPayload(config, msg);
    }
    return {
      type: msg.type,
      title: msg.title,
      data: msg.data,
      timestamp: new Date().toISOString(),
    };
  }

  async send(config: WebhookConfig, msg: WebhookMessage): Promise<WebhookResult> {
    const body = buildPayload(config, msg);
    try {
      const resp = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const ok = resp.ok;
      let errText: string | undefined;
      if (!ok) {
        errText = await resp.text().catch(() => `HTTP ${resp.status}`);
      }
      return {
        webhookId: config.id,
        webhookName: config.name,
        success: ok,
        statusCode: resp.status,
        error: errText,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        webhookId: config.id,
        webhookName: config.name,
        success: false,
        error: message,
      };
    }
  }
}
