-- =============================================================
-- Velocity Infra - Security & KYC Migration
-- ALTER-only migration — safe to re-run (idempotent)
-- Run AFTER schema-v2.sql has been applied
-- =============================================================

-- ─────────────────────────────────────────────
-- 1. USERS TABLE — Add security & KYC columns
-- ─────────────────────────────────────────────

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pan_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS aadhaar_hash TEXT;  -- store hash only, never raw
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS aadhaar_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_tier TEXT CHECK (kyc_tier IN ('none', 'phone_verified', 'id_verified', 'enterprise')) DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_state TEXT;  -- needed for IGST vs CGST/SGST

-- ─────────────────────────────────────────────
-- 2. ABUSE LOGS TABLE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.abuse_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  event_type TEXT CHECK (event_type IN (
    'port_scan', 'ddos_attempt', 'crypto_mining', 'spam_attempt',
    'container_escape', 'excessive_bandwidth', 'blocked_port_access',
    'suspicious_process', 'manual_report'
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

-- ─────────────────────────────────────────────
-- 3. RATE LIMITS TABLE (API abuse tracking)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  identifier TEXT NOT NULL,  -- IP or user_id
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier
  ON public.rate_limits(identifier, endpoint, window_start);

-- ─────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY — abuse_logs
--    Users can view their own logs; admins via service_role
-- ─────────────────────────────────────────────

ALTER TABLE public.abuse_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own abuse logs" ON public.abuse_logs;
CREATE POLICY "Users can view their own abuse logs"
  ON public.abuse_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY — rate_limits
--    No public policies; only service_role can access
-- ─────────────────────────────────────────────

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 6. FUNCTION — Check if a user is banned
--    Used by middleware to gate API access
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id AND is_banned = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 7. FUNCTION — Log abuse events
--    Auto-bans after 3 unresolved critical events
-- ─────────────────────────────────────────────

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
