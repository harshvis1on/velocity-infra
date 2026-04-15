-- Serverless Architecture Schema

-- 1. Endpoints
CREATE TABLE IF NOT EXISTS public.endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    max_workers INTEGER NOT NULL DEFAULT 16,
    min_load INTEGER NOT NULL DEFAULT 1,
    min_workers INTEGER NOT NULL DEFAULT 5,
    cold_mult DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    min_cold_load DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    target_util DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    inactivity_timeout INTEGER,
    max_queue_time DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    target_queue_time DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'scaling_down', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name)
);

-- 2. Workergroups
CREATE TABLE IF NOT EXISTS public.workergroups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES public.endpoints(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    gpu_ram INTEGER NOT NULL DEFAULT 24,
    search_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    launch_args TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Workers
CREATE TABLE IF NOT EXISTS public.workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workergroup_id UUID NOT NULL REFERENCES public.workergroups(id) ON DELETE CASCADE,
    instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
    state TEXT NOT NULL DEFAULT 'recruiting' CHECK (state IN ('recruiting', 'loading', 'ready', 'active', 'inactive', 'releasing', 'destroyed')),
    perf_rating DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    current_load DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    queue_time DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_metrics_at TIMESTAMP WITH TIME ZONE,
    worker_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Endpoint Requests (Audit Log)
CREATE TABLE IF NOT EXISTS public.endpoint_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES public.endpoints(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'routed', 'completed', 'failed', 'timeout')),
    load_cost DOUBLE PRECISION,
    latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_endpoints_user_id ON public.endpoints(user_id);
CREATE INDEX idx_workergroups_endpoint_id ON public.workergroups(endpoint_id);
CREATE INDEX idx_workers_workergroup_id ON public.workers(workergroup_id);
CREATE INDEX idx_workers_instance_id ON public.workers(instance_id);
CREATE INDEX idx_endpoint_requests_endpoint_id ON public.endpoint_requests(endpoint_id);
CREATE INDEX idx_endpoint_requests_worker_id ON public.endpoint_requests(worker_id);

-- RLS Policies
ALTER TABLE public.endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workergroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endpoint_requests ENABLE ROW LEVEL SECURITY;

-- Endpoints: Users can manage their own endpoints
CREATE POLICY "Users can view their own endpoints" ON public.endpoints
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own endpoints" ON public.endpoints
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own endpoints" ON public.endpoints
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own endpoints" ON public.endpoints
    FOR DELETE USING (auth.uid() = user_id);

-- Workergroups: Users can manage workergroups for their endpoints
CREATE POLICY "Users can view workergroups for their endpoints" ON public.workergroups
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert workergroups for their endpoints" ON public.workergroups
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));
CREATE POLICY "Users can update workergroups for their endpoints" ON public.workergroups
    FOR UPDATE USING (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete workergroups for their endpoints" ON public.workergroups
    FOR DELETE USING (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));

-- Workers: Users can view workers for their workergroups
CREATE POLICY "Users can view workers for their workergroups" ON public.workers
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.workergroups wg 
        JOIN public.endpoints e ON wg.endpoint_id = e.id 
        WHERE wg.id = workergroup_id AND e.user_id = auth.uid()
    ));

-- Endpoint Requests: Users can view requests for their endpoints
CREATE POLICY "Users can view requests for their endpoints" ON public.endpoint_requests
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.endpoints WHERE id = endpoint_id AND user_id = auth.uid()));

-- Service role bypasses RLS for inserting/updating workers and requests
