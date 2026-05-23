// ============================================================
// AI API Relay — Feishu (飞书) Webhook Adapter
// ============================================================
// Feishu custom bots accept rich card or text messages.
// POST https://open.feishu.cn/open-apis/bot/v2/hook/xxx
// Body: { msg_type: "interactive", card: { ... } }
// ============================================================

import type { WebhookConfig, WebhookResult } from '../types';
import type { WebhookAdapter, WebhookMessage } from './types';

function buildDailyReportCard(msg: WebhookMessage): unknown {
  const d = msg.data as import('../types').DailyReportData;

  const providerRows = Object.entries(d.providers)
    .sort(([, a], [, b]) => b.requests - a.requests)
    .slice(0, 5)
    .map(([name, p]) => ({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${name}**: ${p.requests} 次请求 · ${p.tokens.toLocaleString()} tokens`,
      },
    }));

  const comparison = d.yesterdayComparison
    ? {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `📊 **环比昨日**: 请求数 ${d.yesterdayComparison.requestsChange >= 0 ? '+' : ''}${d.yesterdayComparison.requestsChange.toFixed(1)}%, Tokens ${d.yesterdayComparison.tokensChange >= 0 ? '+' : ''}${d.yesterdayComparison.tokensChange.toFixed(1)}%`,
      },
    }
    : null;

  const elements = [
    comparison,
    {
      tag: 'div',
      fields: [
        { is_short: true, text: { tag: 'lark_md', content: `**总请求数**\n${d.totalRequests.toLocaleString()}` } },
        { is_short: true, text: { tag: 'lark_md', content: `**总 Tokens**\n${d.totalTokens.toLocaleString()}` } },
        { is_short: true, text: { tag: 'lark_md', content: `**输入 Tokens**\n${d.promptTokens.toLocaleString()}` } },
        { is_short: true, text: { tag: 'lark_md', content: `**输出 Tokens**\n${d.completionTokens.toLocaleString()}` } },
      ],
    },
    { tag: 'hr' },
    { tag: 'div', text: { tag: 'lark_md', content: '**Provider 明细 (Top 5)**' } },
    ...providerRows,
  ].filter(Boolean);

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: `📊 AI-Relay 日报 (${d.date})` },
        template: 'blue',
      },
      elements,
    },
  };
}

function buildAlertCard(msg: WebhookMessage): unknown {
  const a = msg.data as import('../types').AlertData;
  const metricLabel = a.metric === 'requests' ? '请求数' : 'Tokens';
  const color = a.exceededBy >= 50 ? 'red' : 'orange';
  const icon = a.exceededBy >= 50 ? '🔴' : '🟡';

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: `${icon} AI-Relay 配额告警` },
        template: color,
      },
      elements: [
        {
          tag: 'div',
          fields: [
            { is_short: true, text: { tag: 'lark_md', content: `**Provider**\n${a.provider}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**指标**\n${metricLabel}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**当前值**\n${a.currentValue.toLocaleString()}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**阈值**\n${a.threshold.toLocaleString()}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**超限幅度**\n+${a.exceededBy.toFixed(1)}%` } },
            { is_short: true, text: { tag: 'lark_md', content: `**日期**\n${a.date}` } },
          ],
        },
      ],
    },
  };
}

export class FeishuAdapter implements WebhookAdapter {
  format(msg: WebhookMessage): unknown {
    return msg.type === 'daily_report'
      ? buildDailyReportCard(msg)
      : buildAlertCard(msg);
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
