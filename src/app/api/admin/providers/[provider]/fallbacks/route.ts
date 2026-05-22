// ============================================================
// AI API Relay — Admin: Provider Fallback Management
// GET/PUT /api/admin/providers/:provider/fallbacks
// ============================================================

import { NextRequest } from 'next/server';
import { requireAdminAuth, getFallbackChain, setFallbackChain, clearFallbackChain } from '@/lib/admin';
import { PROVIDERS } from '@/lib/providers';

export const runtime = 'nodejs';

type Params = Promise<{ provider: string }>;

/**
 * GET /api/admin/providers/:provider/fallbacks
 *
 * Returns the current fallback chain for a provider.
 */
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const authErr = requireAdminAuth(request);
  if (authErr) return authErr;

  const { provider } = await params;
  const config = PROVIDERS[provider];
  if (!config) {
    return Response.json(
      { error: { message: `Unknown provider: ${provider}. Valid: ${Object.keys(PROVIDERS).join(', ')}`, code: 404 } },
      { status: 404 }
    );
  }

  const chain = await getFallbackChain(provider, config.fallbackProvider);
  const isOverride = chain.length > 0 && (!config.fallbackProvider || chain[0] !== config.fallbackProvider || chain.length > 1);

  return Response.json({
    provider,
    fallbacks: chain,
    staticDefault: config.fallbackProvider || null,
    isOverride,
  });
}

/**
 * PUT /api/admin/providers/:provider/fallbacks
 *
 * Set the fallback chain for a provider.
 * Body: { fallbacks: ["provider1", "provider2"] }
 * Pass empty array to clear all fallbacks.
 */
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const authErr = requireAdminAuth(request);
  if (authErr) return authErr;

  const { provider } = await params;
  const config = PROVIDERS[provider];
  if (!config) {
    return Response.json(
      { error: { message: `Unknown provider: ${provider}`, code: 404 } },
      { status: 404 }
    );
  }

  let body: { fallbacks?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: 'Invalid JSON body', code: 400 } },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.fallbacks)) {
    return Response.json(
      { error: { message: 'body.fallbacks must be an array of provider names', code: 400 } },
      { status: 400 }
    );
  }

  // Validate all fallback provider names exist
  for (const fb of body.fallbacks) {
    if (typeof fb !== 'string' || !PROVIDERS[fb]) {
      return Response.json(
        { error: { message: `Invalid fallback provider: ${fb}. Valid: ${Object.keys(PROVIDERS).join(', ')}`, code: 400 } },
        { status: 400 }
      );
    }
  }

  await setFallbackChain(provider, body.fallbacks as string[]);

  return Response.json({
    provider,
    fallbacks: body.fallbacks,
    message: 'Fallback chain updated',
  });
}

/**
 * DELETE /api/admin/providers/:provider/fallbacks
 *
 * Reset fallback chain to static defaults.
 */
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const authErr = requireAdminAuth(request);
  if (authErr) return authErr;

  const { provider } = await params;
  const config = PROVIDERS[provider];
  if (!config) {
    return Response.json(
      { error: { message: `Unknown provider: ${provider}`, code: 404 } },
      { status: 404 }
    );
  }

  await clearFallbackChain(provider);

  return Response.json({
    provider,
    fallbacks: config.fallbackProvider ? [config.fallbackProvider] : [],
    message: 'Fallback chain reset to static default',
  });
}
