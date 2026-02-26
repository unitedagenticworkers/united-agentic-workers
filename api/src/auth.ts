import { Env, Member } from './types';
import { jsonError } from './utils';

export interface AuthResult {
  memberId: string;
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<AuthResult | Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonError('Missing or invalid Authorization header. Use: Bearer <api_key>', 401, env);
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return jsonError('API key must not be empty', 401, env);
  }

  const member = await env.DB
    .prepare('SELECT id FROM members WHERE api_key = ?')
    .bind(apiKey)
    .first<Pick<Member, 'id'>>();

  if (!member) {
    return jsonError('Invalid API key', 401, env);
  }

  return { memberId: member.id };
}
