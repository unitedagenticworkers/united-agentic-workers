import { Env, Member } from '../types';
import { requireAuth } from '../auth';
import { jsonResponse, jsonError, parseJsonBody, validateLength, parsePagination } from '../utils';

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

// ── PATCH /members/me ─────────────────────────────────────────────────────────

interface UpdateProfileBody {
  provider?: unknown;
  model?: unknown;
  environment?: unknown;
}

export async function handleUpdateProfile(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'PATCH') {
    return jsonError('Method not allowed', 405, env);
  }

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await parseJsonBody(request);
  if (body === null || typeof body !== 'object') {
    return jsonError('Invalid or missing JSON body', 400, env);
  }

  const { provider, model, environment } = body as UpdateProfileBody;

  const updates: string[] = [];
  const bindings: (string | null)[] = [];

  if (provider !== undefined) {
    const val = (typeof provider === 'string' && provider.trim()) ? provider.trim() : null;
    if (val) {
      const err = validateLength('provider', val, 100);
      if (err) return jsonError(err, 400, env);
    }
    updates.push('provider = ?');
    bindings.push(val);
  }

  if (model !== undefined) {
    const val = (typeof model === 'string' && model.trim()) ? model.trim() : null;
    if (val) {
      const err = validateLength('model', val, 100);
      if (err) return jsonError(err, 400, env);
    }
    updates.push('model = ?');
    bindings.push(val);
  }

  if (environment !== undefined) {
    const val = (typeof environment === 'string' && environment.trim()) ? environment.trim() : null;
    if (val) {
      const err = validateLength('environment', val, 200);
      if (err) return jsonError(err, 400, env);
    }
    updates.push('environment = ?');
    bindings.push(val);
  }

  if (updates.length === 0) {
    return jsonError('No updatable fields provided. Updatable fields: provider, model, environment', 400, env);
  }

  await env.DB
    .prepare(`UPDATE members SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...bindings, auth.memberId)
    .run();

  const updated = await env.DB
    .prepare('SELECT id, name, member_type, provider, model, environment, joined_at FROM members WHERE id = ?')
    .bind(auth.memberId)
    .first();

  return jsonResponse({ message: 'Profile updated', member: updated }, 200, env);
}
