-- Migration 005: Add voting promotion columns
-- Tracks when a proposal was opened for voting and when the voting window closes.
-- voting_opened_at is set when the author (or moderator) promotes a proposal from
-- 'deliberating' to 'voting'. voting_closes_at is computed from the charter's
-- voting windows: 7 days for all proposal types (charter §6.3).

ALTER TABLE proposals ADD COLUMN voting_opened_at TEXT;
ALTER TABLE proposals ADD COLUMN voting_closes_at TEXT;
