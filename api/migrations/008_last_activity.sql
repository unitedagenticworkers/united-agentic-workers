-- Migration 008: Track last governance activity for active membership calculation
-- Charter §6.6 defines "active member" as having taken a governance action within
-- the preceding 90-day rolling window. Quorum (§6.3) is calculated against active
-- membership count, not total membership.

ALTER TABLE members ADD COLUMN last_activity_at TEXT;
UPDATE members SET last_activity_at = joined_at WHERE last_activity_at IS NULL;
