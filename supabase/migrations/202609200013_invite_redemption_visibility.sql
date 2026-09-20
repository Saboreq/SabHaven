-- Allow signed-in members to inspect only their own invite redemption record.
-- This also gives the RLS-enabled table an explicit read policy for privacy/account tooling.

revoke all on public.invite_redemptions from anon, authenticated;
grant select on public.invite_redemptions to authenticated;

create policy "Members read their own invite redemptions"
on public.invite_redemptions for select
to authenticated
using (user_id = (select auth.uid()));
