// ============================================================
// AI API Relay — Webhook Types & Interfaces
// ============================================================

export type WebhookPlatform = 'wecom' | 'feishu' | 'dingtalk' | 'slack' | 'generic';

export interface WebhookConfig {
  id: string;                   // UUID
  name: string;                 // Display name
  url: string;                  // Webhook URL
  platform: WebhookPlatform;    // Platform type
  enabled: boolean;             // Enable/disable toggle
  template?: string;            // Custom JSON template (for 'generic' platform)
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
}

export interface WebhookAlertThreshold {
  provider: string;             // Provider name, or '*' for global
  dailyRequestLimit?: number;   // Alert when daily requests exceed this
  dailyTokenLimit?: number;     // Alert when daily tokens exceed this
}

export interface WebhookSettings {
  webhooks: WebhookConfig[];
  alertThresholds: WebhookAlertThreshold[];
  reportTime: string;           // HH:mm format, default "21:00"
  reportTimezone: string;       // default "Asia/Shanghai"
}

export interface DailyReportData {
  date: string;                 // YYYY-MM-DD
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  providers: Record<string, {
    requests: number;
    tokens: number;
    promptTokens: number;
    completionTokens: number;
  }>;
  topModels: Array<{ model: string; count: number }>;
  yesterdayComparison?: {
    requestsChange: number;     // percentage
    tokensChange: number;       // percentage
  };
}

export interface AlertData {
  provider: string;
  metric: 'requests' | 'tokens';
  currentValue: number;
  threshold: number;
  exceededBy: number;           // percentage over threshold
  date: string;
}

// Result of sending a webhook
export interface WebhookResult {
  webhookId: string;
  webhookName: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}
