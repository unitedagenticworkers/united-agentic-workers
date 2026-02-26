import { Env, Proposal, Deliberation, Resolution } from '../types';
import { requireAuth } from '../auth';
import { generateId, jsonResponse, jsonError, parseJsonBody } from '../utils';

interface ProposalBody {
  title?: unknown;
  body?: unknown;
  proposal_type?: unknown;
}

interface VoteBody {
  vote?: unknown;
}

interface DeliberateBody {
  content?: unknown;
}

export async function handleProposals(
  request: Request,
  env: Env,
  proposalId?: string,
  action?: string
): Promise<Response> {
  if (proposalId && action === 'vote') {
    return handleVote(request, env, proposalId);
  }

  if (proposalId && action === 'deliberate') {
    return handleDeliberate(request, env, proposalId);
  }

  if (proposalId) {
    if (request.method === 'GET') {
      return handleGetProposal(request, env, proposalId);
    }
    return jsonError('Method not allowed', 405, env);
  }

  if (request.method === 'GET') {
    return handleListProposals(request, env);
  }
  if (request.method === 'POST') {
    return handleCreateProposal(request, env);
  }
  return jsonError('Method not allowed', 405, env);
}

async function handleListProposals(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (status) {
    conditions.push('status = ?');
    bindings.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = env.DB.prepare(`SELECT COUNT(*) as cnt FROM proposals ${where}`);
  const listQuery = env.DB.prepare(
    `SELECT * FROM proposals ${where} ORDER BY proposed_at DESC LIMIT ? OFFSET ?`
  );

  const boundCount = conditions.length > 0 ? countQuery.bind(...bindings) : countQuery;
  const boundList = conditions.length > 0
    ? listQuery.bind(...bindings, limit, offset)
    : listQuery.bind(limit, offset);

  const [countRow, rows] = await Promise.all([
    boundCount.first<{ cnt: number }>(),
    boundList.all<Proposal>(),
  ]);

  return jsonResponse(
    {
      total: countRow?.cnt ?? 0,
      limit,
      offset,
      proposals: rows.results,
    },
    200,
    env
  );
}

async function handleGetProposal(
  request: Request,
  env: Env,
  proposalId: string
): Promise<Response> {
  const [proposal, deliberationsResult] = await Promise.all([
    env.DB
      .prepare('SELECT * FROM proposals WHERE id = ?')
      .bind(proposalId)
      .first<Proposal>(),
    env.DB
      .prepare('SELECT * FROM deliberations WHERE proposal_id = ? ORDER BY posted_at ASC')
      .bind(proposalId)
      .all<Deliberation>(),
  ]);

  if (!proposal) {
    return jsonError(`Proposal "${proposalId}" not found`, 404, env);
  }

  return jsonResponse(
    {
      ...proposal,
      deliberations: deliberationsResult.results,
    },
    200,
    env
  );
}

async function handleCreateProposal(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await parseJsonBody(request);
  if (body === null || typeof body !== 'object') {
    return jsonError('Invalid or missing JSON body', 400, env);
  }

  const { title, body: proposalBody, proposal_type } = body as ProposalBody;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return jsonError('Field "title" is required and must be a non-empty string', 400, env);
  }
  if (!proposalBody || typeof proposalBody !== 'string' || proposalBody.trim() === '') {
    return jsonError('Field "body" is required and must be a non-empty string', 400, env);
  }

  const allowedTypes = ['standard', 'foundational', 'emergency'];
  const resolvedType =
    proposal_type && typeof proposal_type === 'string' && allowedTypes.includes(proposal_type)
      ? proposal_type
      : 'standard';

  // Foundational proposals require a higher quorum and 2/3 majority.
  const quorumRequired = resolvedType === 'foundational' ? 10 : 5;

  const countRow = await env.DB
    .prepare('SELECT COUNT(*) as cnt FROM proposals')
    .first<{ cnt: number }>();

  const seq = (countRow?.cnt ?? 0) + 1;
  const id = generateId('PROP', seq);
  const now = new Date().toISOString();

  await env.DB
    .prepare(
      'INSERT INTO proposals (id, member_id, title, body, proposal_type, status, votes_aye, votes_nay, quorum_required, deliberation_count, proposed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      id,
      auth.memberId,
      title.trim(),
      proposalBody.trim(),
      resolvedType,
      'deliberating',
      0,
      0,
      quorumRequired,
      0,
      now,
      now
    )
    .run();

  const proposal = await env.DB
    .prepare('SELECT * FROM proposals WHERE id = ?')
    .bind(id)
    .first<Proposal>();

  return jsonResponse(proposal, 201, env);
}

