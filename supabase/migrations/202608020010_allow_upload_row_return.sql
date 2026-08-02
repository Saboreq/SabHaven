-- Supabase Storage inserts object metadata with `returning *`. PostgreSQL
-- applies SELECT RLS to that returned row as well as INSERT RLS, so an upload
-- can be rejected after passing the reservation check unless the uploader may
-- also read the new object row.
--
-- Keep the existing visibility policy for downloads and add only the same
-- owner/reservation scope used by uploads. Policies are OR-combined, so this
-- permits owners to receive their newly-created private object metadata without
-- exposing it to any other account.

drop policy if exists "Members read their reserved upload objects" on storage.objects;

create policy "Members read their reserved upload objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'downloads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.files file
    where file.storage_path = name
      and file.owner_id = (select auth.uid())
  )
);
