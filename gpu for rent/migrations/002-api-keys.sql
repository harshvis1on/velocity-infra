-- =============================================================
-- Velocity Infra - Scoped API Keys Migration
-- Run after 001-full-migration.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{"read": true, "write": true, "admin": false}'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON public.api_keys(key_prefix);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
CREATE POLICY "Users can create their own API keys"
  ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can revoke their own API keys" ON public.api_keys;
CREATE POLICY "Users can revoke their own API keys"
  ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE(user_id UUID, permissions JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT ak.user_id, ak.permissions
  FROM public.api_keys ak
  WHERE ak.key_hash = p_key_hash
    AND ak.revoked_at IS NULL
    AND (ak.expires_at IS NULL OR ak.expires_at > now());
  
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE api_keys.key_hash = p_key_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
