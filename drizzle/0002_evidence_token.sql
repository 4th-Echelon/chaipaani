-- Per-report secret so only the original reporter can attach UPI evidence.
-- Stores sha256(token); the token itself is shown to the reporter once.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_token_hash text;
