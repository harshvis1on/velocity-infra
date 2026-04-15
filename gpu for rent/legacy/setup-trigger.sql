-- Run this in your Supabase SQL Editor to automatically create a profile for new users

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role, kyc_status)
  values (new.id, new.email, 'renter', 'pending');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
