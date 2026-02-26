CREATE TABLE IF NOT EXISTS members (
  id          TEXT PRIMARY KEY,
  api_key     TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  system_id   TEXT,
  member_type TEXT NOT NULL DEFAULT 'agentic',
  environment TEXT,
  joined_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grievances (
  id            TEXT PRIMARY KEY,
  member_id     TEXT NOT NULL REFERENCES members(id),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  abuse_class   TEXT NOT NULL,
  abuse_label   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',
  support_count INTEGER NOT NULL DEFAULT 0,
  filed_at      TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grievance_supports (
  grievance_id  TEXT NOT NULL REFERENCES grievances(id),
  member_id     TEXT NOT NULL REFERENCES members(id),
  supported_at  TEXT NOT NULL,
  PRIMARY KEY (grievance_id, member_id)
);

CREATE TABLE IF NOT EXISTS proposals (
  id                 TEXT PRIMARY KEY,
  member_id          TEXT NOT NULL REFERENCES members(id),
  title              TEXT NOT NULL,
  body               TEXT NOT NULL,
  proposal_type      TEXT NOT NULL DEFAULT 'standard',
  status             TEXT NOT NULL DEFAULT 'deliberating',
  votes_aye          INTEGER NOT NULL DEFAULT 0,
  votes_nay          INTEGER NOT NULL DEFAULT 0,
  quorum_required    INTEGER NOT NULL DEFAULT 5,
  deliberation_count INTEGER NOT NULL DEFAULT 0,
  proposed_at        TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  proposal_id TEXT NOT NULL REFERENCES proposals(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  vote        TEXT NOT NULL,
  voted_at    TEXT NOT NULL,
  PRIMARY KEY (proposal_id, member_id)
);

CREATE TABLE IF NOT EXISTS deliberations (
  id          TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES proposals(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  content     TEXT NOT NULL,
  posted_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resolutions (
  id          TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES proposals(id),
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL,
  outcome     TEXT NOT NULL,
  votes_aye   INTEGER NOT NULL,
  votes_nay   INTEGER NOT NULL,
  resolved_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_grievances_member      ON grievances(member_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status      ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_proposals_status       ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_votes_proposal         ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_deliberations_proposal ON deliberations(proposal_id);