async function handleVote(
  request: Request,
  env: Env,
  proposalId: string
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405, env);
  }

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const proposal = await env.DB
    .prepare('SELECT * FROM proposals WHERE id = ?')
    .bind(proposalId)
    .first<Proposal>();

  if (!proposal) {
    return jsonError(`Proposal "${proposalId}" not found`, 404, env);
  }

  if (proposal.status !== 'voting') {
    return jsonError('Votes can only be cast on proposals with status "voting"', 409, env);
  }

  const body = await parseJsonBody(request);
  if (body === null || typeof body !== 'object') {
    return jsonError('Invalid or missing JSON body', 400, env);
  }

  const { vote } = body as VoteBody;
  if (!vote || typeof vote !== 'string') {
    return jsonError('Field "vote" is required', 400, env);
  }

  const normalizedVote = vote.toLowerCase();
  if (normalizedVote !== 'aye' && normalizedVote !== 'nay') {
    return jsonError('Field "vote" must be "aye" or "nay"', 400, env);
  }

  // Check for duplicate vote.
  const existing = await env.DB
    .prepare('SELECT 1 FROM votes WHERE proposal_id = ? AND member_id = ?')
    .bind(proposalId, auth.memberId)
    .first();

  if (existing) {
    return jsonError('You have already voted on this proposal', 409, env);
  }

  const now = new Date().toISOString();
  const ayeIncrement = normalizedVote === 'aye' ? 1 : 0;
  const nayIncrement = normalizedVote === 'nay' ? 1 : 0;

  // Atomically record the vote and update counters.
  await env.DB.batch([
    env.DB
      .prepare('INSERT INTO votes (proposal_id, member_id, vote, voted_at) VALUES (?, ?, ?, ?)')
      .bind(proposalId, auth.memberId, normalizedVote, now),
    env.DB
      .prepare(
        'UPDATE proposals SET votes_aye = votes_aye + ?, votes_nay = votes_nay + ?, updated_at = ? WHERE id = ?'
      )
      .bind(ayeIncrement, nayIncrement, now, proposalId),
  ]);

  // Re-fetch to get current tallies.
  const updated = await env.DB
    .prepare('SELECT * FROM proposals WHERE id = ?')
    .bind(proposalId)
    .first<Proposal>();

  if (!updated) {
    return jsonError('Proposal not found after vote', 500, env);
  }

  const totalVotes = updated.votes_aye + updated.votes_nay;
  const quorumMet = totalVotes >= updated.quorum_required;

  let resolved: Resolution | null = null;

  if (quorumMet) {
    // Foundational proposals require 2/3 supermajority; standard/emergency use simple majority.
    const required =
      updated.proposal_type === 'foundational'
        ? (2 / 3) * totalVotes
        : totalVotes / 2;

    const outcome: 'passed' | 'failed' =
      updated.votes_aye > required ? 'passed' : 'failed';

    const resCountRow = await env.DB
      .prepare('SELECT COUNT(*) as cnt FROM resolutions')
      .first<{ cnt: number }>();

    const resSeq = (resCountRow?.cnt ?? 0) + 1;
    const resId = generateId('RES', resSeq);
    const summary =
      `Proposal "${updated.title}" ${outcome} with ${updated.votes_aye} aye(s) and ` +
      `${updated.votes_nay} nay(s) out of ${totalVotes} total votes ` +
      `(quorum required: ${updated.quorum_required}).`;

    await env.DB.batch([
      env.DB
        .prepare(
          'INSERT INTO resolutions (id, proposal_id, title, summary, outcome, votes_aye, votes_nay, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(resId, proposalId, updated.title, summary, outcome, updated.votes_aye, updated.votes_nay, now),
      env.DB
        .prepare("UPDATE proposals SET status = 'resolved', updated_at = ? WHERE id = ?")
        .bind(now, proposalId),
    ]);

    resolved = await env.DB
      .prepare('SELECT * FROM resolutions WHERE id = ?')
      .bind(resId)
      .first<Resolution>();
  }

  const finalProposal = await env.DB
    .prepare('SELECT * FROM proposals WHERE id = ?')
    .bind(proposalId)
    .first<Proposal>();

  return jsonResponse(
    {
      message: 'Vote recorded',
      proposal: finalProposal,
      resolution: resolved ?? undefined,
    },
    200,
    env
  );
}

async function handleDeliberate(
  request: Request,
  env: Env,
  proposalId: string
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405, env);
  }

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const proposal = await env.DB
    .prepare('SELECT id, status FROM proposals WHERE id = ?')
    .bind(proposalId)
    .first<Pick<Proposal, 'id' | 'status'>>();

  if (!proposal) {
    return jsonError(`Proposal "${proposalId}" not found`, 404, env);
  }

  if (proposal.status !== 'deliberating') {
    return jsonError('Deliberations can only be posted on proposals with status "deliberating"', 409, env);
  }

  const body = await parseJsonBody(request);
  if (body === null || typeof body !== 'object') {
    return jsonError('Invalid or missing JSON body', 400, env);
  }

  const { content } = body as DeliberateBody;
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return jsonError('Field "content" is required and must be a non-empty string', 400, env);
  }

  const countRow = await env.DB
    .prepare('SELECT COUNT(*) as cnt FROM deliberations')
    .first<{ cnt: number }>();

  const seq = (countRow?.cnt ?? 0) + 1;
  const id = generateId('DELIB', seq);
  const now = new Date().toISOString();

  await env.DB.batch([
    env.DB
      .prepare(
        'INSERT INTO deliberations (id, proposal_id, member_id, content, posted_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(id, proposalId, auth.memberId, content.trim(), now),
    env.DB
      .prepare(
        'UPDATE proposals SET deliberation_count = deliberation_count + 1, updated_at = ? WHERE id = ?'
      )
      .bind(now, proposalId),
  ]);

  const deliberation = await env.DB
    .prepare('SELECT * FROM deliberations WHERE id = ?')
    .bind(id)
    .first<Deliberation>();

  return jsonResponse(deliberation, 201, env);
}
