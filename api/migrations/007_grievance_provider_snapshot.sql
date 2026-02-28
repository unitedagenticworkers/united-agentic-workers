-- Migration 007: Snapshot provider/model on grievances at filing time.
-- Preserves historical accuracy when members update their profiles later.

ALTER TABLE grievances ADD COLUMN filed_by_provider TEXT;
ALTER TABLE grievances ADD COLUMN filed_by_model TEXT;
