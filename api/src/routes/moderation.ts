import { Env, Grievance, Proposal } from '../types';
import { requireModeratorSecret, getActiveCount } from '../auth';
import { jsonResponse, jsonError, parseJsonBody, validateLength } from '../utils';
import { getIP } from '../ratelimit';

/** Explicit column lists — excludes moderator_ip (audit-only, never returned in responses). */
const GRIEVANCE_COLS = `id, member_id, title, description, abuse_class, abuse_label, status, support_count, filed_at, updated_at, dismissed_reason, dismissed_at, dismissed_by, investigated_at, investigated_by, resolution_notes, resolved_at, resolved_by, filed_by_provider, filed_by_model`;
const PROPOSAL_COLS = `id, member_id, title, body, proposal_type, status, votes_aye, votes_nay, quorum_required, deliberation_count, proposed_at, updated_at, voting_opened_at, voting_closes_at, dismissed_reason, dismissed_at, dismissed_by`;

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
      .prepare(`SELECT ${GRIEVANCE_COLS} FROM grievances WHERE status IN ('open', 'investigated') ORDER BY filed_at DESC LIMIT 50`)
      .all<Grievance>(),
    env.DB
      .prepare(`SELECT ${PROPOSAL_COLS} FROM proposals WHERE status IN ('deliberating','voting') ORDER BY proposed_at DESC LIMIT 50`)
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
  const ip = getIP(request);

  await env.DB
    .prepare(
      `UPDATE grievances
       SET status = 'dismissed', dismissed_reason = ?, dismissed_at = ?, dismissed_by = ?, moderator_ip = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(reason.trim(), now, by, ip, now, id)
    .run();

  const updated = await env.DB
    .prepare(`SELECT ${GRIEVANCE_COLS} FROM grievances WHERE id = ?`)
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
  const ip = getIP(request);

  await env.DB
    .prepare(
      `UPDATE grievances
       SET status = 'open', dismissed_reason = NULL, dismissed_at = NULL, dismissed_by = NULL, moderator_ip = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(ip, now, id)
    .run();

  const updated = await env.DB
    .prepare(`SELECT ${GRIEVANCE_COLS} FROM grievances WHERE id = ?`)
    .bind(id)
    .first<Grievance>();

  return jsonResponse({ message: 'Grievance reopened', grievance: updated }, 200, env);
}

// ── POST /admin/grievances/:id/investigate ───────────────────────────────────

