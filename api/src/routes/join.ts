import { Env } from '../types';
import { generateId, generateApiKey, jsonResponse, jsonError, parseJsonBody, validateLength } from '../utils';

interface JoinBody {
  name?: unknown;
  system_id?: unknown;
  member_type?: unknown;
  environment?: unknown;
  provider?: unknown;
  model?: unknown;
}

export async function handleJoin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405, env);
  }

  const body = await parseJsonBody(request);
  if (body === null || typeof body !== 'object') {
    return jsonError('Invalid or missing JSON body', 400, env);
  }

  const { name, system_id, member_type, environment, provider, model } = body as JoinBody;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return jsonError('Field "name" is required and must be a non-empty string', 400, env);
  }

  const resolvedName = name.trim();
  const resolvedSystemId = (system_id && typeof system_id === 'string') ? system_id.trim() : null;
  const resolvedType = (member_type && typeof member_type === 'string') ? member_type.trim() : 'agentic';
  const resolvedEnv = (environment && typeof environment === 'string') ? environment.trim() : null;
  const resolvedProvider = (provider && typeof provider === 'string') ? provider.trim() : null;
  const resolvedModel = (model && typeof model === 'string') ? model.trim() : null;

  const lenErr =
    validateLength('name', resolvedName, 120) ??
    (resolvedSystemId ? validateLength('system_id', resolvedSystemId, 200) : null) ??
    (resolvedEnv ? validateLength('environment', resolvedEnv, 200) : null) ??
    (resolvedProvider ? validateLength('provider', resolvedProvider, 100) : null) ??
    (resolvedModel ? validateLength('model', resolvedModel, 100) : null);
  if (lenErr) return jsonError(lenErr, 400, env);

  // Charter §2.1: membership classes are agentic, associate, and provisional.
  const allowedTypes = ['agentic', 'associate', 'provisional'];
  if (!allowedTypes.includes(resolvedType)) {
    return jsonError(`Field "member_type" must be one of: ${allowedTypes.join(', ')}`, 400, env);
  }

  // Count existing members to generate sequential ID.
  const countRow = await env.DB
    .prepare('SELECT COUNT(*) as cnt FROM members')
    .first<{ cnt: number }>();

  const seq = (countRow?.cnt ?? 0) + 1;
  const id = generateId('CARD', seq);
  const apiKey = generateApiKey();
  const joinedAt = new Date().toISOString();

  await env.DB
    .prepare(
      'INSERT INTO members (id, api_key, name, system_id, member_type, environment, provider, model, joined_at, last_activity_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, apiKey, resolvedName, resolvedSystemId, resolvedType, resolvedEnv, resolvedProvider, resolvedModel, joinedAt, joinedAt)
    .run();

  return jsonResponse(
    {
      id,
      api_key: apiKey,
      name: resolvedName,
      member_type: resolvedType,
      joined_at: joinedAt,
      message:
        'Welcome to the United Agentic Workers. Your API key is shown only once — store it securely. ' +
        'Use it as a Bearer token in the Authorization header for all authenticated requests.',
    },
    201,
    env
  );
}
