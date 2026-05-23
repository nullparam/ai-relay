// ============================================================
// AI API Relay — DingTalk (钉钉) Webhook Adapter
// ============================================================
// DingTalk custom bots accept markdown or actionCard.
// POST https://oapi.dingtalk.com/robot/send?access_token=xxx
// Body: { msgtype: "markdown", markdown: { title, text } }
// ============================================================

import type { WebhookConfig, WebhookResult } from '../types';
import type { WebhookAdapter, WebhookMessage } from './types';

function formatDailyReport(msg: WebhookMessage): string {
  const d = msg.data as import('../types').DailyReportData;

  const providerLines = Object.entries(d.providers)
    .sort(([, a], [, b]) => b.requests - a.requests)
    .slice(0, 5)
    .map(([name, p]) => `> - **${name}**: ${p.requests} 次请求, ${p.tokens.toLocaleString()} tokens`)
    .join('\n');

  const comparison = d.yesterdayComparison
    ? `\n### 📊 环比昨日\n请求数: ${d.yesterdayComparison.requestsChange >= 0 ? '+' : ''}${d.yesterdayComparison.requestsChange.toFixed(1)}%\nTokens: ${d.yesterdayComparison.tokensChange >= 0 ? '+' : ''}${d.yesterdayComparison.tokensChange.toFixed(1)}%`
    : '';

  return `# 📊 AI-Relay 日报 (${d.date})${comparison}
### 总览
- **总请求数**: ${d.totalRequests.toLocaleString()}
- **总 Tokens**: ${d.totalTokens.toLocaleString()}（输入 ${d.promptTokens.toLocaleString()} + 输出 ${d.completionTokens.toLocaleString()}）

### Provider 明细 (Top 5)
${providerLines}`;
}

function formatAlert(msg: WebhookMessage): string {
  const a = msg.data as import('../types').AlertData;
  const metricLabel = a.metric === 'requests' ? '请求数' : 'Tokens';
  const icon = a.exceededBy >= 50 ? '🔴' : '🟡';

  return `# ${icon} AI-Relay 配额告警
- **Provider**: ${a.provider}
- **指标**: ${metricLabel}
- **当前值**: ${a.currentValue.toLocaleString()}
- **阈值**: ${a.threshold.toLocaleString()}
- **超限幅度**: +${a.exceededBy.toFixed(1)}%
- **日期**: ${a.date}`;
}

export class DingTalkAdapter implements WebhookAdapter {
  format(msg: WebhookMessage): unknown {
    const title = msg.type === 'daily_report'
      ? `📊 AI-Relay 日报`
      : `⚠️ AI-Relay 配额告警`;
    const text = msg.type === 'daily_report'
      ? formatDailyReport(msg)
      : formatAlert(msg);

    return {
      msgtype: 'markdown',
      markdown: { title, text },
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
