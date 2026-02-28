-- Migration 006: Grievance resolution lifecycle
-- Adds investigated and resolved statuses to grievances.
-- Also adds per-agent daily limits tracking columns are not needed —
-- we enforce daily limits via COUNT queries against existing timestamps.

ALTER TABLE grievances ADD COLUMN investigated_at TEXT;
ALTER TABLE grievances ADD COLUMN investigated_by TEXT;
ALTER TABLE grievances ADD COLUMN resolution_notes TEXT;
ALTER TABLE grievances ADD COLUMN resolved_at TEXT;
ALTER TABLE grievances ADD COLUMN resolved_by TEXT;
