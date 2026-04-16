-- =============================================================
-- Migration 022: Switch source-of-truth currency from INR to USD
-- All monetary columns renamed from *_inr to *_usd.
-- Razorpay still charges in INR; conversion happens at checkout/webhook.
-- Exchange rate: 1 USD = 85 INR (updated in application code).
-- =============================================================

-- ---- users table ----
ALTER TABLE public.users RENAME COLUMN wallet_balance_inr TO wallet_balance_usd;
ALTER TABLE public.users RENAME COLUMN auto_topup_amount_inr TO auto_topup_amount_usd;
ALTER TABLE public.users RENAME COLUMN auto_topup_threshold_inr TO auto_topup_threshold_usd;

-- ---- transactions table ----
ALTER TABLE public.transactions RENAME COLUMN amount_inr TO amount_usd;

-- ---- instances table ----
ALTER TABLE public.instances RENAME COLUMN total_cost_inr TO total_cost_usd;
ALTER TABLE public.instances RENAME COLUMN host_payout_inr TO host_payout_usd;
ALTER TABLE public.instances RENAME COLUMN platform_fee_inr TO platform_fee_usd;
ALTER TABLE public.instances RENAME COLUMN bid_price_inr TO bid_price_usd;

-- ---- rental_contracts table ----
ALTER TABLE public.rental_contracts RENAME COLUMN price_per_gpu_hr_inr TO price_per_gpu_hr_usd;
ALTER TABLE public.rental_contracts RENAME COLUMN storage_price_per_gb_month_inr TO storage_price_per_gb_month_usd;
ALTER TABLE public.rental_contracts RENAME COLUMN bandwidth_upload_price_per_gb_inr TO bandwidth_upload_price_per_gb_usd;
ALTER TABLE public.rental_contracts RENAME COLUMN bandwidth_download_price_per_gb_inr TO bandwidth_download_price_per_gb_usd;

-- ---- offers table ----
ALTER TABLE public.offers RENAME COLUMN price_per_gpu_hr_inr TO price_per_gpu_hr_usd;
ALTER TABLE public.offers RENAME COLUMN storage_price_per_gb_month_inr TO storage_price_per_gb_month_usd;
ALTER TABLE public.offers RENAME COLUMN bandwidth_upload_price_per_gb_inr TO bandwidth_upload_price_per_gb_usd;
ALTER TABLE public.offers RENAME COLUMN bandwidth_download_price_per_gb_inr TO bandwidth_download_price_per_gb_usd;
ALTER TABLE public.offers RENAME COLUMN interruptible_min_price_inr TO interruptible_min_price_usd;

-- ---- machines table ----
ALTER TABLE public.machines RENAME COLUMN price_per_hour_inr TO price_per_hour_usd;

-- ---- host_payouts table ----
ALTER TABLE public.host_payouts RENAME COLUMN amount_gross_inr TO amount_gross_usd;
ALTER TABLE public.host_payouts RENAME COLUMN tds_amount_inr TO tds_amount_usd;
ALTER TABLE public.host_payouts RENAME COLUMN platform_fee_inr TO platform_fee_usd;
ALTER TABLE public.host_payouts RENAME COLUMN net_amount_inr TO net_amount_usd;

-- ---- pending_topups table ----
ALTER TABLE public.pending_topups RENAME COLUMN amount_inr TO amount_usd;

-- ---- wallet_transactions table (if it exists) ----
DO $$ BEGIN
  ALTER TABLE public.wallet_transactions RENAME COLUMN amount_inr TO amount_usd;
EXCEPTION WHEN undefined_table THEN NULL;
          WHEN undefined_column THEN NULL;
END $$;


