CREATE TABLE IF NOT EXISTS stats_snapshots (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  computed_ms integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
