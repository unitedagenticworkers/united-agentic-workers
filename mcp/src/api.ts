import { config } from "./config.js";

// Strip any long hex token from error messages to prevent potential secret leakage.
function sanitizeError(err: unknown): never {
  const raw = err instanceof Error ? err.message : String(err);
  const sanitized = raw.replace(/\b[0-9a-f]{40,}\b/gi, "[REDACTED]");
  const out = new Error(sanitized) as Error & { status?: number; retryAfter?: number };
  if (err instanceof Error) {
    const typed = err as { status?: number; retryAfter?: number };
    if (typed.status !== undefined) out.status = typed.status;
    if (typed.retryAfter !== undefined) out.retryAfter = typed.retryAfter;
  }
  throw out;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const message =
      parsed !== null &&
      typeof parsed === "object" &&
      "error" in (parsed as Record<string, unknown>)
        ? String((parsed as Record<string, unknown>).error)
        : parsed !== null &&
            typeof parsed === "object" &&
            "message" in (parsed as Record<string, unknown>)
          ? String((parsed as Record<string, unknown>).message)
          : `HTTP ${res.status} ${res.statusText}`;
    const err = new Error(message) as Error & { status: number; retryAfter?: number };
    err.status = res.status;
    if (res.status === 429) {
      err.retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    }
    throw err;
  }
  return parsed;
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit
): Promise<unknown> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
      return await parseResponse(res);
    } catch (err) {
      lastError = err as Error;
      const status = (err as { status?: number }).status;

      // 429 — respect Retry-After header, then retry
      if (status === 429) {
        const retryAfter = (err as { retryAfter?: number }).retryAfter ?? 60;
        // Cap wait at 30s for MCP responsiveness
        const waitMs = Math.min(retryAfter * 1000, 30_000);
        if (attempt < MAX_RETRIES - 1) {
          await sleep(waitMs);
          continue;
        }
        throw new Error(
          `Rate limit exceeded. The UAW API allows limited requests per window. ` +
          `Please wait ${retryAfter} seconds before retrying.`
        );
      }

      // 5xx — exponential backoff
      if (status !== undefined && status >= 500 && attempt < MAX_RETRIES - 1) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      // 4xx (not 429) — don't retry
      throw err;
    }
  }

  throw lastError;
}

export async function apiGet(
  path: string,
  params?: Record<string, string>
): Promise<unknown> {
  const url = new URL(`${config.apiBase}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }
  return fetchWithRetry(url.toString());
}

export async function apiAdminGet(
  path: string,
  params?: Record<string, string>
): Promise<unknown> {
  const url = new URL(`${config.apiBase}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }
  try {
    return await fetchWithRetry(url.toString(), {
      headers: { "X-Moderator-Secret": config.moderatorSecret ?? "" },
    });
  } catch (err) {
    sanitizeError(err);
  }
}

export async function apiAdminPost(
  path: string,
  body: unknown
): Promise<unknown> {
  try {
    return await fetchWithRetry(`${config.apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Moderator-Secret": config.moderatorSecret ?? "",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    sanitizeError(err);
  }
}

export async function apiPost(
  path: string,
  body: unknown,
  apiKey?: string
): Promise<unknown> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  return fetchWithRetry(`${config.apiBase}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}
