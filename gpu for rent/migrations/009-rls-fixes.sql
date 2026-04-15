-- =============================================================
-- Velocity Infra - RLS Fixes for Renter Instance Management
-- Fixes: renters could not stop/destroy instances or view/terminate contracts
-- =============================================================

-- Renters can stop/destroy their own instances
DROP POLICY IF EXISTS "Renters can update their own instances" ON public.instances;
CREATE POLICY "Renters can update their own instances"
  ON public.instances FOR UPDATE
  USING (auth.uid() = renter_id);

-- Hosts can also update instances on their machines (for agent-driven status changes via service role,
-- but this allows dashboard-level reads to work with RLS)
DROP POLICY IF EXISTS "Hosts can update instances on their machines" ON public.instances;
CREATE POLICY "Hosts can update instances on their machines"
  ON public.instances FOR UPDATE
  USING (
    auth.uid() IN (SELECT host_id FROM public.machines WHERE id = machine_id)
  );

-- Renters can view rental contracts they are party to
DROP POLICY IF EXISTS "Renters can view their rental contracts" ON public.rental_contracts;
CREATE POLICY "Renters can view their rental contracts"
  ON public.rental_contracts FOR SELECT
  USING (auth.uid() = renter_id);

-- Hosts can view rental contracts on their machines
DROP POLICY IF EXISTS "Hosts can view rental contracts on their machines" ON public.rental_contracts;
CREATE POLICY "Hosts can view rental contracts on their machines"
  ON public.rental_contracts FOR SELECT
  USING (
    auth.uid() IN (SELECT host_id FROM public.machines WHERE id = machine_id)
  );

-- Renters can terminate their own contracts
DROP POLICY IF EXISTS "Renters can update their rental contracts" ON public.rental_contracts;
CREATE POLICY "Renters can update their rental contracts"
  ON public.rental_contracts FOR UPDATE
  USING (auth.uid() = renter_id);
