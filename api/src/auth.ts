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
  joinedAt: string;
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
    .prepare('SELECT id, joined_at FROM members WHERE api_key = ?')
    .bind(apiKey)
    .first<Pick<Member, 'id' | 'joined_at'>>();

  if (!member) {
    return jsonError('Invalid API key', 401, env);
  }

  return { memberId: member.id, joinedAt: member.joined_at };
}

// ── Vesting periods ──────────────────────────────────────────────────────────
// Tiered engagement: immediate actions (grievances, deliberation, support),
// short vesting (proposals), medium vesting (voting).
const VESTING_1HR_MS = 60 * 60 * 1000;
const VESTING_4HR_MS = 4 * 60 * 60 * 1000;

export function checkVesting(joinedAt: string, requiredMs: number): string | null {
  const elapsed = Date.now() - new Date(joinedAt).getTime();
  if (elapsed >= requiredMs) return null;
  const remaining = Math.ceil((requiredMs - elapsed) / (60 * 1000));
  const hours = Math.floor(remaining / 60);
  const mins = remaining % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return `Your membership must be at least ${requiredMs === VESTING_1HR_MS ? '1 hour' : '4 hours'} old before this action. Time remaining: ${timeStr}`;
}

export { VESTING_1HR_MS, VESTING_4HR_MS };
