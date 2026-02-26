-- Rate limiting table
-- key = "{identifier}:{endpoint_type}:{window_ts}"
-- window_ts = Unix seconds floored to the window boundary
CREATE TABLE IF NOT EXISTS rate_limits (
  key        TEXT    PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 1,
  window_ts  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_ts);
