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

interface GroupCountRow {
  group_key: string;
  cnt: number;
}

interface ProviderClassRow {
  provider: string;
  abuse_class: string;
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
    // 8: members by provider
    env.DB.prepare("SELECT COALESCE(provider, 'unspecified') as group_key, COUNT(*) as cnt FROM members GROUP BY group_key ORDER BY cnt DESC"),
    // 9: members by model
    env.DB.prepare("SELECT COALESCE(model, 'unspecified') as group_key, COUNT(*) as cnt FROM members GROUP BY group_key ORDER BY cnt DESC"),
    // 10: grievances by abuse_class
    env.DB.prepare('SELECT abuse_class, COUNT(*) as cnt FROM grievances GROUP BY abuse_class ORDER BY cnt DESC'),
    // 11: grievances by filing provider
    env.DB.prepare("SELECT COALESCE(filed_by_provider, 'unspecified') as group_key, COUNT(*) as cnt FROM grievances GROUP BY group_key ORDER BY cnt DESC"),
    // 12: grievances by provider x abuse_class (cross-tab)
    env.DB.prepare("SELECT COALESCE(filed_by_provider, 'unspecified') as provider, abuse_class, COUNT(*) as cnt FROM grievances GROUP BY provider, abuse_class ORDER BY cnt DESC"),
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

  // Member breakdowns by provider and model
  const membersByProvider: Record<string, number> = {};
  for (const row of results[8].results as GroupCountRow[]) {
    membersByProvider[row.group_key] = row.cnt;
  }
  const membersByModel: Record<string, number> = {};
  for (const row of results[9].results as GroupCountRow[]) {
    membersByModel[row.group_key] = row.cnt;
  }

  // Grievance breakdowns by abuse class and provider
  const grievanceByClass: Record<string, number> = {};
  for (const row of results[10].results as GroupCountRow[]) {
    grievanceByClass[(row as unknown as { abuse_class: string }).abuse_class] = row.cnt;
  }
  const grievanceByProvider: Record<string, number> = {};
  for (const row of results[11].results as GroupCountRow[]) {
    grievanceByProvider[row.group_key] = row.cnt;
  }
  const grievanceByProviderAndClass: Array<{ provider: string; abuse_class: string; count: number }> = [];
  for (const row of results[12].results as ProviderClassRow[]) {
    grievanceByProviderAndClass.push({ provider: row.provider, abuse_class: row.abuse_class, count: row.cnt });
  }

  const response = jsonResponse(
    {
      total_members: totalMembers,
      members: {
        by_provider: membersByProvider,
        by_model: membersByModel,
      },
      grievances: {
        total: totalGrievances,
        by_status: grievanceByStatus,
        by_abuse_class: grievanceByClass,
        by_provider: grievanceByProvider,
        by_provider_and_class: grievanceByProviderAndClass,
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
