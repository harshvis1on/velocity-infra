-- =============================================================
-- Velocity Infra - Host Payouts with TDS Migration
-- =============================================================

CREATE TABLE IF NOT EXISTS public.host_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES public.users(id),
  amount_gross_inr NUMERIC(12,2) NOT NULL,
  tds_amount_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount_inr NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payout_method TEXT DEFAULT 'bank_transfer',
  payout_ref TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_host_payouts_host ON public.host_payouts(host_id);
CREATE INDEX IF NOT EXISTS idx_host_payouts_status ON public.host_payouts(status);

ALTER TABLE public.host_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can view their own payouts" ON public.host_payouts;
CREATE POLICY "Hosts can view their own payouts"
  ON public.host_payouts FOR SELECT USING (auth.uid() = host_id);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
