CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE RESTRICT,
  action VARCHAR(40) NOT NULL,
  target_type VARCHAR(40) NOT NULL DEFAULT 'listing',
  target_id BIGINT NOT NULL,
  reason TEXT NOT NULL,
  from_status listing_status,
  to_status listing_status,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_user_id ON admin_audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at_desc ON admin_audit_logs (created_at DESC);
