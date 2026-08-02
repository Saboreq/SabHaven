-- Fix uploads rejected by the role-aware Storage policy.
--
-- Supabase can create the storage.objects row before its final object metadata
-- (including the real byte size) is populated. Requiring metadata->>'size' in
-- the INSERT RLS policy therefore rejects valid uploads with error 42501.
--
-- Keep the reservation check in RLS, then enforce the real stored size from a
-- trigger when Supabase writes the final object metadata. This preserves the
-- 50 MiB limit for admin/user accounts and the owner-only exemption.

drop policy if exists "Members upload size-matched reserved objects" on storage.objects;
drop policy if exists "Members upload reserved objects" on storage.objects;

create policy "Members upload reserved objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'downloads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.files file
    where file.storage_path = name
      and file.owner_id = (select auth.uid())
  )
);

create or replace function private.enforce_storage_object_upload_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_owner_id uuid;
  actual_size bigint;
begin
  if new.bucket_id <> 'downloads'
    or new.metadata is null
    or not (new.metadata ? 'size')
    or (new.metadata ->> 'size') !~ '^[0-9]+$'
  then
    return new;
  end if;

  actual_size := (new.metadata ->> 'size')::bigint;

  select file.owner_id
  into reserved_owner_id
  from public.files file
  where file.storage_path = new.name;

  if reserved_owner_id is null then
    raise exception 'A matching file reservation is required before upload.'
      using errcode = '42501';
  end if;

  if actual_size > 52428800
    and private.user_role(reserved_owner_id) <> 'owner'
  then
    raise exception 'Files larger than 50 MiB are reserved for the owner account.'
      using errcode = '22023';
  end if;

  -- Keep the application metadata authoritative and accurate even when a
  -- caller uses the Storage API directly or replaces an existing object.
  update public.files
  set size_bytes = actual_size,
      updated_at = case when tg_op = 'UPDATE' then now() else updated_at end
  where storage_path = new.name
    and owner_id = reserved_owner_id;

  return new;
end;
$$;

revoke all on function private.enforce_storage_object_upload_size() from public, anon, authenticated;

drop trigger if exists enforce_storage_object_upload_size on storage.objects;
create trigger enforce_storage_object_upload_size
before insert or update of metadata, bucket_id, name on storage.objects
for each row execute function private.enforce_storage_object_upload_size();

-- Size enforcement now lives in the trigger because final metadata is not
-- reliable during the INSERT policy check. Keep replacement authorization
-- owner-scoped and let the trigger enforce the role-aware byte limit.
drop policy if exists "File owners replace permitted objects" on storage.objects;
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
);