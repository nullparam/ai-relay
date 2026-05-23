// ============================================================
// AI API Relay — WeCom (企业微信) Webhook Adapter
// ============================================================
// WeCom group bots accept markdown or text messages.
// POST https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
// Body: { msgtype: "markdown", markdown: { content } }
// ============================================================

import type { WebhookConfig, WebhookResult } from '../types';
import type { WebhookAdapter, WebhookMessage } from './types';

function formatDailyReport(msg: WebhookMessage): string {
  const d = msg.data;
  if (msg.type !== 'daily_report') return '';
  const report = d as import('../types').DailyReportData;

  const providerLines = Object.entries(report.providers)
    .sort(([, a], [, b]) => b.requests - a.requests)
    .slice(0, 5)
    .map(([name, p]) => `> <font color="comment">${name}</font>: ${p.requests} 次请求, ${p.tokens.toLocaleString()} tokens`)
    .join('\n');

  const topModels = report.topModels
    .slice(0, 5)
    .map(m => `> <font color="comment">${m.model}</font>: ${m.count} 次`)
    .join('\n');

  const comparison = report.yesterdayComparison
    ? `\n**📊 环比昨日**：请求数 ${report.yesterdayComparison.requestsChange >= 0 ? '+' : ''}${report.yesterdayComparison.requestsChange.toFixed(1)}%，Tokens ${report.yesterdayComparison.tokensChange >= 0 ? '+' : ''}${report.yesterdayComparison.tokensChange.toFixed(1)}%`
    : '';

  return `## 📊 AI-Relay 日报 (${report.date})${comparison}
**总请求数**：${report.totalRequests.toLocaleString()}
**总 Tokens**：${report.totalTokens.toLocaleString()}（输入 ${report.promptTokens.toLocaleString()} + 输出 ${report.completionTokens.toLocaleString()}）

### Provider 明细
${providerLines}

### Top 模型
${topModels}`;
}

function formatAlert(msg: WebhookMessage): string {
  if (msg.type !== 'alert') return '';
  const a = msg.data as import('../types').AlertData;

  const metricLabel = a.metric === 'requests' ? '请求数' : 'Tokens';
  const icon = a.exceededBy >= 50 ? '🔴' : '🟡';

  return `## ${icon} AI-Relay 配额告警
**Provider**：${a.provider}
**指标**：${metricLabel}
**当前值**：${a.currentValue.toLocaleString()}
**阈值**：${a.threshold.toLocaleString()}
**超限幅度**：+${a.exceededBy.toFixed(1)}%
**日期**：${a.date}`;
}

export class WeComAdapter implements WebhookAdapter {
  format(msg: WebhookMessage): unknown {
    const content = msg.type === 'daily_report' ? formatDailyReport(msg) : formatAlert(msg);
    return {
      msgtype: 'markdown',
      markdown: { content },
    };
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
