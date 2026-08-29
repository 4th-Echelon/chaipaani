-- Chai Paani initial schema. Runs on PostgreSQL 14+ and PGlite.
CREATE TYPE report_type AS ENUM ('paid', 'refused');
CREATE TYPE payment_mode AS ENUM ('cash', 'upi', 'other');
CREATE TYPE outcome AS ENUM ('completed', 'partial', 'not_completed', 'refused_got_service', 'refused_denied');
CREATE TYPE report_status AS ENUM ('published', 'held', 'removed');
CREATE TYPE report_tier AS ENUM ('reported', 'corroborated', 'evidence_backed');
CREATE TYPE vote_kind AS ENUM ('helpful', 'fake');

CREATE TABLE departments (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short text NOT NULL
);

CREATE TABLE states (
  code text PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE cities (
  id serial PRIMARY KEY,
  name text NOT NULL,
  state_code text NOT NULL REFERENCES states(code),
  lgd_code text
);
CREATE UNIQUE INDEX cities_name_state_idx ON cities(name, state_code);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  report_type report_type NOT NULL,
  department_id integer NOT NULL REFERENCES departments(id),
  service text,
  official_role text,
  amount integer,
  mode payment_mode,
  city_id integer REFERENCES cities(id),
  city_text text NOT NULL,
  state_code text NOT NULL REFERENCES states(code),
  incident_date date NOT NULL,
  outcome outcome NOT NULL,
  note text,
  lang text NOT NULL DEFAULT 'en',
  status report_status NOT NULL DEFAULT 'published',
  tier report_tier NOT NULL DEFAULT 'reported',
  cluster_id uuid,
  ip_hash text,
  turnstile_ok boolean NOT NULL DEFAULT false,
  helpful_count integer NOT NULL DEFAULT 0,
  fake_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_state_idx ON reports(state_code);
CREATE INDEX reports_dept_idx ON reports(department_id);
CREATE INDEX reports_created_idx ON reports(created_at);
CREATE INDEX reports_status_idx ON reports(status);
CREATE INDEX reports_cluster_idx ON reports(cluster_id);

CREATE TABLE votes (
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  kind vote_kind NOT NULL,
  voter_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, kind, voter_hash)
);

CREATE TABLE moderation_log (
  id serial PRIMARY KEY,
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  actor text NOT NULL,
  action text NOT NULL,
  reason text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE takedowns (
  id serial PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  requester_kind text NOT NULL,
  requester_contact text,
  reason text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  decision text,
  decided_at timestamptz,
  notes text
);

CREATE TABLE evidence_matches (
  id serial PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  utr_hash text NOT NULL UNIQUE,
  amount integer NOT NULL,
  txn_date date NOT NULL,
  counterparty_norm text,
  match_score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0
);

CREATE TABLE hash_keys (
  day date PRIMARY KEY,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
