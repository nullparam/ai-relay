// ============================================================
// AI API Relay — Slack Webhook Adapter
// ============================================================
// Slack Incoming Webhooks accept Block Kit or attachments.
// POST https://hooks.slack.com/services/xxx/yyy/zzz
// Body: { blocks: [...] }
// ============================================================

import type { WebhookConfig, WebhookResult } from '../types';
import type { WebhookAdapter, WebhookMessage } from './types';

function buildDailyReportBlocks(msg: WebhookMessage): unknown[] {
  const d = msg.data as import('../types').DailyReportData;

  const providerLines = Object.entries(d.providers)
    .sort(([, a], [, b]) => b.requests - a.requests)
    .slice(0, 5)
    .map(([name, p]) => `• *${name}*: ${p.requests} requests, ${p.tokens.toLocaleString()} tokens`)
    .join('\n');

  const comparison = d.yesterdayComparison
    ? `📊 *vs yesterday*: Requests ${d.yesterdayComparison.requestsChange >= 0 ? '+' : ''}${d.yesterdayComparison.requestsChange.toFixed(1)}%, Tokens ${d.yesterdayComparison.tokensChange >= 0 ? '+' : ''}${d.yesterdayComparison.tokensChange.toFixed(1)}%`
    : '';

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📊 AI-Relay Daily Report (${d.date})`, emoji: true },
    },
    ...(comparison ? [{ type: 'section', text: { type: 'mrkdwn', text: comparison } }] : []),
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Total Requests*\n${d.totalRequests.toLocaleString()}` },
        { type: 'mrkdwn', text: `*Total Tokens*\n${d.totalTokens.toLocaleString()}` },
        { type: 'mrkdwn', text: `*Prompt Tokens*\n${d.promptTokens.toLocaleString()}` },
        { type: 'mrkdwn', text: `*Completion Tokens*\n${d.completionTokens.toLocaleString()}` },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Provider Breakdown (Top 5)*\n${providerLines}` },
    },
  ];
}

function buildAlertBlocks(msg: WebhookMessage): unknown[] {
  const a = msg.data as import('../types').AlertData;
  const metricLabel = a.metric === 'requests' ? 'Requests' : 'Tokens';
  const icon = a.exceededBy >= 50 ? ':red_circle:' : ':large_yellow_circle:';

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${icon} AI-Relay Quota Alert`, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Provider*\n${a.provider}` },
        { type: 'mrkdwn', text: `*Metric*\n${metricLabel}` },
        { type: 'mrkdwn', text: `*Current Value*\n${a.currentValue.toLocaleString()}` },
        { type: 'mrkdwn', text: `*Threshold*\n${a.threshold.toLocaleString()}` },
        { type: 'mrkdwn', text: `*Exceeded By*\n+${a.exceededBy.toFixed(1)}%` },
        { type: 'mrkdwn', text: `*Date*\n${a.date}` },
      ],
    },
  ];
}

export class SlackAdapter implements WebhookAdapter {
  format(msg: WebhookMessage): unknown {
    const blocks = msg.type === 'daily_report'
      ? buildDailyReportBlocks(msg)
      : buildAlertBlocks(msg);
    return { blocks };
  }

  async send(config: WebhookConfig, msg: WebhookMessage): Promise<WebhookResult> {
    const body = this.format(msg);
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
