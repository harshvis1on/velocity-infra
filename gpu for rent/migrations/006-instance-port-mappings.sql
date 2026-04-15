-- Host agent publishes container ports and stores external bindings for the dashboard/API.
ALTER TABLE public.instances
  ADD COLUMN IF NOT EXISTS port_mappings JSONB;

COMMENT ON COLUMN public.instances.port_mappings IS
  'Maps container ports (string keys) to host TCP ports, e.g. {"22":22001,"8888":22002,...}';
