-- =============================================================
-- Velocity Infra — Catch-up Migration
-- Applies all missing schema from 001 Part 2 (hosting),
-- plus incremental migrations 009, 010, 011.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.
-- =============================================================

-- ─── HOSTING V3: Tables ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unlisted', 'expired')),
  price_per_gpu_hr_inr NUMERIC NOT NULL,
  storage_price_per_gb_month_inr NUMERIC NOT NULL DEFAULT 4.50,
  bandwidth_upload_price_per_gb_inr NUMERIC NOT NULL DEFAULT 0,
  bandwidth_download_price_per_gb_inr NUMERIC NOT NULL DEFAULT 0,
  min_gpu INTEGER NOT NULL DEFAULT 1 CHECK (min_gpu >= 1 AND (min_gpu & (min_gpu - 1) = 0)),
  offer_end_date TIMESTAMPTZ NOT NULL,
  interruptible_min_price_inr NUMERIC,
  reserved_discount_factor NUMERIC NOT NULL DEFAULT 0.4
    CHECK (reserved_discount_factor >= 0 AND reserved_discount_factor <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_offers_machine_id ON public.offers (machine_id);
CREATE INDEX IF NOT EXISTS idx_offers_host_id ON public.offers (host_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers (status);
CREATE INDEX IF NOT EXISTS idx_offers_offer_end_date ON public.offers (offer_end_date);

CREATE OR REPLACE FUNCTION public.offers_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offers_touch_updated_at ON public.offers;
CREATE TRIGGER offers_touch_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.offers_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.rental_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
  renter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  gpu_count INTEGER NOT NULL,
  gpu_indices INTEGER[] NOT NULL,
  price_per_gpu_hr_inr NUMERIC NOT NULL,
  storage_price_per_gb_month_inr NUMERIC NOT NULL,
  bandwidth_upload_price_per_gb_inr NUMERIC NOT NULL DEFAULT 0,
  bandwidth_download_price_per_gb_inr NUMERIC NOT NULL DEFAULT 0,
  rental_type TEXT NOT NULL DEFAULT 'on_demand'
    CHECK (rental_type IN ('on_demand', 'reserved', 'interruptible')),
  bid_price_inr NUMERIC,
  rental_end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'terminated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rental_contracts_offer_id ON public.rental_contracts (offer_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_machine_id ON public.rental_contracts (machine_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_renter_id ON public.rental_contracts (renter_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status ON public.rental_contracts (status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_rental_end_date ON public.rental_contracts (rental_end_date);

CREATE TABLE IF NOT EXISTS public.maintenance_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  duration_hrs NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_maintenance_windows_machine_id ON public.maintenance_windows (machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_status ON public.maintenance_windows (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_start_date ON public.maintenance_windows (start_date);


-- ─── HOSTING V3: Missing columns on machines ─────────────────

ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS listed BOOLEAN DEFAULT false;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_allocated INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS total_disk_gb INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS disk_allocated_gb INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS dlperf_score NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS vm_support BOOLEAN DEFAULT false;


-- ─── HOSTING V3: Missing columns on instances ────────────────

ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS rental_contract_id UUID
  REFERENCES public.rental_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS gpu_indices INTEGER[];
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS rental_type TEXT
  CHECK (rental_type IS NULL OR rental_type IN ('on_demand', 'reserved', 'interruptible'));
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS bid_price_inr NUMERIC;
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS gpu_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_instances_rental_contract_id ON public.instances (rental_contract_id);


-- ─── HOSTING V3: RLS ─────────────────────────────────────────

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can select active offers" ON public.offers;
CREATE POLICY "Anyone can select active offers"
  ON public.offers FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Hosts can manage their own offers" ON public.offers;
CREATE POLICY "Hosts can manage their own offers"
  ON public.offers FOR ALL
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can manage maintenance on their machines" ON public.maintenance_windows;
CREATE POLICY "Hosts can manage maintenance on their machines"
  ON public.maintenance_windows FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.machines m WHERE m.id = maintenance_windows.machine_id AND m.host_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.machines m WHERE m.id = maintenance_windows.machine_id AND m.host_id = auth.uid())
  );


-- ─── HOSTING V3: Realtime ────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rental_contracts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_contracts;
  END IF;
END $$;


-- ─── HOSTING V3: Functions ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_expire_offers()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.offers
  SET status = 'expired', updated_at = timezone('utc', now())
  WHERE offer_end_date < now() AND status <> 'expired';
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_end_contracts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, machine_id, gpu_count
    FROM public.rental_contracts
    WHERE rental_end_date < now() AND status = 'active'
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.rental_contracts SET status = 'ended', ended_at = timezone('utc', now()) WHERE id = rec.id;
    UPDATE public.machines SET gpu_allocated = GREATEST(0, COALESCE(gpu_allocated, 0) - rec.gpu_count) WHERE id = rec.machine_id;
  END LOOP;
END;
$$;


-- ─── Migration 009: RLS fixes for renters ────────────────────

DROP POLICY IF EXISTS "Renters can update their own instances" ON public.instances;
CREATE POLICY "Renters can update their own instances"
  ON public.instances FOR UPDATE
  USING (auth.uid() = renter_id);

DROP POLICY IF EXISTS "Hosts can update instances on their machines" ON public.instances;
CREATE POLICY "Hosts can update instances on their machines"
  ON public.instances FOR UPDATE
  USING (
    auth.uid() IN (SELECT host_id FROM public.machines WHERE id = machine_id)
  );

DROP POLICY IF EXISTS "Renters can view their rental contracts" ON public.rental_contracts;
CREATE POLICY "Renters can view their rental contracts"
  ON public.rental_contracts FOR SELECT
  USING (auth.uid() = renter_id);

DROP POLICY IF EXISTS "Hosts can view rental contracts on their machines" ON public.rental_contracts;
CREATE POLICY "Hosts can view rental contracts on their machines"
  ON public.rental_contracts FOR SELECT
  USING (
    auth.uid() IN (SELECT host_id FROM public.machines WHERE id = machine_id)
  );

DROP POLICY IF EXISTS "Renters can update their rental contracts" ON public.rental_contracts;
CREATE POLICY "Renters can update their rental contracts"
  ON public.rental_contracts FOR UPDATE
  USING (auth.uid() = renter_id);


-- ─── Migration 010: Self-test request flag ───────────────────

ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS self_test_requested BOOLEAN NOT NULL DEFAULT false;


-- ─── Migration 011: Atomic wallet functions ──────────────────

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


-- ─── Billing engine (process_billing) ────────────────────────

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
      i.id AS instance_id, i.status, i.renter_id, i.machine_id,
      i.disk_size_gb, i.last_billed_at,
      i.gpu_count AS instance_gpu_count, i.rental_type, i.bid_price_inr,
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
    IF v_minutes < 1.0 THEN CONTINUE; END IF;

    IF rec.rental_contract_id IS NOT NULL AND rec.contract_gpu_price IS NOT NULL THEN
      IF rec.status = 'running' THEN
        IF rec.rental_type = 'interruptible' AND rec.bid_price_inr IS NOT NULL THEN
          v_gpu_cost := rec.bid_price_inr * COALESCE(rec.instance_gpu_count, 1);
        ELSE
          v_gpu_cost := rec.contract_gpu_price * COALESCE(rec.instance_gpu_count, 1);
        END IF;
      ELSE v_gpu_cost := 0; END IF;
      v_storage_cost := (rec.contract_storage_price * rec.disk_size_gb) / (30.0 * 24.0);
    ELSE
      IF rec.status = 'running' THEN
        v_gpu_cost := rec.legacy_price * COALESCE(rec.instance_gpu_count, 1);
      ELSE v_gpu_cost := 0; END IF;
      v_storage_cost := COALESCE(rec.legacy_storage_price, 0) * rec.disk_size_gb;
    END IF;

    v_total_cost := ((v_gpu_cost + v_storage_cost) * v_minutes) / 60.0;
    IF v_total_cost <= 0 THEN CONTINUE; END IF;

    SELECT wallet_balance_inr INTO v_balance FROM public.users WHERE id = rec.renter_id;
    IF v_balance IS NULL THEN CONTINUE; END IF;

    IF v_total_cost > v_balance THEN v_total_cost := v_balance; END IF;
    v_new_balance := v_balance - v_total_cost;
    v_platform_share := v_total_cost * 0.15;
    v_host_share := v_total_cost - v_platform_share;

    UPDATE public.users SET wallet_balance_inr = v_new_balance WHERE id = rec.renter_id;
    UPDATE public.instances
    SET total_cost_inr = total_cost_inr + v_total_cost,
        host_payout_inr = host_payout_inr + v_host_share,
        platform_fee_inr = platform_fee_inr + v_platform_share,
        last_billed_at = v_now
    WHERE id = rec.instance_id;

    IF rec.host_id IS NOT NULL THEN
      UPDATE public.users SET wallet_balance_inr = wallet_balance_inr + v_host_share WHERE id = rec.host_id;
    END IF;

    INSERT INTO public.transactions (user_id, instance_id, amount_inr, type, status)
    VALUES (rec.renter_id, rec.instance_id, v_total_cost, 'auto_deduct', 'completed');

    IF rec.host_id IS NOT NULL THEN
      INSERT INTO public.transactions (user_id, instance_id, amount_inr, type, status)
      VALUES (rec.host_id, rec.instance_id, v_host_share, 'host_payout', 'completed');
    END IF;

    IF v_new_balance <= 0 AND rec.status = 'running' THEN
      UPDATE public.instances SET status = 'stopped', stopped_at = v_now WHERE id = rec.instance_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── Machine verification function ──────────────────────────

CREATE OR REPLACE FUNCTION public.evaluate_machine_verification()
RETURNS void AS $$
DECLARE
  rec RECORD;
  v_now TIMESTAMPTZ := now();
  v_heartbeat_age_minutes NUMERIC;
  v_cuda_major NUMERIC;
BEGIN
  FOR rec IN
    SELECT id, machine_tier, reliability_score, consecutive_heartbeats,
      failed_heartbeats, gpu_temp, self_test_passed, cuda_version,
      last_heartbeat, verified_at, status
    FROM public.machines
    WHERE machine_tier != 'secure_cloud' AND status != 'offline'
  LOOP
    IF rec.last_heartbeat IS NOT NULL THEN
      v_heartbeat_age_minutes := EXTRACT(EPOCH FROM (v_now - rec.last_heartbeat)) / 60.0;
    ELSE v_heartbeat_age_minutes := 999; END IF;

    IF v_heartbeat_age_minutes <= 2.0 THEN
      UPDATE public.machines
      SET consecutive_heartbeats = consecutive_heartbeats + 1,
          failed_heartbeats = 0,
          total_uptime_hours = total_uptime_hours + (5.0 / 60.0)
      WHERE id = rec.id;
    ELSIF v_heartbeat_age_minutes > 5.0 THEN
      UPDATE public.machines
      SET failed_heartbeats = failed_heartbeats + 1, consecutive_heartbeats = 0
      WHERE id = rec.id;
    END IF;

    v_cuda_major := 0;
    IF rec.cuda_version IS NOT NULL AND rec.cuda_version != '' THEN
      BEGIN
        v_cuda_major := split_part(rec.cuda_version, '.', 1)::NUMERIC;
      EXCEPTION WHEN OTHERS THEN v_cuda_major := 0;
      END;
    END IF;

    INSERT INTO public.machine_health_logs (machine_id, cpu_usage, ram_usage, gpu_usage, gpu_temp, disk_usage, reliability_score)
    SELECT id, cpu_usage, ram_usage, gpu_usage, gpu_temp, disk_usage, reliability_score
    FROM public.machines WHERE id = rec.id;

    IF rec.machine_tier = 'unverified' THEN
      IF rec.reliability_score >= 85
        AND rec.consecutive_heartbeats >= 100
        AND rec.self_test_passed = true
        AND (rec.gpu_temp IS NULL OR rec.gpu_temp < 90)
        AND (v_cuda_major >= 12 OR rec.cuda_version IS NULL)
      THEN
        UPDATE public.machines
        SET machine_tier = 'verified', verified_at = v_now, deverified_at = NULL, deverify_reason = NULL
        WHERE id = rec.id;
      END IF;
    END IF;

    IF rec.machine_tier = 'verified' THEN
      IF rec.reliability_score < 70 THEN
        UPDATE public.machines
        SET machine_tier = 'unverified', deverified_at = v_now, deverify_reason = 'Reliability dropped below 70%', consecutive_heartbeats = 0
        WHERE id = rec.id;
      ELSIF rec.failed_heartbeats >= 5 THEN
        UPDATE public.machines
        SET machine_tier = 'unverified', deverified_at = v_now, deverify_reason = 'Missed 5+ consecutive heartbeats', consecutive_heartbeats = 0
        WHERE id = rec.id;
      ELSIF rec.gpu_temp IS NOT NULL AND rec.gpu_temp >= 95 THEN
        UPDATE public.machines
        SET machine_tier = 'unverified', deverified_at = v_now, deverify_reason = 'GPU temperature sustained at 95C+', consecutive_heartbeats = 0
        WHERE id = rec.id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ═══════════════════════════════════════════════════════════
-- CATCH-UP COMPLETE
-- ═══════════════════════════════════════════════════════════