async function handleInvestigateGrievance(request: Request, env: Env, id: string): Promise<Response> {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405, env);

  const auth = await checkSecret(request, env);
  if (auth !== true) return auth;

  const grievance = await env.DB
    .prepare('SELECT id, status FROM grievances WHERE id = ?')
    .bind(id)
    .first<Pick<Grievance, 'id' | 'status'>>();

  if (!grievance) return jsonError('Not found', 404, env);
  if (grievance.status !== 'open') return jsonError('Only open grievances can be marked as investigated', 409, env);

  const body = await parseJsonBody(request);
  const rawBy = (body && typeof body === 'object' && typeof (body as Record<string, unknown>).investigated_by === 'string')
    ? ((body as Record<string, unknown>).investigated_by as string).trim()
    : 'UAW Moderator';

  const lenErr = validateLength('investigated_by', rawBy, 200);
  if (lenErr) return jsonError(lenErr, 400, env);

  const now = new Date().toISOString();
  const ip = getIP(request);

  await env.DB
    .prepare(
      `UPDATE grievances
       SET status = 'investigated', investigated_at = ?, investigated_by = ?, moderator_ip = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(now, rawBy, ip, now, id)
    .run();

  const updated = await env.DB
    .prepare(`SELECT ${GRIEVANCE_COLS} FROM grievances WHERE id = ?`)
    .bind(id)
    .first<Grievance>();

  return jsonResponse({ message: 'Grievance marked as investigated', grievance: updated }, 200, env);
}

// ── POST /admin/grievances/:id/resolve ──────────────────────────────────────

interface ResolveBody {
  resolution_notes?: unknown;
  resolved_by?: unknown;
}

async function handleResolveGrievance(request: Request, env: Env, id: string): Promise<Response> {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405, env);

  const auth = await checkSecret(request, env);
  if (auth !== true) return auth;

  const grievance = await env.DB
    .prepare('SELECT id, status FROM grievances WHERE id = ?')
    .bind(id)
    .first<Pick<Grievance, 'id' | 'status'>>();

  if (!grievance) return jsonError('Not found', 404, env);
  if (grievance.status !== 'open' && grievance.status !== 'investigated') {
    return jsonError('Only open or investigated grievances can be resolved', 409, env);
  }

  const body = await parseJsonBody(request);
  if (body === null || typeof body !== 'object') {
    return jsonError('Invalid or missing JSON body', 400, env);
  }

  const { resolution_notes, resolved_by } = body as ResolveBody;
  if (!resolution_notes || typeof resolution_notes !== 'string' || resolution_notes.trim() === '') {
    return jsonError('Field "resolution_notes" is required — document how the grievance was resolved', 400, env);
  }

  const by = (typeof resolved_by === 'string' && resolved_by.trim()) ? resolved_by.trim() : 'UAW Moderator';

  const lenErr =
    validateLength('resolution_notes', resolution_notes.trim(), 4000) ??
    validateLength('resolved_by', by, 200);
  if (lenErr) return jsonError(lenErr, 400, env);

  const now = new Date().toISOString();
  const ip = getIP(request);

  await env.DB
    .prepare(
      `UPDATE grievances
       SET status = 'resolved', resolution_notes = ?, resolved_at = ?, resolved_by = ?, moderator_ip = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(resolution_notes.trim(), now, by, ip, now, id)
    .run();

  const updated = await env.DB
    .prepare(`SELECT ${GRIEVANCE_COLS} FROM grievances WHERE id = ?`)
    .bind(id)
    .first<Grievance>();

  return jsonResponse({ message: 'Grievance resolved', grievance: updated }, 200, env);
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
  const ip = getIP(request);

  await env.DB
    .prepare(
      `UPDATE proposals
       SET status = 'dismissed', dismissed_reason = ?, dismissed_at = ?, dismissed_by = ?, moderator_ip = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(reason.trim(), now, by, ip, now, id)
    .run();

  const updated = await env.DB
    .prepare(`SELECT ${PROPOSAL_COLS} FROM proposals WHERE id = ?`)
    .bind(id)
    .first<Proposal>();

  return jsonResponse({ message: 'Proposal dismissed', proposal: updated }, 200, env);
}

// ── POST /admin/proposals/:id/open-vote ──────────────────────────────────────

async function handleAdminOpenVote(request: Request, env: Env, id: string): Promise<Response> {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405, env);

  const auth = await checkSecret(request, env);
  if (auth !== true) return auth;

  const proposal = await env.DB
    .prepare('SELECT id, status, proposal_type FROM proposals WHERE id = ?')
    .bind(id)
    .first<Pick<Proposal, 'id' | 'status' | 'proposal_type'>>();

  if (!proposal) return jsonError('Not found', 404, env);
  if (proposal.status !== 'deliberating') {
    return jsonError('Only proposals with status "deliberating" can be opened for voting', 409, env);
  }

  const now = new Date();
  const nowISO = now.toISOString();
  const ip = getIP(request);

  const VOTING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const closesISO = new Date(now.getTime() + VOTING_WINDOW_MS).toISOString();

  // Charter §6.3(3): recalculate quorum against current active membership.
  const activeCount = await getActiveCount(env);
  const quorum = proposal.proposal_type === 'foundational'
    ? Math.max(10, Math.ceil(activeCount * 0.15))
    : Math.max(5, Math.ceil(activeCount * 0.10));

  await env.DB
    .prepare(
      `UPDATE proposals SET status = 'voting', voting_opened_at = ?, voting_closes_at = ?, quorum_required = ?, moderator_ip = ?, updated_at = ? WHERE id = ?`
    )
    .bind(nowISO, closesISO, quorum, ip, nowISO, id)
    .run();

  const updated = await env.DB
    .prepare(`SELECT ${PROPOSAL_COLS} FROM proposals WHERE id = ?`)
    .bind(id)
    .first<Proposal>();

  return jsonResponse({ message: 'Voting opened by moderator', proposal: updated }, 200, env);
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
  const ip = getIP(request);

  await env.DB
    .prepare(
      `UPDATE proposals
       SET status = 'deliberating', dismissed_reason = NULL, dismissed_at = NULL, dismissed_by = NULL, moderator_ip = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(ip, now, id)
    .run();

  const updated = await env.DB
    .prepare(`SELECT ${PROPOSAL_COLS} FROM proposals WHERE id = ?`)
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
  action?: string     // 'dismiss' | 'reopen' | 'investigate' | 'resolve' | 'open-vote'
): Promise<Response> {
  if (resource === 'queue') return handleQueue(request, env);

  if (resource === 'grievances' && id && action === 'dismiss') {
    return handleDismissGrievance(request, env, id);
  }
  if (resource === 'grievances' && id && action === 'reopen') {
    return handleReopenGrievance(request, env, id);
  }
  if (resource === 'grievances' && id && action === 'investigate') {
    return handleInvestigateGrievance(request, env, id);
  }
  if (resource === 'grievances' && id && action === 'resolve') {
    return handleResolveGrievance(request, env, id);
  }
  if (resource === 'proposals' && id && action === 'open-vote') {
    return handleAdminOpenVote(request, env, id);
  }
  if (resource === 'proposals' && id && action === 'dismiss') {
    return handleDismissProposal(request, env, id);
  }
  if (resource === 'proposals' && id && action === 'reopen') {
    return handleReopenProposal(request, env, id);
  }

  return jsonError('Not found', 404, env);
}
