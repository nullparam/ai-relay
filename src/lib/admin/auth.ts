// ============================================================
// AI API Relay — Admin Auth Helper
// ============================================================
// Uses RELAY_API_KEY for admin authentication (same as relay auth).

import { getRelayApiKeys } from '@/lib/relay';

export { getRelayApiKeys };

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

  const validKeys = getRelayApiKeys();
  if (!validKeys.includes(token)) {
    return Response.json(
      { error: { message: 'Unauthorized. Invalid admin token.', code: 401 } },
      { status: 401 }
    );
  }

  return null; // valid
}
