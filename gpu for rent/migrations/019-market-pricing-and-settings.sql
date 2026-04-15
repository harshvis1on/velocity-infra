-- Market pricing table: platform-managed suggested prices per GPU model
CREATE TABLE IF NOT EXISTS public.market_prices (
  gpu_model TEXT PRIMARY KEY,
  suggested_price_per_gpu_hr_inr NUMERIC NOT NULL,
  min_price_per_gpu_hr_inr NUMERIC NOT NULL,
  max_price_per_gpu_hr_inr NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.market_prices VALUES
  ('RTX 4090', 40, 20, 80, now()),
  ('RTX 4080', 35, 18, 70, now()),
  ('RTX 4070', 28, 14, 56, now()),
  ('RTX 3090', 25, 12, 50, now()),
  ('RTX 3080', 20, 10, 40, now()),
  ('RTX 3070', 15, 8, 30, now()),
  ('A100',     95, 50, 190, now()),
  ('H100',    180, 90, 360, now()),
  ('A10',      45, 22, 90, now()),
  ('A6000',    55, 28, 110, now()),
  ('L40S',     60, 30, 120, now()),
  ('L40',      55, 28, 110, now()),
  ('L4',       25, 12, 50, now()),
  ('T4',       12, 6, 24, now()),
  ('V100',     18, 9, 36, now())
ON CONFLICT (gpu_model) DO NOTHING;

-- Anyone can read market prices
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read market prices"
  ON public.market_prices FOR SELECT USING (true);

-- Auto-pricing flag on offers: when true, platform adjusts price to market rate
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS auto_price BOOLEAN DEFAULT false;

-- User profile fields for settings hub
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS notify_low_balance BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_rental_activity BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_payout BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true;

-- Machine paused status: add 'paused' to allowed statuses
-- (machines.status is just TEXT, no CHECK constraint in the original schema,
--  so 'paused' works out of the box. We just need the agent and UI to respect it.)
