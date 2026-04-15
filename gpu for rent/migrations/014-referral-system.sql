-- Referral system: tracking columns, referral table, and credit triggers

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS referral_credits_earned_inr NUMERIC DEFAULT 0;

-- Back-fill referral codes for existing users
UPDATE public.users
  SET referral_code = UPPER(SUBSTR(id::text, 1, 8))
  WHERE referral_code IS NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.users(id),
  referred_id UUID NOT NULL REFERENCES public.users(id),
  status TEXT DEFAULT 'pending',
  credit_amount_inr NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_id)
);

-- Auto-generate referral code on user creation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := UPPER(SUBSTR(NEW.id::text, 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.users;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Grant referral credits when the referee's first rental goes running
CREATE OR REPLACE FUNCTION complete_referral()
RETURNS TRIGGER AS $$
DECLARE
  ref RECORD;
  credit NUMERIC := 65;
BEGIN
  IF NEW.status = 'running' AND OLD.status = 'creating' THEN
    SELECT * INTO ref FROM public.referrals
      WHERE referred_id = NEW.renter_id AND status = 'pending';
    IF FOUND THEN
      UPDATE public.referrals SET status = 'completed',
        credit_amount_inr = credit, completed_at = now()
        WHERE id = ref.id;
      PERFORM credit_wallet(ref.referrer_id, credit);
      PERFORM credit_wallet(ref.referred_id, credit);
      UPDATE public.users SET referral_credits_earned_inr =
        referral_credits_earned_inr + credit
        WHERE id = ref.referrer_id;
      -- XP bonus for the referrer
      PERFORM grant_xp(ref.referrer_id, 25);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_complete_referral ON public.instances;
CREATE TRIGGER trg_complete_referral
  AFTER UPDATE ON public.instances
  FOR EACH ROW EXECUTE FUNCTION complete_referral();

-- RLS: users can read their own referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals where they are referrer"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid());

CREATE POLICY "Users can view referrals where they are referred"
  ON public.referrals FOR SELECT
  USING (referred_id = auth.uid());
