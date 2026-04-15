-- =============================================================
-- Velocity Infra - Persistent Volumes
-- =============================================================

CREATE TABLE IF NOT EXISTS public.volumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id),
  name TEXT NOT NULL,
  size_gb INTEGER NOT NULL DEFAULT 50,
  mount_path TEXT NOT NULL DEFAULT '/workspace',
  status TEXT NOT NULL DEFAULT 'creating' CHECK (status IN ('creating', 'active', 'deleting', 'deleted')),
  docker_volume_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_volumes_user ON public.volumes(user_id);
CREATE INDEX IF NOT EXISTS idx_volumes_machine ON public.volumes(machine_id);
CREATE INDEX IF NOT EXISTS idx_volumes_status ON public.volumes(status);

ALTER TABLE public.volumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own volumes" ON public.volumes;
CREATE POLICY "Users can view their own volumes"
  ON public.volumes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create volumes" ON public.volumes;
CREATE POLICY "Users can create volumes"
  ON public.volumes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own volumes" ON public.volumes;
CREATE POLICY "Users can update their own volumes"
  ON public.volumes FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.instances
  ADD COLUMN IF NOT EXISTS volume_id UUID REFERENCES public.volumes(id);
