-- =============================================================
-- Velocity Infra - Production Schema v2 (Migration-Safe)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Safe to re-run: drops and recreates all app tables
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 0. DROP OLD TABLES (dev only, no production data yet)
--    Order matters: drop dependents first to avoid FK errors
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.instances    CASCADE;
DROP TABLE IF EXISTS public.rentals      CASCADE;  -- old name
DROP TABLE IF EXISTS public.templates    CASCADE;
DROP TABLE IF EXISTS public.ssh_keys     CASCADE;
DROP TABLE IF EXISTS public.machines     CASCADE;
DROP TABLE IF EXISTS public.users        CASCADE;

-- ─────────────────────────────────────────────
-- 1. USERS (hosts and renters)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 2. SSH KEYS
-- ─────────────────────────────────────────────
CREATE TABLE public.ssh_keys (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  public_key        TEXT NOT NULL,
  fingerprint       TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────
-- 3. MACHINES (listed by hosts)
-- ─────────────────────────────────────────────
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
  status            TEXT CHECK (status IN ('available', 'rented', 'offline')) DEFAULT 'offline',
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

-- ─────────────────────────────────────────────
-- 4. DOCKER TEMPLATES
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 5. INSTANCES (active GPU sessions)
-- ─────────────────────────────────────────────
CREATE TABLE public.instances (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  renter_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  machine_id     UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  status         TEXT CHECK (status IN ('creating', 'loading', 'running', 'stopped', 'destroyed')) DEFAULT 'creating',

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

-- ─────────────────────────────────────────────
-- 6. TRANSACTIONS (wallet credits & debits)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 8. AUTO-CREATE USER PROFILE ON SIGNUP
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, kyc_status)
  VALUES (NEW.id, NEW.email, 'pending')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────────
-- 9. RPC FUNCTIONS (used by billing cron)
-- ─────────────────────────────────────────────
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 10. ENABLE REALTIME (for live instance updates)
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;
