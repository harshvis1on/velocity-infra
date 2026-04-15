-- Grant ₹65 welcome credits (~1 hr RTX 4090) to every new user
CREATE OR REPLACE FUNCTION grant_signup_credits()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM credit_wallet(NEW.id, 65);
  INSERT INTO public.transactions (user_id, type, amount_inr, status, description)
    VALUES (NEW.id, 'credit', 65, 'completed', 'Welcome credits');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_signup_credits ON public.users;
CREATE TRIGGER on_user_signup_credits
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION grant_signup_credits();
