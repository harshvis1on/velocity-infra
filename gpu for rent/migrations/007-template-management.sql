-- =============================================================
-- Velocity Infra - Template Management Enhancements
-- =============================================================

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deploy_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_start_script TEXT,
  ADD COLUMN IF NOT EXISTS env_vars JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_vram_gb INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_deploy_count ON public.templates(deploy_count DESC);

DROP POLICY IF EXISTS "Anyone can view public templates" ON public.templates;
CREATE POLICY "Anyone can view public templates"
  ON public.templates FOR SELECT USING (is_public = true OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users can create custom templates" ON public.templates;
CREATE POLICY "Users can create custom templates"
  ON public.templates FOR INSERT WITH CHECK (auth.uid() = created_by AND is_custom = true);

DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
CREATE POLICY "Users can update their own templates"
  ON public.templates FOR UPDATE USING (auth.uid() = created_by);
