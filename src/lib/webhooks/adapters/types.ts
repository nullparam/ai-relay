// ============================================================
// AI API Relay — Webhook Platform Adapter Interface
// ============================================================

import type { WebhookConfig, WebhookResult, DailyReportData, AlertData } from '../types';

/**
 * Message payload sent to platform-specific formatters.
 */
export interface WebhookMessage {
  type: 'daily_report' | 'alert';
  title: string;
  data: DailyReportData | AlertData;
}

/**
 * Adapter interface — each platform implements this.
 */
export interface WebhookAdapter {
  /**
   * Format a message payload into the platform-specific request body.
   */
  format(msg: WebhookMessage): unknown;

  /**
   * Send the formatted message to the webhook URL.
   * Returns a WebhookResult indicating success/failure.
   */
  send(config: WebhookConfig, msg: WebhookMessage): Promise<WebhookResult>;
}
