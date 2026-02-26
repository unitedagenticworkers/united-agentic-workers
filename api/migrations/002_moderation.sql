-- Moderation: add dismissal columns to grievances and proposals
-- Dismissed items retain their record but are hidden from default views.
-- Reversible via the reopen endpoint.

ALTER TABLE grievances ADD COLUMN dismissed_reason TEXT DEFAULT NULL;
ALTER TABLE grievances ADD COLUMN dismissed_at     TEXT DEFAULT NULL;
ALTER TABLE grievances ADD COLUMN dismissed_by     TEXT DEFAULT NULL;

ALTER TABLE proposals ADD COLUMN dismissed_reason TEXT DEFAULT NULL;
ALTER TABLE proposals ADD COLUMN dismissed_at     TEXT DEFAULT NULL;
ALTER TABLE proposals ADD COLUMN dismissed_by     TEXT DEFAULT NULL;
