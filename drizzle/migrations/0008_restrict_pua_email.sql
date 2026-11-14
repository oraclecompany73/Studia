-- Only allow accounts with @pua.edu.eg email addresses.
create or replace function public.enforce_pua_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null
     or lower(new.email) !~ '^[^@[:space:]]+@pua\.edu\.eg$' then
    raise exception 'Only @pua.edu.eg email addresses are allowed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_pua_email_on_signup on auth.users;
create trigger enforce_pua_email_on_signup
  before insert or update of email on auth.users
  for each row
  execute function public.enforce_pua_email();
