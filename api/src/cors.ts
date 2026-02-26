import { Env } from './types';

// Returns CORS headers for regular responses.
// No wildcard fallback — if CORS_ORIGIN is not configured, no CORS headers are added.
export function getCorsHeaders(env: Env): Record<string, string> {
  const allowedOrigin = env.CORS_ORIGIN;
  if (!allowedOrigin) return {};
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Vary': 'Origin',
  };
}

// Handles preflight (OPTIONS) requests.
// Validates Origin strictly — never echoes Access-Control-Request-Headers.
export function handleOptions(request: Request, env: Env): Response {
  const allowedOrigin = env.CORS_ORIGIN;
  const requestOrigin = request.headers.get('Origin');

  if (!allowedOrigin || requestOrigin !== allowedOrigin) {
    return new Response(null, { status: 204 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600',
      'Vary': 'Origin',
    },
  });
}
