-- =============================================================
-- Atomic wallet credit function to prevent race conditions
-- Two concurrent webhooks can no longer read-then-write the same balance
-- =============================================================

CREATE OR REPLACE FUNCTION public.credit_wallet(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
AS $$
  UPDATE public.users
  SET wallet_balance_inr = wallet_balance_inr + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance_inr;
$$;

CREATE OR REPLACE FUNCTION public.debit_wallet(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
AS $$
  UPDATE public.users
  SET wallet_balance_inr = GREATEST(0, wallet_balance_inr - p_amount)
  WHERE id = p_user_id
  RETURNING wallet_balance_inr;
$$;
