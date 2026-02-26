import { Env } from './types';
import { handleOptions } from './cors';
import { jsonError } from './utils';
import { handleJoin } from './routes/join';
import { handleMembers } from './routes/members';
import { handleGrievances } from './routes/grievances';
import { handleProposals } from './routes/proposals';
import { handleResolutions } from './routes/resolutions';
import { handleStats } from './routes/stats';

// Route patterns — order matters; more specific patterns must come first.
const ROUTES: Array<{
  pattern: RegExp;
  handler: (
    request: Request,
    env: Env,
    matches: RegExpMatchArray
  ) => Promise<Response>;
}> = [
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

    try {
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
