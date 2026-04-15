-- =============================================================
-- Velocity Infra - Named Tunnel Support
-- =============================================================

ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS tunnel_name TEXT,
  ADD COLUMN IF NOT EXISTS tunnel_id TEXT,
  ADD COLUMN IF NOT EXISTS tunnel_credentials JSONB;

ALTER TABLE public.instances
  ADD COLUMN IF NOT EXISTS tunnel_hostname TEXT,
  ADD COLUMN IF NOT EXISTS port_mappings JSONB DEFAULT '{}';
