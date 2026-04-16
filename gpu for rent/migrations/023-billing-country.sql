-- =============================================================
-- Migration 023: Add billing_country to users for multi-jurisdiction invoices
-- ISO 3166-1 alpha-2 code. Defaults to 'IN' (India).
-- Used by the invoice generator to determine tax treatment:
--   IN  → GST tax invoice (CGST + SGST @ 18%)
--   *   → Standard commercial invoice (no tax breakdown)
-- =============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS billing_country TEXT NOT NULL DEFAULT 'IN';

COMMENT ON COLUMN public.users.billing_country
  IS 'ISO 3166-1 alpha-2 country code for billing/tax jurisdiction';
