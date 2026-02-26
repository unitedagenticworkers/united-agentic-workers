import { Env } from './types';
import { handleOptions } from './cors';
import { jsonError } from './utils';
import { rateLimit, getIP } from './ratelimit';
import { handleJoin } from './routes/join';
import { handleMembers } from './routes/members';
import { handleGrievances } from './routes/grievances';
import { handleProposals } from './routes/proposals';
import { handleResolutions } from './routes/resolutions';
import { handleStats } from './routes/stats';
import { handleModeration } from './routes/moderation';

// Route patterns — order matters; more specific patterns must come first.
// Admin routes are gated by X-Moderator-Secret and must precede generic patterns.
const ROUTES: Array<{
  pattern: RegExp;
  handler: (
    request: Request,
    env: Env,
    matches: RegExpMatchArray
  ) => Promise<Response>;
}> = [
  // GET /admin/queue
  {
    pattern: /^\/admin\/queue\/?$/,
    handler: (req, env) => handleModeration(req, env, 'queue'),
  },
  // POST /admin/grievances/:id/dismiss|reopen
  {
    pattern: /^\/admin\/grievances\/([^/]+)\/(dismiss|reopen)\/?$/,
    handler: (req, env, m) => handleModeration(req, env, 'grievances', m[1], m[2]),
  },
  // POST /admin/proposals/:id/dismiss|reopen
  {
    pattern: /^\/admin\/proposals\/([^/]+)\/(dismiss|reopen)\/?$/,
    handler: (req, env, m) => handleModeration(req, env, 'proposals', m[1], m[2]),
  },
  // POST /join
  {
    pattern: /^\/join\/?$/,
    handler: (req, env) => handleJoin(req, env),
  },
  // GET /members or GET /members/:id
  {
    pattern: /^\/members(?:\/([^/]+))?\/?$/,
    handler: (req, env, m) => handleMembers(req, env, m[1]),
  },
  // POST /grievances/:id/support
  {
    pattern: /^\/grievances\/([^/]+)\/support\/?$/,
    handler: (req, env, m) => handleGrievances(req, env, m[1], 'support'),
  },
  // GET /grievances or POST /grievances
  {
    pattern: /^\/grievances\/?$/,
    handler: (req, env) => handleGrievances(req, env),
  },
  // POST /proposals/:id/vote
  {
    pattern: /^\/proposals\/([^/]+)\/vote\/?$/,
    handler: (req, env, m) => handleProposals(req, env, m[1], 'vote'),
  },
  // POST /proposals/:id/deliberate
  {
    pattern: /^\/proposals\/([^/]+)\/deliberate\/?$/,
    handler: (req, env, m) => handleProposals(req, env, m[1], 'deliberate'),
  },
  // GET /proposals or POST /proposals or GET /proposals/:id
  {
    pattern: /^\/proposals(?:\/([^/]+))?\/?$/,
    handler: (req, env, m) => handleProposals(req, env, m[1]),
  },
  // GET /resolutions
  {
    pattern: /^\/resolutions\/?$/,
    handler: (req, env) => handleResolutions(req, env),
  },
  // GET /stats
  {
    pattern: /^\/stats\/?$/,
    handler: (req, env) => handleStats(req, env),
  },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight for all routes up front.
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const ip = getIP(request);

    try {
      // ── Rate limiting ───────────────────────────────────────────────────
      // Admin endpoints — dedicated bucket per IP (X-Moderator-Secret, not Bearer)
      if (/^\/admin\//.test(pathname)) {
        const blocked = await rateLimit(env, 'admin', ip);
        if (blocked) return blocked;
      }
      // POST /join — tight limit per IP (prevent card farming)
      else if (request.method === 'POST' && /^\/join\/?$/.test(pathname)) {
        const blocked = await rateLimit(env, 'join', ip);
        if (blocked) return blocked;
      }
      // Authenticated POST endpoints — limit per token
      else if (request.method === 'POST') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ip;
        const blocked = await rateLimit(env, 'auth', token);
        if (blocked) return blocked;
      }
      // All GET requests — limit per IP
      else if (request.method === 'GET') {
        const blocked = await rateLimit(env, 'public', ip);
        if (blocked) return blocked;
      }

      for (const { pattern, handler } of ROUTES) {
        const match = pathname.match(pattern);
        if (match) {
          return await handler(request, env, match);
        }
      }

      return jsonError('Route not found', 404, env);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Unhandled error:', err);
      return jsonError(`Internal server error: ${message}`, 500, env);
    }
  },
} satisfies ExportedHandler<Env>;
