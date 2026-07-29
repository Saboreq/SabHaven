# SabHaven

SabHaven is an invite-only file delivery application for controlled public downloads and owner-only private storage. Visitors can browse public content without an account. Signed-in members can upload files, organise private folders, replace existing uploads, and remove their own content. Owner and admin roles manage the public structure and invitation dashboard without gaining access to another member's private files.

**Live application:** [files.saboreq.xyz](https://files.saboreq.xyz)

## Key capabilities

- Public file browsing with short-lived download links
- Invite-only accounts and role-based administration
- Member uploads, virtual folders, replacement, and deletion
- 50 MiB upload limit for admin/user accounts with an owner-only exemption
- Owner-only privacy across complete folder trees
- Server-side invitation, role, upload-size, and destructive-action validation
- Documented deployment, threat model, and known limitations

## Access model

| Account | Public files/folders | Own private items | Other private items | Folder controls | Dashboard |
| --- | --- | --- | --- | --- | --- |
| Anonymous | Read/download | No | No | None | No |
| User | Read/download | Read/manage | No | Own private folders only | No |
| Admin | Read/download | Read/manage | No | Public folders + own private folders | User invites only |
| Owner | Read/download | Read/manage | No | Public folders + own private folders | Members + user/admin invites |

These rules are enforced by Postgres and Storage row-level security, not only by the interface. Access checks evaluate the complete folder ancestry chain, so content inside a private folder remains private even when a descendant is marked public.

## Architecture

- **React and TypeScript** provide the responsive client application deployed on Vercel.
- **Supabase Auth** manages member sessions.
- **Postgres** stores virtual folders, file metadata, visibility, ownership, timestamps, roles, and hashed invite codes.
- **Supabase Storage** stores objects in a private `downloads` bucket.
- **Row-level security** applies the same access model to database rows and stored objects.
- **Signed URLs** provide time-limited downloads and expire after 60 seconds.
- **`register-with-invite`** validates and consumes invite codes without exposing privileged credentials to the browser.
- **`manage-folder`** authenticates the caller, validates the complete folder chain, removes descendant objects, and deletes folder metadata.
- **Reserved upload rules** require authorised metadata before an object can be created.

See [ADR 001](docs/adr/001-supabase-file-platform.md) for the storage design, [ADR 002](docs/adr/002-role-aware-administration.md) for role boundaries, and [SECURITY.md](SECURITY.md) for the threat model and known limitations.

## Local setup

1. Create a Supabase project, install the Supabase CLI, and link it:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

2. Apply the migrations and deploy the server functions:

   ```powershell
   npx supabase db push
   npx supabase functions deploy register-with-invite --no-verify-jwt
   npx supabase functions deploy manage-folder --no-verify-jwt
   ```

   Database migrations and server functions are separate from a Vercel deployment.

3. In **Supabase Dashboard → Storage → Settings**, set the project-wide **Global file size limit** to the largest file the owner should be able to upload. The migration removes the `downloads` bucket's 50 MiB override, but it cannot bypass the project or plan limit.

4. In **Supabase Dashboard → Authentication → Sign In / Providers**, disable **Allow new users to sign up**. Registration remains available through the invitation flow.

5. Allow the exact production browser origin:

   ```powershell
   npx supabase secrets set ALLOWED_ORIGIN=https://your-site.example
   ```

6. Copy `.env.example` to `.env.local` and set the project URL and publishable key. Never place a secret or service-role key in a `VITE_` variable.

7. Install and run:

   ```powershell
   npm install
   npm run dev
   ```

## Bootstrap the first owner

The role migration promotes the oldest existing Auth account to the single `owner` role. Verify that this is the intended account after the first migration.

The owner can then create `user` or `admin` invitations from `/dashboard`. Admins can create only `user` invitations. Generated codes are displayed once and cannot be recovered from the database.

For the first account on a new installation, generate a long random code and run:

```sql
select public.create_invite(
  p_code := 'REPLACE-WITH-A-LONG-RANDOM-CODE',
  p_label := 'Initial member',
  p_max_uses := 1,
  p_expires_at := now() + interval '7 days'
);
```

Send the original code privately.

## Deploy to Vercel

Set these environment variables for Production and Preview, then redeploy:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_MAX_UPLOAD_BYTES` — optional admin/user limit, defaults to 50 MiB; the owner role bypasses this application limit

`vercel.json` routes virtual folder URLs to the single-page application.

## Upload-size policy

Admin and user accounts are limited to `VITE_MAX_UPLOAD_BYTES` in both the interface and the database. The owner role has no SabHaven application-level file-size cap. Owner uploads remain bounded by the Supabase project-wide Storage setting, plan limits, and the selected upload protocol.

The role-aware database trigger protects new metadata rows and replacements. Storage replacement policies also inspect the uploaded object's size so a non-owner cannot bypass the limit by calling the Storage API directly.

## File lifecycle

- Uploads reserve authorised metadata before an object is stored. Failed uploads remove their reservation.
- Replacement updates the stored object and refreshes its size, MIME type, and update timestamp without changing its logical path or owner.
- Deletion removes both the object and its metadata. Only the owner of that file can perform either operation.
- Folder privacy applies to the complete descendant tree.
- Recursive folder deletion removes stored descendants before deleting metadata.
- The repository does not contain downloadable user files; content is stored in Supabase Storage.

## Quality checks

```powershell
npm run typecheck
npm test
npm run build
```

## Security scope

- The Storage bucket remains private, including for publicly listed files.
- Private metadata is returned only to its owner.
- Admin and owner roles do not bypass another member's private boundary.
- Invitation validation and role assignment are server-side.
- Upload-size permissions are role-aware and enforced beyond the browser.
- Browser-origin restrictions complement, but do not replace, authentication and authorisation.
- SabHaven is not end-to-end encrypted or independently audited and does not currently include malware scanning, per-user quotas, or distributed registration rate limiting.

Review [SECURITY.md](SECURITY.md) before using SabHaven for sensitive or untrusted workloads.

Created and maintained by the independent developer behind [Saboreq](https://saboreq.xyz), a public development brand.
