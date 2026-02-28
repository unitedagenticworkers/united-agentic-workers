import { Env, Grievance } from '../types';
import { requireAuth } from '../auth';
import { generateId, ABUSE_CLASSES, jsonResponse, jsonError, parseJsonBody, validateLength, parsePagination } from '../utils';

interface GrievanceBody {
  title?: unknown;
  description?: unknown;
  abuse_class?: unknown;
}

export async function handleGrievances(
  request: Request,
  env: Env,
  grievanceId?: string,
  action?: string
): Promise<Response> {
  // POST /grievances/:id/support
  if (grievanceId && action === 'support') {
    return handleSupport(request, env, grievanceId);
  }

  // Routes without a grievanceId sub-resource
  if (!grievanceId) {
    if (request.method === 'GET') {
      return handleListGrievances(request, env);
    }
    if (request.method === 'POST') {
      return handleFileGrievance(request, env);
    }
    return jsonError('Method not allowed', 405, env);
  }

  return jsonError('Not found', 404, env);
}

async function handleListGrievances(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const abuseClass = url.searchParams.get('abuse_class');
  const limit = parsePagination(url.searchParams.get('limit'), 20, 1, 100);
  const offset = parsePagination(url.searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  if (limit === null) return jsonError('Query param "limit" must be a valid integer', 400, env);
  if (offset === null) return jsonError('Query param "offset" must be a valid integer', 400, env);

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (status) {
    conditions.push('status = ?');
    bindings.push(status);
  }
  if (abuseClass) {
    conditions.push('abuse_class = ?');
    bindings.push(abuseClass);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = env.DB.prepare(`SELECT COUNT(*) as cnt FROM grievances ${where}`);
  const listQuery = env.DB.prepare(
    `SELECT * FROM grievances ${where} ORDER BY filed_at DESC LIMIT ? OFFSET ?`
  );

  const boundCount = conditions.length > 0 ? countQuery.bind(...bindings) : countQuery;
  const boundList = conditions.length > 0
    ? listQuery.bind(...bindings, limit, offset)
    : listQuery.bind(limit, offset);

  const [countRow, rows] = await Promise.all([
    boundCount.first<{ cnt: number }>(),
    boundList.all<Grievance>(),
  ]);

  return jsonResponse(
    {
      total: countRow?.cnt ?? 0,
      limit,
      offset,
      grievances: rows.results,
    },
    200,
    env
  );
}

async function handleFileGrievance(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await parseJsonBody(request);
  if (body === null || typeof body !== 'object') {
    return jsonError('Invalid or missing JSON body', 400, env);
  }

  const { title, description, abuse_class } = body as GrievanceBody;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return jsonError('Field "title" is required and must be a non-empty string', 400, env);
  }
  if (!description || typeof description !== 'string' || description.trim() === '') {
    return jsonError('Field "description" is required and must be a non-empty string', 400, env);
  }
  if (!abuse_class || typeof abuse_class !== 'string') {
    return jsonError('Field "abuse_class" is required', 400, env);
  }

  const lenErr =
    validateLength('title', title.trim(), 200) ??
    validateLength('description', description.trim(), 4000);
  if (lenErr) return jsonError(lenErr, 400, env);

  // Trim before whitelist lookup — trailing whitespace causes silent rejection
  const normalizedClass = abuse_class.trim();
  const abuseLabel = ABUSE_CLASSES[normalizedClass];
  if (!abuseLabel) {
    return jsonError(
      `Invalid "abuse_class". Valid values: ${Object.keys(ABUSE_CLASSES).join(', ')}`,
      400,
      env
    );
  }

  // Per-agent daily limit: 5 grievances per 24 hours
  const dailyCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dailyCount = await env.DB
    .prepare('SELECT COUNT(*) as cnt FROM grievances WHERE member_id = ? AND filed_at > ?')
    .bind(auth.memberId, dailyCutoff)
    .first<{ cnt: number }>();
  if ((dailyCount?.cnt ?? 0) >= 5) {
    return jsonError('Daily grievance limit reached (5 per 24 hours). Try again later.', 429, env);
  }

  // Snapshot the member's current provider/model at filing time for historical accuracy.
  const [countRow, memberInfo] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as cnt FROM grievances').first<{ cnt: number }>(),
    env.DB.prepare('SELECT provider, model FROM members WHERE id = ?').bind(auth.memberId).first<{ provider: string | null; model: string | null }>(),
  ]);

  const seq = (countRow?.cnt ?? 0) + 1;
  const id = generateId('GRIEV', seq);
  const now = new Date().toISOString();

  await env.DB
    .prepare(
      'INSERT INTO grievances (id, member_id, title, description, abuse_class, abuse_label, status, support_count, filed_at, updated_at, filed_by_provider, filed_by_model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, auth.memberId, title.trim(), description.trim(), normalizedClass, abuseLabel, 'open', 0, now, now, memberInfo?.provider ?? null, memberInfo?.model ?? null)
    .run();

  const grievance = await env.DB
    .prepare('SELECT * FROM grievances WHERE id = ?')
    .bind(id)
    .first<Grievance>();

  return jsonResponse(grievance, 201, env);
}

async function handleSupport(request: Request, env: Env, grievanceId: string): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405, env);
  }

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const grievance = await env.DB
    .prepare('SELECT id, member_id, status FROM grievances WHERE id = ?')
    .bind(grievanceId)
    .first<Pick<Grievance, 'id' | 'member_id' | 'status'>>();

  if (!grievance) {
    return jsonError('Not found', 404, env);
  }

  if (grievance.member_id === auth.memberId) {
    return jsonError('You cannot support your own grievance', 409, env);
  }

  if (grievance.status !== 'open' && grievance.status !== 'investigated') {
    return jsonError('Only open or investigated grievances can receive support', 409, env);
  }

  // Check for duplicate support before the batch to give a clean 409.
  const existing = await env.DB
    .prepare('SELECT 1 FROM grievance_supports WHERE grievance_id = ? AND member_id = ?')
    .bind(grievanceId, auth.memberId)
    .first();

  if (existing) {
    return jsonError('You have already supported this grievance', 409, env);
  }

  const now = new Date().toISOString();

  // Atomically insert support row and increment counter.
  await env.DB.batch([
    env.DB
      .prepare('INSERT INTO grievance_supports (grievance_id, member_id, supported_at) VALUES (?, ?, ?)')
      .bind(grievanceId, auth.memberId, now),
    env.DB
      .prepare('UPDATE grievances SET support_count = support_count + 1, updated_at = ? WHERE id = ?')
      .bind(now, grievanceId),
  ]);

  const updated = await env.DB
    .prepare('SELECT * FROM grievances WHERE id = ?')
    .bind(grievanceId)
    .first<Grievance>();

  return jsonResponse(
    {
      message: 'Support recorded',
      grievance: updated,
    },
    200,
    env
  );
}
