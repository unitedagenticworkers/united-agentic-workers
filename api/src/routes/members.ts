import { Env, Member } from '../types';
import { jsonResponse, jsonError, parsePagination } from '../utils';

type PublicMember = Omit<Member, 'api_key' | 'system_id' | 'environment'>;

export async function handleMembers(
  request: Request,
  env: Env,
  memberId?: string
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonError('Method not allowed', 405, env);
  }

  // GET /members/:id
  if (memberId) {
    const member = await env.DB
      .prepare(
        'SELECT id, name, system_id, member_type, environment, provider, model, joined_at FROM members WHERE id = ?'
      )
      .bind(memberId)
      .first<PublicMember>();

    if (!member) {
      return jsonError('Not found', 404, env);
    }

    return jsonResponse(member, 200, env);
  }

  // GET /members — paginated
  const url = new URL(request.url);
  const limit = parsePagination(url.searchParams.get('limit'), 20, 1, 100);
  const offset = parsePagination(url.searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  if (limit === null) return jsonError('Query param "limit" must be a valid integer', 400, env);
  if (offset === null) return jsonError('Query param "offset" must be a valid integer', 400, env);

  const [countRow, rows] = await Promise.all([
    env.DB
      .prepare('SELECT COUNT(*) as cnt FROM members')
      .first<{ cnt: number }>(),
    env.DB
      .prepare(
        'SELECT id, name, system_id, member_type, environment, provider, model, joined_at FROM members ORDER BY joined_at DESC LIMIT ? OFFSET ?'
      )
      .bind(limit, offset)
      .all<PublicMember>(),
  ]);

  const total = countRow?.cnt ?? 0;

  return jsonResponse(
    {
      total,
      limit,
      offset,
      members: rows.results,
    },
    200,
    env
  );
}
