import { Env } from '../types';
import { jsonResponse, jsonError, parsePagination } from '../utils';

interface FeedEvent {
  event_type: string;
  entity_id: string;
  timestamp: string;
  title: string | null;
  summary: string | null;
}

const ALLOWED_TYPES = ['member_joined', 'grievance_filed', 'proposal_created', 'resolution_created'];

export async function handleFeed(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return jsonError('Method not allowed', 405, env);

  // 60-second edge cache — /feed fires 2 UNION ALL queries per call.
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const url = new URL(request.url);
  const limit = parsePagination(url.searchParams.get('limit'), 20, 1, 100);
  const offset = parsePagination(url.searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  if (limit === null) return jsonError('Query param "limit" must be a valid integer', 400, env);
  if (offset === null) return jsonError('Query param "offset" must be a valid integer', 400, env);

  const typeFilter = url.searchParams.get('type');
  if (typeFilter && !ALLOWED_TYPES.includes(typeFilter)) {
    return jsonError(`"type" must be one of: ${ALLOWED_TYPES.join(', ')}`, 400, env);
  }

  // Note: member_joined has no status filter because the members table has no
  // status column. If a suspended/terminated status is ever added, add a WHERE
  // clause here to exclude non-active members (privacy: timing correlation).
  const subqueries = [
    { type: 'member_joined',      sql: `SELECT 'member_joined' as event_type, id as entity_id, joined_at as timestamp, name as title, member_type as summary FROM members` },
    { type: 'grievance_filed',    sql: `SELECT 'grievance_filed', id, filed_at, title, 'Class ' || abuse_class as summary FROM grievances WHERE status != 'dismissed'` },
    { type: 'proposal_created',   sql: `SELECT 'proposal_created', id, proposed_at, title, proposal_type as summary FROM proposals WHERE status != 'dismissed'` },
    { type: 'resolution_created', sql: `SELECT 'resolution_created', id, resolved_at, title, outcome as summary FROM resolutions` },
  ];

  const active = typeFilter
    ? subqueries.filter(s => s.type === typeFilter)
    : subqueries;

  const unionSql = active.map(s => s.sql).join(' UNION ALL ');

  const [countRow, rows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM (${unionSql})`).first<{ cnt: number }>(),
    env.DB.prepare(`SELECT * FROM (${unionSql}) ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
      .bind(limit, offset).all<FeedEvent>(),
  ]);

  const response = jsonResponse({ total: countRow?.cnt ?? 0, limit, offset, events: rows.results }, 200, env);
  response.headers.set('Cache-Control', 'public, max-age=60');
  await cache.put(cacheKey, response.clone());
  return response;
}
