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
