import { Env, Resolution } from '../types';
import { jsonResponse, jsonError } from '../utils';

export async function handleResolutions(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonError('Method not allowed', 405, env);
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);

  const [countRow, rows] = await Promise.all([
    env.DB
      .prepare('SELECT COUNT(*) as cnt FROM resolutions')
      .first<{ cnt: number }>(),
    env.DB
      .prepare('SELECT * FROM resolutions ORDER BY resolved_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all<Resolution>(),
  ]);

  return jsonResponse(
    {
      total: countRow?.cnt ?? 0,
      limit,
      offset,
      resolutions: rows.results,
    },
    200,
    env
  );
}
