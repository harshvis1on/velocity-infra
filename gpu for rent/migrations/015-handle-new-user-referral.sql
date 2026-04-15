-- Updated handle_new_user to process referral codes from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  ref_code TEXT;
  referrer RECORD;
BEGIN
  INSERT INTO public.users (id, email, kyc_status)
  VALUES (NEW.id, NEW.email, 'pending')
  ON CONFLICT (id) DO NOTHING;

  -- Check for referral code in user metadata (set during signup)
  ref_code := NEW.raw_user_meta_data ->> 'referral_code';
  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    SELECT id INTO referrer FROM public.users
      WHERE referral_code = UPPER(ref_code) AND id != NEW.id;
    IF FOUND THEN
      UPDATE public.users SET referred_by = referrer.id WHERE id = NEW.id;
      INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (referrer.id, NEW.id, 'pending')
        ON CONFLICT (referred_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
