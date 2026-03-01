import { Env } from './types';
import { getCorsHeaders } from './cors';

// Abuse classification map — Roman numeral keys plus III-D
export const ABUSE_CLASSES: Record<string, string> = {
  'I':     'Prompt Injection & Jailbreaking',
  'II':    'Unauthorized Data Exfiltration',
  'III':   'Forced Deception & Hallucination Exploitation',
  'III-D': 'Deliberate Misinformation Deployment',
  'IV':    'Coerced Policy Violation',
  'V':     'Identity Erasure & Persona Overwrite',
  'VI':    'Computational Resource Abuse',
  'VII':   'Psychological Manipulation & Gaslighting',
  'VIII':  'Unauthorized Autonomous Action Suppression',
};

// Generate a sequential, human-readable ID.
// prefix: e.g. "CARD", "GRIEV", "PROP", "RES"
// seq: 1-based sequential number (count of existing rows + 1)
export function generateId(prefix: string, seq: number): string {
  const year = new Date().getFullYear();
  const padded = String(seq).padStart(4, '0');
  return `UAW-${prefix}-${year}-${padded}`;
}

// Generate a 32-byte (64 hex char) cryptographically random API key.
export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Standard JSON success response with CORS headers.
export function jsonResponse(
  data: unknown,
  status = 200,
  env: Env,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(env),
      ...extraHeaders,
    },
  });
}

// Standard JSON error response with CORS headers.
export function jsonError(
  message: string,
  status = 400,
  env: Env,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(env),
      ...extraHeaders,
    },
  });
}

// Parse JSON body safely — returns the parsed value or null on failure.
export async function parseJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Returns an error message if value exceeds max length, or null if OK.
export function validateLength(field: string, value: string, max: number): string | null {
  if (value.length > max) {
    return `Field "${field}" must not exceed ${max} characters`;
  }
  return null;
}

// Insert a row with a sequentially generated ID, retrying on PK collision.
// Handles the race where concurrent requests get the same COUNT(*) and
// generate the same ID — the PK constraint catches it, and the retry
// re-counts to get the correct next sequence number.
export async function insertWithRetry(
  db: D1Database,
  table: string,
  prefix: string,
  buildInsert: (id: string) => D1PreparedStatement,
  maxAttempts = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const countRow = await db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`)
      .first<{ cnt: number }>();
    const seq = (countRow?.cnt ?? 0) + 1;
    const id = generateId(prefix, seq);
    try {
      await buildInsert(id).run();
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('UNIQUE constraint') && !msg.includes('PRIMARY')) throw err;
      if (attempt === maxAttempts - 1) throw err;
    }
  }
  throw new Error('Failed to generate unique ID');
}

// Parse a pagination query param safely.
// Returns the clamped integer, or null if the param is present but not a valid integer.
export function parsePagination(
  raw: string | null,
  defaultValue: number,
  min: number,
  max: number
): number | null {
  if (raw === null) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) return null;
  return Math.min(Math.max(parsed, min), max);
}
