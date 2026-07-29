-- Let the single application owner upload files up to the Supabase project-wide
-- Storage limit while preserving the configured 50 MiB application limit for
-- admin and user accounts.
--
-- The browser check is only a convenience. This migration keeps the rule
-- authoritative in Postgres and in the Storage UPDATE policy used by file
-- replacement.

do $$
declare
  legacy_constraint_name text;
begin
  select constraint_record.conname
  into legacy_constraint_name
  from pg_constraint constraint_record
  where constraint_record.conrelid = 'public.files'::regclass
    and constraint_record.contype = 'c'
    and pg_get_constraintdef(constraint_record.oid) ilike '%size_bytes%'
    and pg_get_constraintdef(constraint_record.oid) ilike '%52428800%'
  order by constraint_record.oid
  limit 1;

  if legacy_constraint_name is not null then
    execute format('alter table public.files drop constraint %I', legacy_constraint_name);
  end if;
end;
$$;

alter table public.files
  drop constraint if exists files_size_bytes_positive_check;

alter table public.files
  add constraint files_size_bytes_positive_check
  check (size_bytes > 0);

create or replace function private.enforce_role_aware_file_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.size_bytes <= 0 then
    raise exception 'The selected file is empty.' using errcode = '22023';
  end if;

  if new.size_bytes > 52428800
    and private.user_role(new.owner_id) <> 'owner'
  then
    raise exception 'Files larger than 50 MiB are reserved for the owner account.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_role_aware_file_size() from public, anon, authenticated;

drop trigger if exists enforce_role_aware_file_size on public.files;
create trigger enforce_role_aware_file_size
before insert or update of size_bytes, owner_id on public.files
for each row execute function private.enforce_role_aware_file_size();

-- Remove the bucket-level 50 MiB ceiling. The Supabase project-wide Storage
-- limit still applies, so the owner remains bounded by the configured plan and
-- project settings.
update storage.buckets
set file_size_limit = null
where id = 'downloads';

-- Replacements update Storage before the public.files metadata row. Enforce the
-- member limit against the new Storage metadata as well, otherwise a direct API
-- call could replace an existing object with an oversized file.
drop policy if exists "Owners replace their stored objects" on storage.objects;
create policy "File owners replace permitted objects"
on storage.objects for update
to authenticated
using (
  bucket_id = 'downloads'
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id = 'downloads'
  and owner_id = (select auth.uid())::text
  and (
    private.current_user_role() = 'owner'
    or (
      metadata ? 'size'
      and (metadata ->> 'size') ~ '^[0-9]+$'
      and (metadata ->> 'size')::numeric <= 52428800
    )
  )
);
