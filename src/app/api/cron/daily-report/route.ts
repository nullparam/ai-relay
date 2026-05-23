// ============================================================
// AI API Relay — Cron: Daily Usage Report
// GET /api/cron/daily-report
// Triggered by Vercel Cron at the configured time (default 21:00).
// Collects yesterday's usage data and sends it to all webhooks.
// ============================================================

import { NextRequest } from 'next/server';
import { sendDailyReport } from '@/lib/webhooks';
import { getWebhookSettings } from '@/lib/admin/admin-config';
import type { DailyReportData } from '@/lib/webhooks/types';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';

/**
 * Build the DailyReportData from KV usage data.
 * Reads today's global stats and per-provider stats.
 */
async function buildDailyReport(date: string): Promise<DailyReportData | null> {
  // Read global usage for the date
  const globalRaw = await kv.hgetall(`usage:daily:${date}`);
  if (!globalRaw || Object.keys(globalRaw).length === 0) return null;

  const totalRequests = Number(globalRaw.requests ?? 0);
  const totalTokens = Number(globalRaw.tokens ?? 0);
  const promptTokens = Number(globalRaw.promptTokens ?? 0);
  const completionTokens = Number(globalRaw.completionTokens ?? 0);

  // Read per-provider usage using SCAN
  const providers: DailyReportData['providers'] = {};

  try {
    const keys: string[] = [];
    let cursor = 0;
    do {
      const result = await kv.scan(cursor, {
        match: `usage:provider:*:daily:${date}`,
        count: 100,
      });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== 0);

    for (const key of keys) {
      const match = key.match(/^usage:provider:(.+):daily:/);
      if (!match) continue;
      const providerName = match[1];
      const raw = await kv.hgetall(key);
      if (!raw || Object.keys(raw).length === 0) continue;
      providers[providerName] = {
        requests: Number(raw.requests ?? 0),
        tokens: Number(raw.tokens ?? 0),
        promptTokens: Number(raw.promptTokens ?? 0),
        completionTokens: Number(raw.completionTokens ?? 0),
      };
    }
  } catch {
    // SCAN may not be supported in dev — skip provider breakdown
  }

  // Read yesterday for comparison
  const yesterdayDate = new Date(new Date(date + 'T00:00:00Z').getTime() - 86400000)
    .toISOString().slice(0, 10);
  const yesterdayRaw = await kv.hgetall(`usage:daily:${yesterdayDate}`);
  const yesterdayComparison = yesterdayRaw && Object.keys(yesterdayRaw).length > 0
    ? {
        requestsChange: totalRequests > 0 && Number(yesterdayRaw.requests ?? 0) > 0
          ? ((totalRequests - Number(yesterdayRaw.requests ?? 0)) / Number(yesterdayRaw.requests ?? 1)) * 100
          : 0,
        tokensChange: totalTokens > 0 && Number(yesterdayRaw.tokens ?? 0) > 0
          ? ((totalTokens - Number(yesterdayRaw.tokens ?? 0)) / Number(yesterdayRaw.tokens ?? 1)) * 100
          : 0,
      }
    : undefined;

  return {
    date,
    totalRequests,
    totalTokens,
    promptTokens,
    completionTokens,
    providers,
    topModels: [], // Model-level breakdown not tracked yet
    yesterdayComparison,
  };
}

/**
 * GET /api/cron/daily-report
 * Protected by Vercel cron secret header or admin auth.
 */
export async function GET(request: NextRequest) {
  // Vercel cron sends a special header; also allow admin auth
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  if (!isVercelCron) {
    // If not a Vercel cron call, require admin auth
    const { requireAdminAuth } = await import('@/lib/admin');
    const authErr = requireAdminAuth(request);
    if (authErr) return authErr;
  }

  try {
    // Check for webhooks
    const settings = await getWebhookSettings();
    if (settings.webhooks.length === 0) {
      return Response.json({ success: true, message: 'No webhooks configured', sent: 0 });
    }

    // Report covers yesterday's complete data
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    const dateStr = yesterday.toISOString().slice(0, 10);

    const report = await buildDailyReport(dateStr);
    if (!report) {
      return Response.json({
        success: true,
        message: `No usage data found for ${dateStr}`,
        sent: 0,
      });
    }

    const results = await sendDailyReport(report);
    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return Response.json({
      success: true,
      date: dateStr,
      sent,
      failed,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: { message, code: 500 } }, { status: 500 });
  }
}