-- =============================================================
-- Recreate credit_wallet / debit_wallet with new column names
-- =============================================================
CREATE OR REPLACE FUNCTION public.credit_wallet(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
AS $$
  UPDATE public.users
  SET wallet_balance_usd = wallet_balance_usd + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance_usd;
$$;

CREATE OR REPLACE FUNCTION public.debit_wallet(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
AS $$
  UPDATE public.users
  SET wallet_balance_usd = GREATEST(0, wallet_balance_usd - p_amount)
  WHERE id = p_user_id
  RETURNING wallet_balance_usd;
$$;


-- =============================================================
-- Recreate process_billing() with new column names
-- =============================================================
CREATE OR REPLACE FUNCTION public.process_billing()
RETURNS void AS $$
DECLARE
  rec RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_minutes NUMERIC;
  v_gpu_cost NUMERIC;
  v_storage_cost NUMERIC;
  v_total_cost NUMERIC;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
  v_host_share NUMERIC;
  v_platform_share NUMERIC;
  v_fee_rate NUMERIC;
  v_hourly_rate NUMERIC;
BEGIN
  FOR rec IN
    SELECT
      i.id AS instance_id,
      i.status,
      i.renter_id,
      i.machine_id,
      i.disk_size_gb,
      i.last_billed_at,
      i.gpu_count AS instance_gpu_count,
      i.rental_type,
      i.bid_price_usd,
      i.rental_contract_id,
      rc.price_per_gpu_hr_usd AS contract_gpu_price,
      rc.storage_price_per_gb_month_usd AS contract_storage_price,
      rc.reserved_discount_factor AS contract_discount_factor,
      m.price_per_hour_usd AS legacy_price,
      m.storage_price_per_gb_hr AS legacy_storage_price,
      m.host_id
    FROM public.instances i
    LEFT JOIN public.rental_contracts rc ON rc.id = i.rental_contract_id
    LEFT JOIN public.machines m ON m.id = i.machine_id
    WHERE i.status IN ('running', 'stopped')
  LOOP
    v_minutes := EXTRACT(EPOCH FROM (v_now - rec.last_billed_at)) / 60.0;

    IF v_minutes < 1.0 THEN
      CONTINUE;
    END IF;

    IF rec.rental_contract_id IS NOT NULL AND rec.contract_gpu_price IS NOT NULL THEN
      IF rec.status = 'running' THEN
        IF rec.rental_type = 'interruptible' AND rec.bid_price_usd IS NOT NULL THEN
          v_gpu_cost := rec.bid_price_usd * COALESCE(rec.instance_gpu_count, 1);
        ELSIF rec.rental_type = 'reserved' AND rec.contract_discount_factor IS NOT NULL THEN
          v_gpu_cost := rec.contract_gpu_price * (1.0 - rec.contract_discount_factor) * COALESCE(rec.instance_gpu_count, 1);
        ELSE
          v_gpu_cost := rec.contract_gpu_price * COALESCE(rec.instance_gpu_count, 1);
        END IF;
      ELSE
        v_gpu_cost := 0;
      END IF;
      v_storage_cost := (rec.contract_storage_price * rec.disk_size_gb) / (30.0 * 24.0);
    ELSE
      IF rec.status = 'running' THEN
        v_gpu_cost := rec.legacy_price * COALESCE(rec.instance_gpu_count, 1);
      ELSE
        v_gpu_cost := 0;
      END IF;
      v_storage_cost := COALESCE(rec.legacy_storage_price, 0) * rec.disk_size_gb;
    END IF;

    v_total_cost := ((v_gpu_cost + v_storage_cost) * v_minutes) / 60.0;

    IF v_total_cost <= 0 THEN
      CONTINUE;
    END IF;

    SELECT wallet_balance_usd INTO v_balance
    FROM public.users
    WHERE id = rec.renter_id;

    IF v_balance IS NULL THEN
      CONTINUE;
    END IF;

    IF v_total_cost > v_balance THEN
      v_total_cost := v_balance;
    END IF;
    v_new_balance := v_balance - v_total_cost;

    v_fee_rate := 0.15;
    IF rec.host_id IS NOT NULL THEN
      SELECT tc.platform_fee_rate INTO v_fee_rate
        FROM public.tier_config tc
        JOIN public.users u ON u.provider_tier = tc.tier
        WHERE u.id = rec.host_id;
      IF v_fee_rate IS NULL THEN
        v_fee_rate := 0.15;
      END IF;
    END IF;

    v_platform_share := v_total_cost * v_fee_rate;
    v_host_share := v_total_cost - v_platform_share;

    UPDATE public.users
    SET wallet_balance_usd = v_new_balance
    WHERE id = rec.renter_id;

    UPDATE public.instances
    SET total_cost_usd = total_cost_usd + v_total_cost,
        host_payout_usd = host_payout_usd + v_host_share,
        platform_fee_usd = platform_fee_usd + v_platform_share,
        last_billed_at = v_now
    WHERE id = rec.instance_id;

    IF rec.host_id IS NOT NULL THEN
      UPDATE public.users
      SET wallet_balance_usd = wallet_balance_usd + v_host_share
      WHERE id = rec.host_id;
    END IF;

    INSERT INTO public.transactions (user_id, instance_id, amount_usd, type, status)
    VALUES (rec.renter_id, rec.instance_id, v_total_cost, 'auto_deduct', 'completed');

    IF rec.host_id IS NOT NULL THEN
      INSERT INTO public.transactions (user_id, instance_id, amount_usd, type, status)
      VALUES (rec.host_id, rec.instance_id, v_host_share, 'host_payout', 'completed');
    END IF;

    v_hourly_rate := v_gpu_cost + v_storage_cost;
    IF rec.status = 'running' AND v_hourly_rate > 0 THEN
      IF v_new_balance > 0 AND v_new_balance < (v_hourly_rate * 0.2) THEN
        UPDATE public.instances SET low_balance_alert = true WHERE id = rec.instance_id;
      ELSIF v_new_balance >= (v_hourly_rate * 0.2) THEN
        UPDATE public.instances SET low_balance_alert = false WHERE id = rec.instance_id;
      END IF;
    END IF;

    IF v_new_balance <= 0 AND rec.status = 'running' THEN
      UPDATE public.instances
      SET status = 'stopped', stopped_at = v_now
      WHERE id = rec.instance_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
