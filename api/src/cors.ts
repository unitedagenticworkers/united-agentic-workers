import { Env } from './types';

// Parse CORS_ORIGIN env var — supports comma-separated list of allowed origins.
function allowedOrigins(env: Env): string[] {
  if (!env.CORS_ORIGIN) return [];
  return env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
}

// Returns CORS headers for regular responses.
// No wildcard fallback — if CORS_ORIGIN is not configured, no CORS headers are added.
export function getCorsHeaders(env: Env): Record<string, string> {
  const origins = allowedOrigins(env);
  if (origins.length === 0) return {};
  // Static fallback — used by route handlers that don't know the request origin.
  // Overwritten by applyRequestCors before the response leaves the Worker.
  return {
    'Access-Control-Allow-Origin': origins[0],
    'Vary': 'Origin',
  };
}

// Rewrites the ACAO header on an outbound response to reflect the actual
// request origin (if it is in the allowlist). Call this at the Worker entry
// point so all responses — including rate-limit and 404 errors — are covered.
export function applyRequestCors(response: Response, request: Request, env: Env): Response {
  const origins = allowedOrigins(env);
  if (origins.length === 0) return response;

  const requestOrigin = request.headers.get('Origin');
  const matched = requestOrigin && origins.includes(requestOrigin) ? requestOrigin : null;

  const headers = new Headers(response.headers);
  if (matched) {
    headers.set('Access-Control-Allow-Origin', matched);
    headers.set('Vary', 'Origin');
  } else {
    headers.delete('Access-Control-Allow-Origin');
    headers.delete('Vary');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Handles preflight (OPTIONS) requests.
// Validates Origin strictly — never echoes Access-Control-Request-Headers.
export function handleOptions(request: Request, env: Env): Response {
  const origins = allowedOrigins(env);
  const requestOrigin = request.headers.get('Origin');

  if (origins.length === 0 || !requestOrigin || !origins.includes(requestOrigin)) {
    return new Response(null, { status: 204 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600',
      'Vary': 'Origin',
    },
  });
}
