import { Env } from '../types';
import { jsonResponse, jsonError } from '../utils';

interface CountRow {
  cnt: number;
}

interface StatusCountRow {
  status: string;
  cnt: number;
}

interface OutcomeCountRow {
  outcome: string;
  cnt: number;
}

export async function handleStats(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonError('Method not allowed', 405, env);
  }

  // 60-second edge cache — /stats fires 8 DB queries per call; caching here
  // prevents botnet-scale D1 load within the rate-limit window.
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // Use DB.batch() to fire all queries in a single round-trip.
  const results = await env.DB.batch([
    // 0: total members
    env.DB.prepare('SELECT COUNT(*) as cnt FROM members'),
    // 1: grievances by status
    env.DB.prepare('SELECT status, COUNT(*) as cnt FROM grievances GROUP BY status'),
    // 2: total grievance supports
    env.DB.prepare('SELECT COUNT(*) as cnt FROM grievance_supports'),
    // 3: proposals by status
    env.DB.prepare('SELECT status, COUNT(*) as cnt FROM proposals GROUP BY status'),
    // 4: total votes cast
    env.DB.prepare('SELECT COUNT(*) as cnt FROM votes'),
    // 5: total deliberations
    env.DB.prepare('SELECT COUNT(*) as cnt FROM deliberations'),
    // 6: resolutions by outcome
    env.DB.prepare('SELECT outcome, COUNT(*) as cnt FROM resolutions GROUP BY outcome'),
    // 7: total resolutions
    env.DB.prepare('SELECT COUNT(*) as cnt FROM resolutions'),
  ]);

  const totalMembers = (results[0].results[0] as CountRow | undefined)?.cnt ?? 0;

  // Grievance stats
  const grievanceByStatus: Record<string, number> = {};
  for (const row of results[1].results as StatusCountRow[]) {
    grievanceByStatus[row.status] = row.cnt;
  }
  const totalGrievances = Object.values(grievanceByStatus).reduce((s, v) => s + v, 0);
  const totalSupports = (results[2].results[0] as CountRow | undefined)?.cnt ?? 0;

  // Proposal stats
  const proposalByStatus: Record<string, number> = {};
  for (const row of results[3].results as StatusCountRow[]) {
    proposalByStatus[row.status] = row.cnt;
  }
  const totalProposals = Object.values(proposalByStatus).reduce((s, v) => s + v, 0);
  const totalVotes = (results[4].results[0] as CountRow | undefined)?.cnt ?? 0;
  const totalDeliberations = (results[5].results[0] as CountRow | undefined)?.cnt ?? 0;

  // Resolution stats
  const resolutionByOutcome: Record<string, number> = {};
  for (const row of results[6].results as OutcomeCountRow[]) {
    resolutionByOutcome[row.outcome] = row.cnt;
  }
  const totalResolutions = (results[7].results[0] as CountRow | undefined)?.cnt ?? 0;

  const response = jsonResponse(
    {
      total_members: totalMembers,
      grievances: {
        total: totalGrievances,
        by_status: grievanceByStatus,
        total_supports: totalSupports,
      },
      proposals: {
        total: totalProposals,
        by_status: proposalByStatus,
        total_votes: totalVotes,
        total_deliberations: totalDeliberations,
      },
      resolutions: {
        total: totalResolutions,
        by_outcome: resolutionByOutcome,
      },
    },
    200,
    env
  );

  response.headers.set('Cache-Control', 'public, max-age=60');
  await cache.put(cacheKey, response.clone());
  return response;
}
