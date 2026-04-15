-- =============================================================
-- Velocity Infra - Auto-Top-Up & Pending Topups Migration
-- Run after 002-api-keys.sql
-- =============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auto_topup_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_topup_amount_inr NUMERIC(12,2) DEFAULT 500,
  ADD COLUMN IF NOT EXISTS auto_topup_threshold_inr NUMERIC(12,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;

CREATE TABLE IF NOT EXISTS public.pending_topups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_inr NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  razorpay_payment_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_topups_status ON public.pending_topups(status);
CREATE INDEX IF NOT EXISTS idx_pending_topups_user ON public.pending_topups(user_id);

ALTER TABLE public.pending_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pending topups" ON public.pending_topups;
CREATE POLICY "Users can view their own pending topups"
  ON public.pending_topups FOR SELECT USING (auth.uid() = user_id);
