-- Gamification: XP, provider tiers, and tier-based billing fees

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_tier TEXT DEFAULT 'bronze'
    CHECK (provider_tier IN ('bronze','silver','gold','platinum','diamond'));

CREATE TABLE IF NOT EXISTS public.tier_config (
  tier TEXT PRIMARY KEY,
  min_xp INTEGER NOT NULL,
  platform_fee_rate NUMERIC NOT NULL
);

INSERT INTO public.tier_config VALUES
  ('bronze',   0,     0.15),
  ('silver',   1000,  0.12),
  ('gold',     5000,  0.10),
  ('platinum', 15000, 0.07),
  ('diamond',  50000, 0.05)
ON CONFLICT DO NOTHING;

-- Grant XP and auto-promote tier
CREATE OR REPLACE FUNCTION grant_xp(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
DECLARE
  new_xp INTEGER;
  new_tier TEXT;
BEGIN
  UPDATE public.users SET xp = xp + p_amount
    WHERE id = p_user_id RETURNING xp INTO new_xp;
  SELECT tier INTO new_tier FROM public.tier_config
    WHERE min_xp <= new_xp ORDER BY min_xp DESC LIMIT 1;
  UPDATE public.users SET provider_tier = new_tier
    WHERE id = p_user_id AND provider_tier IS DISTINCT FROM new_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- XP trigger: grant XP when instance terminates normally (per-hour of uptime)
CREATE OR REPLACE FUNCTION xp_on_instance_terminate()
RETURNS TRIGGER AS $$
DECLARE
  hours_up NUMERIC;
  host_id UUID;
BEGIN
  IF NEW.status = 'terminated' AND OLD.status IN ('running', 'stopped') THEN
    SELECT m.host_id INTO host_id
      FROM public.machines m WHERE m.id = NEW.machine_id;
    IF host_id IS NOT NULL THEN
      hours_up := GREATEST(1, EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 3600);
      PERFORM grant_xp(host_id, LEAST(hours_up::INTEGER * 10, 500));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_xp_on_instance_terminate ON public.instances;
CREATE TRIGGER trg_xp_on_instance_terminate
  AFTER UPDATE ON public.instances
  FOR EACH ROW EXECUTE FUNCTION xp_on_instance_terminate();

-- XP trigger: grant XP when machine passes self-test verification
CREATE OR REPLACE FUNCTION xp_on_machine_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.self_test_passed = TRUE AND (OLD.self_test_passed IS NULL OR OLD.self_test_passed = FALSE) THEN
    PERFORM grant_xp(NEW.host_id, 50);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_xp_on_machine_verified ON public.machines;
CREATE TRIGGER trg_xp_on_machine_verified
  AFTER UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION xp_on_machine_verified();
