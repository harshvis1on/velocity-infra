-- Atomic GPU allocation with row-level locking to prevent race conditions
CREATE OR REPLACE FUNCTION allocate_gpus(
  p_machine_id UUID,
  p_gpu_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_machine RECORD;
  v_used_indices INTEGER[];
  v_available INTEGER[];
  v_allocated INTEGER[];
  i INTEGER;
BEGIN
  -- Lock the machine row to prevent concurrent allocation
  SELECT id, gpu_count, gpu_allocated
    INTO v_machine
    FROM public.machines
    WHERE id = p_machine_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Machine not found');
  END IF;

  -- Gather already-used indices from active contracts
  SELECT COALESCE(array_agg(idx), ARRAY[]::INTEGER[])
    INTO v_used_indices
    FROM public.rental_contracts,
         LATERAL unnest(gpu_indices) AS idx
    WHERE machine_id = p_machine_id
      AND status = 'active';

  -- Build list of available indices
  v_available := ARRAY[]::INTEGER[];
  FOR i IN 0..(v_machine.gpu_count - 1) LOOP
    IF NOT (i = ANY(v_used_indices)) THEN
      v_available := v_available || i;
    END IF;
  END LOOP;

  IF array_length(v_available, 1) IS NULL OR array_length(v_available, 1) < p_gpu_count THEN
    RETURN jsonb_build_object('error', 'Not enough GPUs available');
  END IF;

  v_allocated := v_available[1:p_gpu_count];

  -- Increment the allocated counter
  UPDATE public.machines
    SET gpu_allocated = COALESCE(gpu_allocated, 0) + p_gpu_count
    WHERE id = p_machine_id;

  RETURN jsonb_build_object('gpu_indices', to_jsonb(v_allocated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
