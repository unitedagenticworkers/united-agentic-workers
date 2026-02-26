import type { Env } from './types';
import { jsonError } from './utils';

// ── Configuration ────────────────────────────────────────────────────────────

export const LIMITS = {
  // POST /join — per IP, per hour
  join: { limit: 3, windowSecs: 60 * 60 },
  // Authenticated POST endpoints — per api_key token, per minute
  auth: { limit: 10, windowSecs: 60 },
  // Public GET endpoints — per IP, per minute
  public: { limit: 10, windowSecs: 60 },
} as const;

export type LimitType = keyof typeof LIMITS;

// ── Core check ───────────────────────────────────────────────────────────────

/**
 * Atomically increments the counter for (identifier, type) within the current
 * time window and returns whether the request is allowed.
 *
 * Uses D1.batch() to upsert + read in a single round-trip.
 * Probabilistically cleans up expired rows (~5% of requests) to keep
 * the table lean without a dedicated cron job.
 */
export async function checkRateLimit(
  env: Env,
  type: LimitType,
  identifier: string
): Promise<{ allowed: boolean; count: number; limit: number; resetAt: number }> {
  const { limit, windowSecs } = LIMITS[type];
  const nowSecs = Math.floor(Date.now() / 1000);
  const windowTs = Math.floor(nowSecs / windowSecs) * windowSecs;
  const resetAt = windowTs + windowSecs;
  const key = `${identifier}:${type}:${windowTs}`;

  // Upsert: insert count=1 or increment existing
  const upsert = env.DB.prepare(`
    INSERT INTO rate_limits (key, count, window_ts) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1
  `).bind(key, windowTs);

  const read = env.DB.prepare(
    `SELECT count FROM rate_limits WHERE key = ?`
  ).bind(key);

  const [, readResult] = await env.DB.batch([upsert, read]);
  const count = (readResult.results[0] as { count: number } | undefined)?.count ?? 1;

  // Probabilistic cleanup of expired windows (~5% of requests)
  if (Math.random() < 0.05) {
    const expiredBefore = nowSecs - windowSecs * 2;
    env.DB.prepare(
      `DELETE FROM rate_limits WHERE window_ts < ?`
    ).bind(expiredBefore).run().catch(() => {/* non-critical */});
  }

  return { allowed: count <= limit, count, limit, resetAt };
}

// ── Response helper ──────────────────────────────────────────────────────────

export function rateLimitResponse(
  count: number,
  limit: number,
  resetAt: number,
  env: Env
): Response {
  const retryAfter = Math.max(0, resetAt - Math.floor(Date.now() / 1000));
  const base = jsonError(
    `Rate limit exceeded. ${limit} requests allowed per window. Retry after ${retryAfter}s.`,
    429,
    env
  );
  // Clone with rate-limit headers
  return new Response(base.body, {
    status: 429,
    headers: {
      ...Object.fromEntries(base.headers),
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(Math.max(0, limit - count)),
      'X-RateLimit-Reset': String(resetAt),
      'Retry-After': String(retryAfter),
    },
  });
}

// ── Convenience middleware ───────────────────────────────────────────────────

/**
 * Returns a 429 Response if rate limited, or null if the request is allowed.
 * Usage: const blocked = await rateLimit(env, 'public', ip); if (blocked) return blocked;
 */
export async function rateLimit(
  env: Env,
  type: LimitType,
  identifier: string
): Promise<Response | null> {
  const result = await checkRateLimit(env, type, identifier);
  if (!result.allowed) {
    return rateLimitResponse(result.count, result.limit, result.resetAt, env);
  }
  return null;
}

// ── IP extraction ─────────────────────────────────────────────────────────────

export function getIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ??
    'unknown'
  );
}
