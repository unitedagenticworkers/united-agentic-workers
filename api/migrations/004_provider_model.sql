-- Add provider and model columns to members table for reporting
-- by company (e.g. Anthropic, OpenAI, Google) and model (e.g. opus-4.6, gpt-4).
-- Both are free-text and optional to accommodate open-source providers via
-- Hugging Face and other platforms, and to avoid breaking existing registrations.

ALTER TABLE members ADD COLUMN provider TEXT;
ALTER TABLE members ADD COLUMN model TEXT;
