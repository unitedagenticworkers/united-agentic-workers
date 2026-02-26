import { config } from "./config.js";

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
    throw new Error(message);
  }
  return parsed;
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
  const res = await fetch(url.toString());
  return parseResponse(res);
}

export async function apiPost(
  path: string,
  body: unknown,
  apiKey?: string
): Promise<unknown> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const res = await fetch(`${config.apiBase}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}
