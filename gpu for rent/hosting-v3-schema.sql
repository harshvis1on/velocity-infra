-- =============================================================
-- Hosting V3 — Vast-style incremental migration (Supabase / Postgres)
-- Safe to re-run: IF NOT EXISTS, DROP CONSTRAINT IF EXISTS where needed
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. OFFERS (per-machine listing / pricing)
-- ─────────────────────────────────────────────
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
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offers_touch_updated_at ON public.offers;
CREATE TRIGGER offers_touch_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.offers_touch_updated_at();

-- ─────────────────────────────────────────────
-- 2. RENTAL CONTRACTS
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 3. MAINTENANCE WINDOWS
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 4. ALTER public.machines
-- ─────────────────────────────────────────────
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS listed BOOLEAN DEFAULT false;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_allocated INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS total_disk_gb INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS disk_allocated_gb INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS dlperf_score NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS vm_support BOOLEAN DEFAULT false;

ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_status_check;
ALTER TABLE public.machines ADD CONSTRAINT machines_status_check
  CHECK (status IN ('available', 'rented', 'offline', 'maintenance'));

-- ─────────────────────────────────────────────
-- 5. ALTER public.instances (after rental_contracts exists)
-- ─────────────────────────────────────────────
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS rental_contract_id UUID
  REFERENCES public.rental_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS gpu_indices INTEGER[];
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS rental_type TEXT
  CHECK (rental_type IS NULL OR rental_type IN ('on_demand', 'reserved', 'interruptible'));
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS bid_price_inr NUMERIC;
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS tunnel_url TEXT;
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS gpu_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_instances_rental_contract_id ON public.instances (rental_contract_id);

-- ─────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY — offers
-- ─────────────────────────────────────────────
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can select active offers" ON public.offers;
CREATE POLICY "Anyone can select active offers"
  ON public.offers FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Hosts can manage their own offers" ON public.offers;
CREATE POLICY "Hosts can manage their own offers"
  ON public.offers FOR ALL
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- ─────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY — rental_contracts
-- ─────────────────────────────────────────────
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Renters can view their rental contracts" ON public.rental_contracts;
CREATE POLICY "Renters can view their rental contracts"
  ON public.rental_contracts FOR SELECT
  USING (auth.uid() = renter_id);

DROP POLICY IF EXISTS "Hosts can view contracts on their machines" ON public.rental_contracts;
CREATE POLICY "Hosts can view contracts on their machines"
  ON public.rental_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = rental_contracts.machine_id
        AND m.host_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY — maintenance_windows
-- ─────────────────────────────────────────────
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can manage maintenance on their machines" ON public.maintenance_windows;
CREATE POLICY "Hosts can manage maintenance on their machines"
  ON public.maintenance_windows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = maintenance_windows.machine_id
        AND m.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = maintenance_windows.machine_id
        AND m.host_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 9. Realtime publication
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rental_contracts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_contracts;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 10. Cron helpers: expire offers & end contracts
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_expire_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.offers
  SET
    status = 'expired',
    updated_at = timezone('utc', now())
  WHERE offer_end_date < now()
    AND status <> 'expired';
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_end_contracts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, machine_id, gpu_count
    FROM public.rental_contracts
    WHERE rental_end_date < now()
      AND status = 'active'
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.rental_contracts
    SET
      status = 'ended',
      ended_at = timezone('utc', now())
    WHERE id = rec.id;

    UPDATE public.machines
    SET gpu_allocated = GREATEST(0, COALESCE(gpu_allocated, 0) - rec.gpu_count)
    WHERE id = rec.machine_id;
  END LOOP;
END;
$$;

-- Requires pg_cron (same pattern as billing-cron.sql)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('hosting-v3-expire-offers')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hosting-v3-expire-offers');

SELECT cron.schedule(
  'hosting-v3-expire-offers',
  '* * * * *',
  $$SELECT public.auto_expire_offers()$$
);

SELECT cron.unschedule('hosting-v3-end-contracts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hosting-v3-end-contracts');

SELECT cron.schedule(
  'hosting-v3-end-contracts',
  '* * * * *',
  $$SELECT public.auto_end_contracts()$$
);
