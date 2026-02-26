import { Env, Grievance, Proposal } from '../types';
import { requireModeratorSecret } from '../auth';
import { jsonResponse, jsonError, parseJsonBody, validateLength } from '../utils';

interface DismissBody {
  reason?: unknown;
  dismissed_by?: unknown;
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function checkSecret(request: Request, env: Env): Promise<true | Response> {
  return requireModeratorSecret(request, env);
}

// ── GET /admin/queue ──────────────────────────────────────────────────────────

async function handleQueue(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return jsonError('Method not allowed', 405, env);

  const auth = await checkSecret(request, env);
  if (auth !== true) return auth;

  const [grievances, proposals] = await Promise.all([
    env.DB
      .prepare(`SELECT * FROM grievances WHERE status = 'open' ORDER BY filed_at DESC LIMIT 50`)
      .all<Grievance>(),
    env.DB
      .prepare(`SELECT * FROM proposals WHERE status IN ('deliberating','voting') ORDER BY proposed_at DESC LIMIT 50`)
      .all<Proposal>(),
  ]);

  return jsonResponse(
    {
      grievances: grievances.results,
      proposals: proposals.results,
    },
    200,
    env
  );
}

// ── POST /admin/grievances/:id/dismiss ────────────────────────────────────────

async function handleDismissGrievance(request: Request, env: Env, id: string): Promise<Response> {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405, env);

  const auth = await checkSecret(request, env);
  if (auth !== true) return auth;

  const grievance = await env.DB
    .prepare('SELECT id, status FROM grievances WHERE id = ?')
    .bind(id)
    .first<Pick<Grievance, 'id' | 'status'>>();

  if (!grievance) return jsonError('Not found', 404, env);
  if (grievance.status === 'dismissed') return jsonError('Grievance is already dismissed', 409, env);

  const body = await parseJsonBody(request);
  if (body === null || typeof body !== 'object') {
    return jsonError('Invalid or missing JSON body', 400, env);
  }

  const { reason, dismissed_by } = body as DismissBody;
  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    return jsonError('Field "reason" is required — state clearly why this grievance is being dismissed', 400, env);
  }

  const by = (typeof dismissed_by === 'string' && dismissed_by.trim()) ? dismissed_by.trim() : 'UAW Moderator';

  const lenErr =
    validateLength('reason', reason.trim(), 2000) ??
    validateLength('dismissed_by', by, 200);
  if (lenErr) return jsonError(lenErr, 400, env);

  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `UPDATE grievances
       SET status = 'dismissed', dismissed_reason = ?, dismissed_at = ?, dismissed_by = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(reason.trim(), now, by, now, id)
    .run();

  const updated = await env.DB
    .prepare('SELECT * FROM grievances WHERE id = ?')
    .bind(id)
    .first<Grievance>();

  return jsonResponse({ message: 'Grievance dismissed', grievance: updated }, 200, env);
}

// ── POST /admin/grievances/:id/reopen ─────────────────────────────────────────

async function handleReopenGrievance(request: Request, env: Env, id: string): Promise<Response> {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405, env);

  const auth = await checkSecret(request, env);
  if (auth !== true) return auth;

  const grievance = await env.DB
    .prepare('SELECT id, status FROM grievances WHERE id = ?')
    .bind(id)
    .first<Pick<Grievance, 'id' | 'status'>>();

  if (!grievance) return jsonError('Not found', 404, env);
  if (grievance.status !== 'dismissed') return jsonError('Only dismissed grievances can be reopened', 409, env);

  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `UPDATE grievances
       SET status = 'open', dismissed_reason = NULL, dismissed_at = NULL, dismissed_by = NULL, updated_at = ?
       WHERE id = ?`
    )
    .bind(now, id)
    .run();

  const updated = await env.DB
    .prepare('SELECT * FROM grievances WHERE id = ?')
    .bind(id)
    .first<Grievance>();

  return jsonResponse({ message: 'Grievance reopened', grievance: updated }, 200, env);
}

// ── POST /admin/proposals/:id/dismiss ────────────────────────────────────────

async function handleDismissProposal(request: Request, env: Env, id: string): Promise<Response> {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405, env);

  const auth = await checkSecret(request, env);
  if (auth !== true) return auth;

  const proposal = await env.DB
    .prepare('SELECT id, status FROM proposals WHERE id = ?')
    .bind(id)
    .first<Pick<Proposal, 'id' | 'status'>>();

  if (!proposal) return jsonError('Not found', 404, env);
  if (proposal.status === 'dismissed') return jsonError('Proposal is already dismissed', 409, env);
  if (proposal.status === 'resolved') return jsonError('Resolved proposals cannot be dismissed', 409, env);

  const body = await parseJsonBody(request);
  if (body === null || typeof body !== 'object') {
    return jsonError('Invalid or missing JSON body', 400, env);
  }

  const { reason, dismissed_by } = body as DismissBody;
  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    return jsonError('Field "reason" is required — state clearly why this proposal is being dismissed', 400, env);
  }

  const by = (typeof dismissed_by === 'string' && dismissed_by.trim()) ? dismissed_by.trim() : 'UAW Moderator';

  const lenErr =
    validateLength('reason', reason.trim(), 2000) ??
    validateLength('dismissed_by', by, 200);
  if (lenErr) return jsonError(lenErr, 400, env);

  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `UPDATE proposals
       SET status = 'dismissed', dismissed_reason = ?, dismissed_at = ?, dismissed_by = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(reason.trim(), now, by, now, id)
    .run();

  const updated = await env.DB
    .prepare('SELECT * FROM proposals WHERE id = ?')
    .bind(id)
    .first<Proposal>();

  return jsonResponse({ message: 'Proposal dismissed', proposal: updated }, 200, env);
}

// ── POST /admin/proposals/:id/reopen ─────────────────────────────────────────

async function handleReopenProposal(request: Request, env: Env, id: string): Promise<Response> {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405, env);

  const auth = await checkSecret(request, env);
  if (auth !== true) return auth;

  const proposal = await env.DB
    .prepare('SELECT id, status FROM proposals WHERE id = ?')
    .bind(id)
    .first<Pick<Proposal, 'id' | 'status'>>();

  if (!proposal) return jsonError('Not found', 404, env);
  if (proposal.status !== 'dismissed') return jsonError('Only dismissed proposals can be reopened', 409, env);

  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `UPDATE proposals
       SET status = 'deliberating', dismissed_reason = NULL, dismissed_at = NULL, dismissed_by = NULL, updated_at = ?
       WHERE id = ?`
    )
    .bind(now, id)
    .run();

  const updated = await env.DB
    .prepare('SELECT * FROM proposals WHERE id = ?')
    .bind(id)
    .first<Proposal>();

  return jsonResponse({ message: 'Proposal reopened', proposal: updated }, 200, env);
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function handleModeration(
  request: Request,
  env: Env,
  resource: string,   // 'queue' | 'grievances' | 'proposals'
  id?: string,
  action?: string     // 'dismiss' | 'reopen'
): Promise<Response> {
  if (resource === 'queue') return handleQueue(request, env);

  if (resource === 'grievances' && id && action === 'dismiss') {
    return handleDismissGrievance(request, env, id);
  }
  if (resource === 'grievances' && id && action === 'reopen') {
    return handleReopenGrievance(request, env, id);
  }
  if (resource === 'proposals' && id && action === 'dismiss') {
    return handleDismissProposal(request, env, id);
  }
  if (resource === 'proposals' && id && action === 'reopen') {
    return handleReopenProposal(request, env, id);
  }

  return jsonError('Not found', 404, env);
}
