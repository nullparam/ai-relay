// ============================================================
// AI API Relay — Admin Auth Helper
// ============================================================
// Uses RELAY_API_KEY for admin authentication (same as relay auth).

import { getRelayApiKeys } from '@/lib/relay';

export { getRelayApiKeys };

/**
 * Get all configured admin API keys.
 * Falls back to RELAY_API_KEY if RELAY_ADMIN_KEY is not defined.
 */
export function getRelayAdminKeys(): string[] {
  const adminKeys = process.env.RELAY_ADMIN_KEY || '';
  if (adminKeys) {
    return adminKeys
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
  }
  return getRelayApiKeys();
}

/**
 * Validate admin authorization.
 * Returns null if valid, or a 401 Response if invalid.
 */
export function requireAdminAuth(request: Request): Response | null {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || '';

  if (!token) {
    return Response.json(
      { error: { message: 'Missing Authorization header. Use: Bearer <token>', code: 401 } },
      { status: 401 }
    );
  }

  const validKeys = getRelayAdminKeys();
  if (!validKeys.includes(token)) {
    return Response.json(
      { error: { message: 'Unauthorized. Invalid admin token.', code: 401 } },
      { status: 401 }
    );
  }

  return null; // valid
}
