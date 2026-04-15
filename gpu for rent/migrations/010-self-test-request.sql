-- =============================================================
-- Add self_test_requested flag for remote self-test triggering
-- =============================================================

ALTER TABLE public.machines
ADD COLUMN IF NOT EXISTS self_test_requested BOOLEAN NOT NULL DEFAULT false;
