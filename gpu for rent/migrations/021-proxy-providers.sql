-- =============================================================
-- Migration 021: Proxy Provider Support
-- Adds columns to track GPU machines/offers/instances sourced
-- from external providers (Vast.ai, RunPod) transparently.
-- =============================================================

-- Source tracking on machines
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'native';
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS provider_machine_id TEXT;

DO $$ BEGIN
  ALTER TABLE public.machines ADD CONSTRAINT machines_source_check
    CHECK (source IN ('native', 'vast', 'runpod'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Source tracking on offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'native';

DO $$ BEGIN
  ALTER TABLE public.offers ADD CONSTRAINT offers_source_check
    CHECK (source IN ('native', 'vast', 'runpod'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Provider instance tracking
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS provider_instance_id TEXT;
ALTER TABLE public.instances ADD COLUMN IF NOT EXISTS provider_cost_per_hr NUMERIC(10,4);

-- Index for proxy sync upserts
CREATE INDEX IF NOT EXISTS idx_machines_provider
  ON public.machines (source, provider_machine_id)
  WHERE source != 'native';

CREATE INDEX IF NOT EXISTS idx_instances_provider
  ON public.instances (provider_instance_id)
  WHERE provider_instance_id IS NOT NULL;

-- RLS: proxy machines are owned by the system host user, 
-- but visible to all renters through offers (existing RLS handles this)
