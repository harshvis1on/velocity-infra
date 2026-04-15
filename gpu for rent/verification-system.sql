-- =============================================================
-- Velocity Infra - Machine Verification & Health Tracking System
-- Adds automated verification lifecycle (Unverified -> Verified -> Deverified)
-- Run in Supabase SQL Editor after schema-v2.sql and security-migration.sql
-- =============================================================

-- ─────────────────────────────────────────────
-- 1a. Health metric columns on machines (agent already sends these)
-- ─────────────────────────────────────────────
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS cpu_usage NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS ram_usage NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_usage NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS disk_usage NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_temp NUMERIC DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_memory_used_mb INTEGER DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS gpu_memory_total_mb INTEGER DEFAULT 0;

-- ─────────────────────────────────────────────
-- 1b. Verification tracking columns on machines
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 1c. Allow 'error' status on instances (agent already uses it)
-- ─────────────────────────────────────────────
ALTER TABLE public.instances DROP CONSTRAINT IF EXISTS instances_status_check;
ALTER TABLE public.instances ADD CONSTRAINT instances_status_check
  CHECK (status IN ('creating', 'loading', 'running', 'stopped', 'destroyed', 'error'));

-- ─────────────────────────────────────────────
-- 1d. Machine health logs for historical tracking
-- ─────────────────────────────────────────────
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
  USING (
    machine_id IN (SELECT id FROM public.machines WHERE host_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- 1e. Datacenter partner applications
-- ─────────────────────────────────────────────
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
  ON public.datacenter_applications FOR SELECT
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can create datacenter applications"
  ON public.datacenter_applications FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- ─────────────────────────────────────────────
-- 1f. Automated machine verification function
-- Evaluates all machines and promotes/demotes based on health metrics.
-- Scheduled via pg_cron every 5 minutes.
-- ─────────────────────────────────────────────
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
    WHERE machine_tier != 'secure_cloud'
      AND status != 'offline'
  LOOP
    -- Calculate heartbeat freshness
    IF rec.last_heartbeat IS NOT NULL THEN
      v_heartbeat_age_minutes := EXTRACT(EPOCH FROM (v_now - rec.last_heartbeat)) / 60.0;
    ELSE
      v_heartbeat_age_minutes := 999;
    END IF;

    -- Update heartbeat counters
    IF v_heartbeat_age_minutes <= 2.0 THEN
      UPDATE public.machines
      SET consecutive_heartbeats = consecutive_heartbeats + 1,
          failed_heartbeats = 0,
          total_uptime_hours = total_uptime_hours + (5.0 / 60.0)
      WHERE id = rec.id;
    ELSIF v_heartbeat_age_minutes > 5.0 THEN
      UPDATE public.machines
      SET failed_heartbeats = failed_heartbeats + 1,
          consecutive_heartbeats = 0
      WHERE id = rec.id;
    END IF;

    -- Parse CUDA major version
    v_cuda_major := 0;
    IF rec.cuda_version IS NOT NULL AND rec.cuda_version != '' THEN
      BEGIN
        v_cuda_major := split_part(rec.cuda_version, '.', 1)::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        v_cuda_major := 0;
      END;
    END IF;

    -- Log health snapshot every cycle
    INSERT INTO public.machine_health_logs (machine_id, cpu_usage, ram_usage, gpu_usage, gpu_temp, disk_usage, reliability_score)
    SELECT id, cpu_usage, ram_usage, gpu_usage, gpu_temp, disk_usage, reliability_score
    FROM public.machines WHERE id = rec.id;

    -- AUTO-PROMOTE: unverified -> verified
    IF rec.machine_tier = 'unverified' THEN
      IF rec.reliability_score >= 85
        AND rec.consecutive_heartbeats >= 100
        AND rec.self_test_passed = true
        AND (rec.gpu_temp IS NULL OR rec.gpu_temp < 90)
        AND (v_cuda_major >= 12 OR rec.cuda_version IS NULL)
      THEN
        UPDATE public.machines
        SET machine_tier = 'verified',
            verified_at = v_now,
            deverified_at = NULL,
            deverify_reason = NULL
        WHERE id = rec.id;

        RAISE NOTICE 'Machine % promoted to verified', rec.id;
      END IF;
    END IF;

    -- AUTO-DEMOTE: verified -> unverified (deverified)
    IF rec.machine_tier = 'verified' THEN
      IF rec.reliability_score < 70 THEN
        UPDATE public.machines
        SET machine_tier = 'unverified',
            deverified_at = v_now,
            deverify_reason = 'Reliability dropped below 70%',
            consecutive_heartbeats = 0
        WHERE id = rec.id;
      ELSIF rec.failed_heartbeats >= 5 THEN
        UPDATE public.machines
        SET machine_tier = 'unverified',
            deverified_at = v_now,
            deverify_reason = 'Missed 5+ consecutive heartbeats (offline >25 min)',
            consecutive_heartbeats = 0
        WHERE id = rec.id;
      ELSIF rec.gpu_temp IS NOT NULL AND rec.gpu_temp >= 95 THEN
        UPDATE public.machines
        SET machine_tier = 'unverified',
            deverified_at = v_now,
            deverify_reason = 'GPU temperature sustained at 95C+',
            consecutive_heartbeats = 0
        WHERE id = rec.id;
      END IF;
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Schedule verification evaluation every 5 minutes
SELECT cron.schedule(
  'evaluate-machine-verification',
  '*/5 * * * *',
  'SELECT public.evaluate_machine_verification()'
);

-- ─────────────────────────────────────────────
-- 1g. Cleanup: prune health logs older than 30 days (daily at 3am)
-- ─────────────────────────────────────────────
SELECT cron.schedule(
  'cleanup-health-logs',
  '0 3 * * *',
  'DELETE FROM public.machine_health_logs WHERE recorded_at < now() - interval ''30 days'''
);
