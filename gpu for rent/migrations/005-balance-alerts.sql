-- =============================================================
-- Velocity Infra - Low Balance Alert Column
-- =============================================================

ALTER TABLE public.instances
  ADD COLUMN IF NOT EXISTS low_balance_alert BOOLEAN NOT NULL DEFAULT false;
