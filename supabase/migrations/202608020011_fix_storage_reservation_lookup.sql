-- Storage runs object writes through its own database role before applying the
-- caller's JWT role. Keep the cross-schema reservation lookup in a narrowly
-- scoped SECURITY DEFINER helper so public.files RLS and grants cannot make a
-- valid reservation appear absent to the storage.objects policy.

create or replace function private.has_file_upload_reservation(
  p_storage_path text,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.files file
    where file.storage_path = p_storage_path
      and file.owner_id = p_user_id
  )
$$;

revoke all on function private.has_file_upload_reservation(text, uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.has_file_upload_reservation(text, uuid) to authenticated;

drop policy if exists "Members upload reserved objects" on storage.objects;

create policy "Members upload reserved objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'downloads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.has_file_upload_reservation(name, (select auth.uid()))
);

drop policy if exists "Members read their reserved upload objects" on storage.objects;

create policy "Members read their reserved upload objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'downloads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.has_file_upload_reservation(name, (select auth.uid()))
);
