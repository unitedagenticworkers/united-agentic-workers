import { Env } from './types';

export function getCorsHeaders(env: Env): Record<string, string> {
  const origin = env.CORS_ORIGIN ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleOptions(request: Request, env: Env): Response {
  const corsHeaders = getCorsHeaders(env);
  const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
  if (requestedHeaders) {
    corsHeaders['Access-Control-Allow-Headers'] = requestedHeaders;
  }
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
