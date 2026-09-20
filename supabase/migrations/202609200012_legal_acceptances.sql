-- Record the version of the Terms accepted during invite-only registration.
-- The privacy notice version is recorded as proof of presentation/acknowledgement,
-- not as a claim that all processing relies on consent.

create table public.legal_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null check (char_length(terms_version) between 1 and 64),
  privacy_notice_version text not null check (char_length(privacy_notice_version) between 1 and 64),
  accepted_at timestamptz not null default now(),
  unique (user_id, terms_version)
);

create index legal_acceptances_user_id_idx on public.legal_acceptances(user_id);

alter table public.legal_acceptances enable row level security;
revoke all on public.legal_acceptances from anon, authenticated;
grant select on public.legal_acceptances to authenticated;

create policy "Members read their legal acceptances"
on public.legal_acceptances for select
to authenticated
using (user_id = (select auth.uid()));
