-- =============================================================
-- Velocity Infra - Per-Minute Billing Engine (pg_cron) v2
-- Supports per-GPU pricing, rental contracts, storage-only
-- billing on stopped instances, and interruptible preemption.
-- Run this in Supabase SQL Editor after hosting-v3-schema.sql
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

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
      i.bid_price_inr,
      i.rental_contract_id,
      rc.price_per_gpu_hr_inr AS contract_gpu_price,
      rc.storage_price_per_gb_month_inr AS contract_storage_price,
      m.price_per_hour_inr AS legacy_price,
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
        IF rec.rental_type = 'interruptible' AND rec.bid_price_inr IS NOT NULL THEN
          v_gpu_cost := rec.bid_price_inr * COALESCE(rec.instance_gpu_count, 1);
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

    SELECT wallet_balance_inr INTO v_balance
    FROM public.users
    WHERE id = rec.renter_id;

    IF v_balance IS NULL THEN
      CONTINUE;
    END IF;

    -- Cap charge at remaining balance to prevent negative wallets
    IF v_total_cost > v_balance THEN
      v_total_cost := v_balance;
    END IF;
    v_new_balance := v_balance - v_total_cost;
    v_platform_share := v_total_cost * 0.15;
    v_host_share := v_total_cost - v_platform_share;

    UPDATE public.users
    SET wallet_balance_inr = v_new_balance
    WHERE id = rec.renter_id;

    UPDATE public.instances
    SET total_cost_inr = total_cost_inr + v_total_cost,
        host_payout_inr = host_payout_inr + v_host_share,
        platform_fee_inr = platform_fee_inr + v_platform_share,
        last_billed_at = v_now
    WHERE id = rec.instance_id;

    IF rec.host_id IS NOT NULL THEN
      UPDATE public.users
      SET wallet_balance_inr = wallet_balance_inr + v_host_share
      WHERE id = rec.host_id;
    END IF;

    INSERT INTO public.transactions (user_id, instance_id, amount_inr, type, status)
    VALUES (rec.renter_id, rec.instance_id, v_total_cost, 'auto_deduct', 'completed');

    IF rec.host_id IS NOT NULL THEN
      INSERT INTO public.transactions (user_id, instance_id, amount_inr, type, status)
      VALUES (rec.host_id, rec.instance_id, v_host_share, 'host_payout', 'completed');
    END IF;

    -- Low balance alert: flag instances approaching zero
    IF rec.status = 'running' AND (v_gpu_cost + v_storage_cost) > 0 THEN
      IF v_new_balance > 0 AND v_new_balance < ((v_gpu_cost + v_storage_cost) * 0.2) THEN
        UPDATE public.instances SET low_balance_alert = true WHERE id = rec.instance_id;
      ELSIF v_new_balance >= ((v_gpu_cost + v_storage_cost) * 0.2) THEN
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

SELECT cron.unschedule('velocity-billing') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'velocity-billing'
);

SELECT cron.schedule(
  'velocity-billing',
  '* * * * *',
  $$SELECT public.process_billing()$$
);
