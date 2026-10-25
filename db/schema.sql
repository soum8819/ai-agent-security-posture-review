-- Review state for the reviewer app (step 10, slice B). Safe to run more than
-- once: every statement creates only what does not exist yet.
-- Run: npm run db:setup

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY,
  submitter_id text NOT NULL,
  profile_id text NOT NULL,
  profile jsonb NOT NULL,
  status text NOT NULL CHECK (status IN (
    'queued', 'reviewing', 'awaiting_appsec', 'awaiting_model_risk',
    'approved', 'rejected', 'changes_requested', 'routed_to_committee', 'failed'
  )),
  rule_tier int CHECK (rule_tier BETWEEN 1 AND 4),
  reviewer_tier int CHECK (reviewer_tier BETWEEN 1 AND 4),
  checker_tier int CHECK (checker_tier BETWEEN 1 AND 4),
  final_tier int CHECK (final_tier BETWEEN 1 AND 4),
  final_tier_set_by text[],
  contested_count int NOT NULL DEFAULT 0,
  workflow_run_id text,
  error text,
  supersedes uuid REFERENCES reviews (id),
  environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Daily submission limit: count a user's reviews since a given time.
CREATE INDEX IF NOT EXISTS reviews_submitter_created ON reviews (submitter_id, created_at);

-- The full saved result of the two models, one per review.
CREATE TABLE IF NOT EXISTS review_results (
  review_id uuid PRIMARY KEY REFERENCES reviews (id),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One decision per review and stage: a second decision for the same stage is
-- refused by the database, even if two people click at the same moment.
CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews (id),
  stage text NOT NULL CHECK (stage IN ('appsec', 'model_risk')),
  decider_id text NOT NULL,
  decider_role text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('approved', 'rejected', 'changes_requested')),
  note text NOT NULL CHECK (length(trim(note)) > 0),
  contested_resolutions jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Whether the paused workflow run was resumed, or had already expired.
  workflow_resume text,
  environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, stage)
);

-- Append-only audit trail. The app only ever inserts here; the triggers below
-- make the database refuse any update, delete or truncate.
CREATE TABLE IF NOT EXISTS audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  review_id uuid REFERENCES reviews (id),
  actor_id text,
  actor_role text,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_review ON audit_events (review_id, created_at);

CREATE OR REPLACE FUNCTION audit_events_refuse_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_events_no_update_delete ON audit_events;

CREATE TRIGGER audit_events_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_refuse_change();

DROP TRIGGER IF EXISTS audit_events_no_truncate ON audit_events;

CREATE TRIGGER audit_events_no_truncate
  BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_refuse_change();
