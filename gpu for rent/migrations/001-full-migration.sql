-- =============================================================
-- Velocity Infra - Full Production Migration
-- Consolidates ALL schema files in correct dependency order.
-- Paste this entire file into Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- and click "Run".
--
-- ORDER:
--   1. schema-v2.sql       (base tables, drops old ones)
--   2. hosting-v3-schema   (offers, contracts, maintenance)
--   3. serverless-schema   (endpoints, workergroups, workers)
--   4. security-migration  (KYC, abuse logs, rate limits)
--   5. verification-system (machine health, auto-promote)
--   6. security-fixes      (fix search_path on all functions)
--   7. billing-cron        (per-minute billing engine)
-- =============================================================

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  PART 1: BASE SCHEMA (schema-v2.sql)                     ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.instances    CASCADE;
DROP TABLE IF EXISTS public.rentals      CASCADE;
DROP TABLE IF EXISTS public.templates    CASCADE;
DROP TABLE IF EXISTS public.ssh_keys     CASCADE;
DROP TABLE IF EXISTS public.machines     CASCADE;
DROP TABLE IF EXISTS public.users        CASCADE;

CREATE TABLE public.users (
  id                UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email             TEXT NOT NULL,
  role              TEXT CHECK (role IN ('host', 'renter', 'admin')) DEFAULT 'renter',
  company_name      TEXT,
  gstin             TEXT,
  kyc_status        TEXT DEFAULT 'pending',
  wallet_balance_inr NUMERIC DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.ssh_keys (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  public_key        TEXT NOT NULL,
  fingerprint       TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.machines (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  gpu_model         TEXT NOT NULL,
  gpu_count         INTEGER DEFAULT 1,
  vram_gb           INTEGER NOT NULL,
  vcpu_count        INTEGER NOT NULL,
  ram_gb            INTEGER NOT NULL,
  storage_gb        INTEGER NOT NULL,
  location          TEXT DEFAULT 'India',
  status            TEXT CHECK (status IN ('available', 'rented', 'offline', 'maintenance')) DEFAULT 'offline',
  price_per_hour_inr NUMERIC NOT NULL,
  min_gpu           INTEGER DEFAULT 1,
  offer_end_date    TIMESTAMP WITH TIME ZONE,
  storage_price_per_gb_hr NUMERIC DEFAULT 0.00014,
  bandwidth_price_per_tb  NUMERIC DEFAULT 0,
  machine_tier      TEXT CHECK (machine_tier IN ('unverified', 'verified', 'secure_cloud')) DEFAULT 'unverified',
  cached_images     TEXT[],
  public_ip         TEXT,
  last_heartbeat    TIMESTAMP WITH TIME ZONE,
  daemon_version    TEXT,
  reliability_score NUMERIC DEFAULT 60.0,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.templates (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  label          TEXT NOT NULL,
  docker_image   TEXT NOT NULL,
  description    TEXT,
  launch_mode    TEXT CHECK (launch_mode IN ('ssh', 'jupyter', 'entrypoint')) DEFAULT 'ssh',
  onstart_script TEXT,
  env_vars       JSONB DEFAULT '{}'::jsonb,
  is_recommended BOOLEAN DEFAULT false,
  category       TEXT CHECK (category IN ('ml', 'diffusion', 'robotics', 'base')) DEFAULT 'base',
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

INSERT INTO public.templates (name, label, docker_image, description, launch_mode, is_recommended, category) VALUES
  ('pytorch',  'PyTorch 2.2',        'runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04', 'JupyterLab, PyTorch 2.2, CUDA 12.1, Python 3.10', 'jupyter', true,  'ml'),
  ('sd',       'Stable Diffusion',   'runpod/stable-diffusion:web-ui-1.0.0',                     'Automatic1111 WebUI, pre-configured',              'jupyter', true,  'diffusion'),
  ('isaac',    'Nvidia Isaac Sim',   'nvcr.io/nvidia/isaac-sim:2023.1.1',                        'Physical AI & Robotics Simulation',                'jupyter', false, 'robotics'),
  ('ubuntu',   'Base Ubuntu 22.04',  'nvidia/cuda:12.2.2-devel-ubuntu22.04',                     'Clean Ubuntu 22.04 with CUDA 12.2',               'ssh',     true,  'base')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE public.instances (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  renter_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  machine_id     UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  status         TEXT CHECK (status IN ('creating', 'loading', 'running', 'stopped', 'destroyed', 'error')) DEFAULT 'creating',
  disk_size_gb   INTEGER NOT NULL DEFAULT 10,
  launch_mode    TEXT CHECK (launch_mode IN ('ssh', 'jupyter', 'entrypoint', 'both')) DEFAULT 'ssh',
  ssh_public_key TEXT,
  docker_image   TEXT,
  container_id   TEXT,
  host_port      INTEGER,
  ssh_password   TEXT,
  total_cost_inr  NUMERIC DEFAULT 0,
  host_payout_inr NUMERIC DEFAULT 0,
  platform_fee_inr NUMERIC DEFAULT 0,
  last_billed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  stopped_at     TIMESTAMP WITH TIME ZONE,
  destroyed_at   TIMESTAMP WITH TIME ZONE,
  ended_at       TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.transactions (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES public.users(id) ON DELETE CASCADE,
  instance_id           UUID REFERENCES public.instances(id) ON DELETE SET NULL,
  amount_inr            NUMERIC NOT NULL,
  type                  TEXT CHECK (type IN ('credit', 'deposit', 'withdrawal', 'rental_charge', 'host_payout', 'auto_deduct')),
  razorpay_payment_id   TEXT,
  reference_id          TEXT,
  gst_percentage        NUMERIC DEFAULT 18.0,
  gst_amount            NUMERIC DEFAULT 0,
  igst_amount           NUMERIC DEFAULT 0,
  cgst_amount           NUMERIC DEFAULT 0,
  sgst_amount           NUMERIC DEFAULT 0,
  invoice_url           TEXT,
  status                TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ssh_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can manage their own ssh keys"
  ON public.ssh_keys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view available machines"
  ON public.machines FOR SELECT USING (status = 'available');
CREATE POLICY "Hosts can manage their own machines"
  ON public.machines FOR ALL USING (auth.uid() = host_id);
CREATE POLICY "Users can view their own instances"
  ON public.instances FOR SELECT
  USING (
    auth.uid() = renter_id
    OR auth.uid() IN (SELECT host_id FROM public.machines WHERE id = machine_id)
  );
CREATE POLICY "Renters can create instances"
  ON public.instances FOR INSERT WITH CHECK (auth.uid() = renter_id);
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read templates"
  ON public.templates FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, kyc_status)
  VALUES (NEW.id, NEW.email, 'pending')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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

ALTER PUBLICATION supabase_realtime ADD TABLE public.instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  PART 2: HOSTING V3 (offers, contracts, maintenance)     ║
-- ╚═══════════════════════════════════════════════════════════╝

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

ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS listed BOOLEAN DEFAULT false;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_allocated INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS total_disk_gb INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS disk_allocated_gb INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS dlperf_score NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS vm_support BOOLEAN DEFAULT false;

ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS rental_contract_id UUID
  REFERENCES public.rental_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS gpu_indices INTEGER[];
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS rental_type TEXT
  CHECK (rental_type IS NULL OR rental_type IN ('on_demand', 'reserved', 'interruptible'));
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS bid_price_inr NUMERIC;
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS tunnel_url TEXT;
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS gpu_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_instances_rental_contract_id ON public.instances (rental_contract_id);

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

DROP POLICY IF EXISTS "Renters can view their rental contracts" ON public.rental_contracts;
CREATE POLICY "Renters can view their rental contracts"
  ON public.rental_contracts FOR SELECT USING (auth.uid() = renter_id);

DROP POLICY IF EXISTS "Hosts can view contracts on their machines" ON public.rental_contracts;
CREATE POLICY "Hosts can view contracts on their machines"
  ON public.rental_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = rental_contracts.machine_id AND m.host_id = auth.uid()
    )
  );

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


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  PART 3: SERVERLESS (endpoints, workergroups, workers)   ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    max_workers INTEGER NOT NULL DEFAULT 16,
    min_load INTEGER NOT NULL DEFAULT 1,
    min_workers INTEGER NOT NULL DEFAULT 5,
    cold_mult DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    min_cold_load DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    target_util DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    inactivity_timeout INTEGER,
    max_queue_time DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    target_queue_time DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'scaling_down', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.workergroups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES public.endpoints(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    gpu_ram INTEGER NOT NULL DEFAULT 24,
    search_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    launch_args TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workergroup_id UUID NOT NULL REFERENCES public.workergroups(id) ON DELETE CASCADE,
    instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
    state TEXT NOT NULL DEFAULT 'recruiting' CHECK (state IN ('recruiting', 'loading', 'ready', 'active', 'inactive', 'releasing', 'destroyed')),
    perf_rating DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    current_load DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    queue_time DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_metrics_at TIMESTAMP WITH TIME ZONE,
    worker_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.endpoint_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES public.endpoints(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'routed', 'completed', 'failed', 'timeout')),
    load_cost DOUBLE PRECISION,
    latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_endpoints_user_id ON public.endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_workergroups_endpoint_id ON public.workergroups(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_workers_workergroup_id ON public.workers(workergroup_id);
CREATE INDEX IF NOT EXISTS idx_workers_instance_id ON public.workers(instance_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_requests_endpoint_id ON public.endpoint_requests(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_requests_worker_id ON public.endpoint_requests(worker_id);

ALTER TABLE public.endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workergroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endpoint_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own endpoints" ON public.endpoints
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own endpoints" ON public.endpoints
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own endpoints" ON public.endpoints
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own endpoints" ON public.endpoints
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view workergroups for their endpoints" ON public.workergroups
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert workergroups for their endpoints" ON public.workergroups
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));
CREATE POLICY "Users can update workergroups for their endpoints" ON public.workergroups
    FOR UPDATE USING (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete workergroups for their endpoints" ON public.workergroups
    FOR DELETE USING (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));

CREATE POLICY "Users can view workers for their workergroups" ON public.workers
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.workergroups wg
        JOIN public.endpoints e ON wg.endpoint_id = e.id
        WHERE wg.id = workergroup_id AND e.user_id = auth.uid()
    ));

CREATE POLICY "Users can view requests for their endpoints" ON public.endpoint_requests
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  PART 4: SECURITY & KYC (security-migration.sql)         ║
-- ╚═══════════════════════════════════════════════════════════╝

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pan_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS aadhaar_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS aadhaar_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_tier TEXT CHECK (kyc_tier IN ('none', 'phone_verified', 'id_verified', 'enterprise')) DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_state TEXT;

CREATE TABLE IF NOT EXISTS public.abuse_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  event_type TEXT CHECK (event_type IN (
    'port_scan', 'ddos_attempt', 'crypto_mining', 'spam_attempt',
    'container_escape', 'excessive_bandwidth', 'blocked_port_access',
    'suspicious_process', 'manual_report',
    'high_egress', 'gpu_crypto_mining'
  )) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  action_taken TEXT CHECK (action_taken IN (
    'logged', 'warned', 'container_killed', 'account_suspended', 'account_banned'
  )) DEFAULT 'logged',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier
  ON public.rate_limits(identifier, endpoint, window_start);

ALTER TABLE public.abuse_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own abuse logs" ON public.abuse_logs;
CREATE POLICY "Users can view their own abuse logs"
  ON public.abuse_logs FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id AND is_banned = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
    SET is_banned = true, ban_reason = 'Auto-banned: 3+ critical abuse events', banned_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  PART 5: MACHINE VERIFICATION (verification-system.sql)  ║
-- ╚═══════════════════════════════════════════════════════════╝

ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS cpu_usage NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS ram_usage NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_usage NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS disk_usage NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_temp NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_memory_used_mb INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_memory_total_mb INTEGER DEFAULT 0;

ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS cuda_version TEXT;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS inet_down_mbps NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS inet_up_mbps NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS pcie_bandwidth_gbps NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS deverified_at TIMESTAMPTZ;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS deverify_reason TEXT;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS self_test_passed BOOLEAN DEFAULT false;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS self_test_at TIMESTAMPTZ;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS total_uptime_hours NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS consecutive_heartbeats INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS failed_heartbeats INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.machine_health_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
  cpu_usage NUMERIC,
  ram_usage NUMERIC,
  gpu_usage NUMERIC,
  gpu_temp NUMERIC,
  disk_usage NUMERIC,
  reliability_score NUMERIC,
  inet_down_mbps NUMERIC,
  inet_up_mbps NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.machine_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their machine health logs"
  ON public.machine_health_logs FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE host_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.datacenter_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_registration TEXT NOT NULL,
  gstin TEXT,
  cin TEXT,
  iso_cert_number TEXT,
  datacenter_name TEXT NOT NULL,
  datacenter_address TEXT NOT NULL,
  datacenter_city TEXT NOT NULL,
  datacenter_state TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  gpu_server_count INTEGER NOT NULL DEFAULT 0,
  additional_notes TEXT,
  status TEXT CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.datacenter_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own datacenter applications"
  ON public.datacenter_applications FOR SELECT USING (auth.uid() = host_id);
CREATE POLICY "Hosts can create datacenter applications"
  ON public.datacenter_applications FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE OR REPLACE FUNCTION public.evaluate_machine_verification()
RETURNS void AS $$
DECLARE
  rec RECORD;
  v_now TIMESTAMPTZ := now();
  v_heartbeat_age_minutes NUMERIC;
  v_cuda_major NUMERIC;
BEGIN
  FOR rec IN
    SELECT
      id, machine_tier, reliability_score, consecutive_heartbeats,
      failed_heartbeats, gpu_temp, self_test_passed, cuda_version,
      last_heartbeat, verified_at, status
    FROM public.machines
    WHERE machine_tier != 'secure_cloud' AND status != 'offline'
  LOOP
    IF rec.last_heartbeat IS NOT NULL THEN
      v_heartbeat_age_minutes := EXTRACT(EPOCH FROM (v_now - rec.last_heartbeat)) / 60.0;
    ELSE
      v_heartbeat_age_minutes := 999;
    END IF;

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
      EXCEPTION WHEN OTHERS THEN
        v_cuda_major := 0;
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

SELECT cron.schedule(
  'evaluate-machine-verification',
  '*/5 * * * *',
  'SELECT public.evaluate_machine_verification()'
);

SELECT cron.schedule(
  'cleanup-health-logs',
  '0 3 * * *',
  'DELETE FROM public.machine_health_logs WHERE recorded_at < now() - interval ''30 days'''
);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  PART 6: BILLING ENGINE (billing-cron.sql)               ║
-- ╚═══════════════════════════════════════════════════════════╝

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

-- ═══════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- Verify: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- ═══════════════════════════════════════════════════════════
