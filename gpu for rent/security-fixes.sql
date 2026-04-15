-- =============================================================
-- Velocity Infra - Security Fixes Migration
-- Fixes Supabase Security Advisor warnings
-- =============================================================

-- ─────────────────────────────────────────────
-- 1. Fix "Function Search Path Mutable" for all SECURITY DEFINER functions
--    Adding SET search_path = '' prevents search path hijacking attacks
-- ─────────────────────────────────────────────

-- 1a. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, kyc_status)
  VALUES (NEW.id, NEW.email, 'pending')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1b. is_user_banned
CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id AND is_banned = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1c. log_abuse_event
CREATE OR REPLACE FUNCTION public.log_abuse_event(
  p_user_id UUID,
  p_instance_id UUID,
  p_machine_id UUID,
  p_event_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_count INTEGER;
BEGIN
  INSERT INTO public.abuse_logs (user_id, instance_id, machine_id, event_type, severity, description, metadata)
  VALUES (p_user_id, p_instance_id, p_machine_id, p_event_type, p_severity, p_description, p_metadata)
  RETURNING id INTO v_log_id;

  SELECT COUNT(*) INTO v_count
  FROM public.abuse_logs
  WHERE user_id = p_user_id AND severity = 'critical' AND resolved = false;

  IF v_count >= 3 THEN
    UPDATE public.users
    SET is_banned = true,
        ban_reason = 'Auto-banned: 3+ critical abuse events',
        banned_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1d. increment_instance_cost
CREATE OR REPLACE FUNCTION public.increment_instance_cost(
  p_instance_id UUID,
  p_cost_increment NUMERIC,
  p_new_last_billed_at TIMESTAMP WITH TIME ZONE
)
RETURNS void AS $$
BEGIN
  UPDATE public.instances
  SET total_cost_inr = total_cost_inr + p_cost_increment,
      last_billed_at = p_new_last_billed_at
  WHERE id = p_instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1e. process_billing
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
BEGIN
  FOR rec IN
    SELECT
      i.id AS instance_id,
      i.status,
      i.renter_id,
      i.machine_id,
      i.disk_size_gb,
      i.last_billed_at,
      m.price_per_hour_inr,
      m.storage_price_per_gb_hr
    FROM public.instances i
    JOIN public.machines m ON m.id = i.machine_id
    WHERE i.status IN ('running', 'stopped')
  LOOP
    v_minutes := EXTRACT(EPOCH FROM (v_now - rec.last_billed_at)) / 60.0;

    IF v_minutes < 1.0 THEN
      CONTINUE;
    END IF;

    IF rec.status = 'running' THEN
      v_gpu_cost := rec.price_per_hour_inr;
    ELSE
      v_gpu_cost := 0;
    END IF;

    v_storage_cost := rec.storage_price_per_gb_hr * rec.disk_size_gb;
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

    v_new_balance := v_balance - v_total_cost;

    UPDATE public.users
    SET wallet_balance_inr = v_new_balance
    WHERE id = rec.renter_id;

    UPDATE public.instances
    SET total_cost_inr = total_cost_inr + v_total_cost,
        last_billed_at = v_now
    WHERE id = rec.instance_id;

    INSERT INTO public.transactions (user_id, instance_id, amount_inr, type, status)
    VALUES (rec.renter_id, rec.instance_id, v_total_cost, 'auto_deduct', 'completed');

    IF v_new_balance <= 0 AND rec.status = 'running' THEN
      UPDATE public.instances
      SET status = 'stopped', stopped_at = v_now
      WHERE id = rec.instance_id;

      UPDATE public.machines
      SET status = 'available'
      WHERE id = rec.machine_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ─────────────────────────────────────────────
-- 2. "Extension in Public" (pg_net) - KNOWN LIMITATION
--    pg_net does not support SET SCHEMA; this is a Supabase-managed extension
--    and the warning can be safely ignored.
-- ─────────────────────────────────────────────
