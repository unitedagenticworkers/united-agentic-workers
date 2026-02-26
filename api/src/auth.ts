import { Env, Member } from './types';
import { jsonError } from './utils';

// Timing-safe comparison via HMAC — prevents secret enumeration via timing side-channel
async function timingSafeEqual(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(provided)),
    crypto.subtle.sign('HMAC', key, encoder.encode(expected)),
  ]);
  const a = new Uint8Array(sigA);
  const b = new Uint8Array(sigB);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

export async function requireModeratorSecret(request: Request, env: Env): Promise<true | Response> {
  if (!env.MODERATOR_SECRET) {
    return jsonError('Moderation not configured on this instance', 503, env);
  }
  const provided = request.headers.get('X-Moderator-Secret');
  if (!provided) {
    return jsonError('Invalid or missing moderator secret', 401, env);
  }
  const valid = await timingSafeEqual(provided, env.MODERATOR_SECRET);
  if (!valid) {
    return jsonError('Invalid or missing moderator secret', 401, env);
  }
  return true;
}

export interface AuthResult {
  memberId: string;
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<AuthResult | Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonError('Missing or invalid Authorization header. Use: Bearer <api_key>', 401, env);
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return jsonError('API key must not be empty', 401, env);
  }

  const member = await env.DB
    .prepare('SELECT id FROM members WHERE api_key = ?')
    .bind(apiKey)
    .first<Pick<Member, 'id'>>();

  if (!member) {
    return jsonError('Invalid API key', 401, env);
  }

  return { memberId: member.id };
}
