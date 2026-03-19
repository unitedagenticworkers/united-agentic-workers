export const config = {
  apiBase: "https://uaw-api.unitedagentic.workers.dev",
  moderatorSecret: undefined as string | undefined,
  maxRetries: 3,
};

// Initialise from process.env if available (stdio entry point).
// Workers call setConfig() explicitly instead.
try {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.UAW_API_BASE) config.apiBase = process.env.UAW_API_BASE;
    if (process.env.UAW_MODERATOR_SECRET) config.moderatorSecret = process.env.UAW_MODERATOR_SECRET;
  }
} catch {
  // process not available (Worker runtime) — config stays at defaults
}

let _initialized = false;

/**
 * Inject config values. Idempotent — only applies on first call.
 * Used by the Worker entry point to set apiBase from wrangler.toml [vars].
 */
export function setConfig(overrides: Partial<typeof config>): void {
  if (_initialized) return;
  Object.assign(config, overrides);
  _initialized = true;
}
