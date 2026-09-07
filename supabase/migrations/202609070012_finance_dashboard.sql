-- Obsidian Finance: private per-user finance tracker.
-- Adds username-based account lookup without exposing email addresses to clients,
-- plus RLS-protected settings and weekly finance records.

create table public.finance_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null,
  created_at timestamptz not null default now(),
  constraint finance_profiles_username_format check (
    char_length(username) between 3 and 24
    and username ~ '^[a-z0-9_.-]+$'
  )
);

create unique index finance_profiles_username_lower_idx
  on public.finance_profiles (lower(username));

create table public.finance_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hourly_rate_eur numeric(10,2) not null default 14 check (hourly_rate_eur > 0 and hourly_rate_eur <= 1000),
  weekly_spending_cap_eur numeric(10,2) not null default 100 check (weekly_spending_cap_eur >= 0 and weekly_spending_cap_eur <= 100000),
  monthly_fixed_costs_pln numeric(12,2) not null default 4000 check (monthly_fixed_costs_pln >= 0 and monthly_fixed_costs_pln <= 10000000),
  exchange_rate numeric(10,4) not null default 4.314 check (exchange_rate > 0 and exchange_rate <= 100),
  starting_savings_pln numeric(14,2) not null default 0 check (starting_savings_pln >= 0),
  recovery_target_pln numeric(14,2) not null default 1500 check (recovery_target_pln > 0),
  emergency_target_pln numeric(14,2) not null default 10000 check (emergency_target_pln > recovery_target_pln),
  stretch_target_pln numeric(14,2) not null default 20000 check (stretch_target_pln > emergency_target_pln),
  updated_at timestamptz not null default now()
);

create table public.finance_weeks (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  hours numeric(6,2) not null check (hours >= 0 and hours <= 100),
  living_expenses_eur numeric(12,2) not null check (living_expenses_eur >= 0 and living_expenses_eur <= 100000),
  exchange_rate numeric(10,4) not null check (exchange_rate > 0 and exchange_rate <= 100),
  saved_pln numeric(14,2) not null default 0 check (saved_pln >= 0),
  note text not null default '' check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index finance_weeks_user_week_idx
  on public.finance_weeks (user_id, week_start desc);

create or replace function private.finance_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger finance_settings_touch_updated_at
before update on public.finance_settings
for each row execute function private.finance_touch_updated_at();

create trigger finance_weeks_touch_updated_at
before update on public.finance_weeks
for each row execute function private.finance_touch_updated_at();

create or replace function public.finance_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_username is not null
    and char_length(trim(p_username)) between 3 and 24
    and lower(trim(p_username)) ~ '^[a-z0-9_.-]+$'
    and not exists (
      select 1
      from public.finance_profiles fp
      where fp.username = lower(trim(p_username))
    )
$$;

create or replace function public.finance_claim_profile(p_username text)
returns table (
  user_id uuid,
  email text,
  username text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_email text;
  clean_username text := lower(trim(coalesce(p_username, '')));
begin
  if actor_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if char_length(clean_username) not between 3 and 24
     or clean_username !~ '^[a-z0-9_.-]+$' then
    raise exception 'Invalid username.' using errcode = '22023';
  end if;

  select coalesce(u.email, '') into actor_email
  from auth.users u
  where u.id = actor_id;

  if actor_email = '' then
    raise exception 'This account does not have an email address.' using errcode = '22023';
  end if;

  return query
  insert into public.finance_profiles as fp(user_id, email, username)
  values (actor_id, actor_email, clean_username)
  returning fp.user_id, fp.email, fp.username, fp.created_at;

  insert into public.finance_settings(user_id)
  values (actor_id)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function private.handle_finance_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  if tg_op = 'UPDATE' then
    update public.finance_profiles
    set email = coalesce(new.email, '')
    where user_id = new.id;
    return new;
  end if;

  if coalesce(new.raw_user_meta_data ->> 'finance_account', 'false') <> 'true' then
    return new;
  end if;

  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if char_length(requested_username) not between 3 and 24
     or requested_username !~ '^[a-z0-9_.-]+$' then
    raise exception 'Invalid finance username.' using errcode = '22023';
  end if;

  insert into public.finance_profiles(user_id, email, username, created_at)
  values (new.id, coalesce(new.email, ''), requested_username, new.created_at);

  insert into public.finance_settings(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_finance_profile on auth.users;
create trigger on_auth_user_finance_profile
after insert or update of email on auth.users
for each row execute function private.handle_finance_auth_user();

revoke all on function private.finance_touch_updated_at() from public;
revoke all on function private.handle_finance_auth_user() from public;
revoke all on function public.finance_username_available(text) from public, anon, authenticated;
revoke all on function public.finance_claim_profile(text) from public, anon, authenticated;
grant execute on function public.finance_username_available(text) to anon, authenticated;
grant execute on function public.finance_claim_profile(text) to authenticated;

alter table public.finance_profiles enable row level security;
alter table public.finance_settings enable row level security;
alter table public.finance_weeks enable row level security;

revoke all on public.finance_profiles, public.finance_settings, public.finance_weeks from anon, authenticated;
grant select on public.finance_profiles to authenticated;
grant select, insert, update, delete on public.finance_settings, public.finance_weeks to authenticated;

create policy "Finance users read only their profile"
on public.finance_profiles for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Finance users read only their settings"
on public.finance_settings for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Finance users create only their settings"
on public.finance_settings for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Finance users update only their settings"
on public.finance_settings for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Finance users delete only their settings"
on public.finance_settings for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "Finance users read only their weeks"
on public.finance_weeks for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Finance users create only their weeks"
on public.finance_weeks for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Finance users update only their weeks"
on public.finance_weeks for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Finance users delete only their weeks"
on public.finance_weeks for delete
to authenticated
using (user_id = (select auth.uid()));
