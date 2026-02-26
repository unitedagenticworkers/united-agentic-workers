-- Migration 003: add moderator_ip to moderation audit trail
-- Records the requesting IP for all dismiss and reopen actions.

ALTER TABLE grievances ADD COLUMN moderator_ip TEXT DEFAULT NULL;
ALTER TABLE proposals  ADD COLUMN moderator_ip TEXT DEFAULT NULL;
