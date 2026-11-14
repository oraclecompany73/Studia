-- Three roles: owner (single), admin (many), student (everyone else — no row needed).
alter table public.admin_emails
  add column if not exists role text not null default 'admin';

alter table public.admin_emails
  drop constraint if exists admin_emails_role_check;

alter table public.admin_emails
  add constraint admin_emails_role_check check (role in ('owner', 'admin'));

-- Exactly one owner row at a time.
drop index if exists public.admin_emails_one_owner;
create unique index admin_emails_one_owner
  on public.admin_emails ((true))
  where role = 'owner';

-- Seed / promote the platform owner. Safe to re-run.
insert into public.admin_emails (email, role)
values ('202604193@pua.edu.eg', 'owner')
on conflict (email) do update set role = 'owner';

-- Demote any other accidental owners (keeps the seeded email as the sole owner).
update public.admin_emails
set role = 'admin'
where role = 'owner'
  and lower(email) <> lower('202604193@pua.edu.eg');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'owner'
  );
$$;

grant execute on function public.is_owner() to authenticated;

-- Replace admin-management policies: only the owner may add/remove admins.
drop policy if exists "admins add admins" on public.admin_emails;
drop policy if exists "admins remove admins" on public.admin_emails;
drop policy if exists "owner add admins" on public.admin_emails;
drop policy if exists "owner remove admins" on public.admin_emails;

create policy "owner add admins"
  on public.admin_emails
  for insert
  to authenticated
  with check (public.is_owner() and role = 'admin');

create policy "owner remove admins"
  on public.admin_emails
  for delete
  to authenticated
  using (public.is_owner() and role = 'admin');

-- Transfer ownership: demote current owner to admin, promote the target to owner.
create or replace function public.transfer_ownership(new_owner_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target text := lower(trim(new_owner_email));
begin
  if not public.is_owner() then
    raise exception 'Only the owner can transfer ownership'
      using errcode = '42501';
  end if;
  if target is null or target !~ '^[^@[:space:]]+@pua\.edu\.eg$' then
    raise exception 'Owner must use a @pua.edu.eg email'
      using errcode = '22023';
  end if;
  if target = me then
    raise exception 'You are already the owner'
      using errcode = '22023';
  end if;

  update public.admin_emails
  set role = 'admin'
  where lower(email) = me and role = 'owner';

  insert into public.admin_emails (email, role)
  values (target, 'owner')
  on conflict (email) do update set role = excluded.role;
end;
$$;

grant execute on function public.transfer_ownership(text) to authenticated;
