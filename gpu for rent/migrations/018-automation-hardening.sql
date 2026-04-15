-- 5a. Clean up instances stuck in 'creating' for over 5 minutes
CREATE OR REPLACE FUNCTION check_stuck_instances()
RETURNS void AS $$
DECLARE
  rec RECORD;
  v_refund NUMERIC;
BEGIN
  FOR rec IN
    SELECT i.id, i.renter_id, i.machine_id, i.gpu_count, i.rental_contract_id,
           rc.price_per_gpu_hr_inr
      FROM public.instances i
      LEFT JOIN public.rental_contracts rc ON rc.id = i.rental_contract_id
      WHERE i.status = 'creating'
        AND i.created_at < now() - INTERVAL '5 minutes'
  LOOP
    -- Mark instance as failed
    UPDATE public.instances
      SET status = 'failed', ended_at = now()
      WHERE id = rec.id;

    -- Cancel rental contract
    IF rec.rental_contract_id IS NOT NULL THEN
      UPDATE public.rental_contracts
        SET status = 'terminated', ended_at = now()
        WHERE id = rec.rental_contract_id;
    END IF;

    -- Free GPU allocation
    UPDATE public.machines
      SET gpu_allocated = GREATEST(0, COALESCE(gpu_allocated, 0) - rec.gpu_count)
      WHERE id = rec.machine_id;

    -- Refund minimum 1 hour worth of compute as goodwill
    v_refund := COALESCE(rec.price_per_gpu_hr_inr, 0) * COALESCE(rec.gpu_count, 1);
    IF v_refund > 0 THEN
      PERFORM credit_wallet(rec.renter_id, v_refund);
      INSERT INTO public.transactions (user_id, instance_id, amount_inr, type, status, description)
        VALUES (rec.renter_id, rec.id, v_refund, 'credit', 'completed',
                'Auto-refund: instance stuck in creating state');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule every 5 minutes
SELECT cron.unschedule('velocity-stuck-instances')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'velocity-stuck-instances');

SELECT cron.schedule(
  'velocity-stuck-instances',
  '*/5 * * * *',
  $$SELECT check_stuck_instances()$$
);

-- 5c. Auto-refund when a machine goes offline/error while instances are running
CREATE OR REPLACE FUNCTION auto_refund_on_provider_failure()
RETURNS TRIGGER AS $$
DECLARE
  inst RECORD;
  v_unused_minutes NUMERIC;
  v_refund NUMERIC;
BEGIN
  IF NEW.status IN ('offline', 'error') AND OLD.status NOT IN ('offline', 'error') THEN
    FOR inst IN
      SELECT i.id, i.renter_id, i.gpu_count, i.last_billed_at,
             rc.price_per_gpu_hr_inr
        FROM public.instances i
        LEFT JOIN public.rental_contracts rc ON rc.id = i.rental_contract_id
        WHERE i.machine_id = NEW.id
          AND i.status IN ('running', 'creating')
    LOOP
      -- Stop billing by marking instance as failed
      UPDATE public.instances
        SET status = 'failed', ended_at = now()
        WHERE id = inst.id;

      -- Free GPU allocation
      UPDATE public.machines
        SET gpu_allocated = GREATEST(0, COALESCE(gpu_allocated, 0) - inst.gpu_count)
        WHERE id = NEW.id;

      -- Calculate refund: credit back proportional unused time (minimum 1 hour)
      v_refund := COALESCE(inst.price_per_gpu_hr_inr, 0) * COALESCE(inst.gpu_count, 1);
      IF v_refund > 0 THEN
        PERFORM credit_wallet(inst.renter_id, v_refund);
        INSERT INTO public.transactions (user_id, instance_id, amount_inr, type, status, description)
          VALUES (inst.renter_id, inst.id, v_refund, 'credit', 'completed',
                  'Auto-refund: provider went offline/error');
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_refund_provider_failure ON public.machines;
CREATE TRIGGER trg_auto_refund_provider_failure
  AFTER UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION auto_refund_on_provider_failure();
