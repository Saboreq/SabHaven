# SabHaven

[![CI](https://github.com/Saboreq/SabHaven/actions/workflows/ci.yml/badge.svg)](https://github.com/Saboreq/SabHaven/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/Saboreq/SabHaven?display_name=tag&sort=semver)](https://github.com/Saboreq/SabHaven/releases)
[![Last commit](https://img.shields.io/github/last-commit/Saboreq/SabHaven)](https://github.com/Saboreq/SabHaven/commits/main)
[![Open issues](https://img.shields.io/github/issues/Saboreq/SabHaven)](https://github.com/Saboreq/SabHaven/issues)
[![Live application](https://img.shields.io/badge/live-files.saboreq.xyz-7c3aed)](https://files.saboreq.xyz)

SabHaven is an invite-only file delivery application for controlled public downloads and owner-only private storage. Visitors can browse public content without an account. Signed-in members can upload files, organise private folders, replace existing uploads, and remove their own content. Owner and admin roles manage the public structure and invitation dashboard without gaining access to another member's private files.

**Live application:** [files.saboreq.xyz](https://files.saboreq.xyz)

## Open source

SabHaven is **open-source software released under the [MIT License](LICENSE)**. You may inspect, self-host, modify, and redistribute the code under the terms of that license. The hosted instance at `files.saboreq.xyz` is one deployment of the project; the repository is designed so other developers can run their own independent instance.

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development and pull-request workflow and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

### Hosted-service policies

The public deployment has dedicated [Privacy](https://files.saboreq.xyz/privacy), [Terms](https://files.saboreq.xyz/terms), [Acceptable Use](https://files.saboreq.xyz/acceptable-use), [Abuse reporting](https://files.saboreq.xyz/abuse), [Security](https://files.saboreq.xyz/security), and [Contact](https://files.saboreq.xyz/contact) pages. Repository copies of the core policies are available in [PRIVACY.md](PRIVACY.md), [TERMS.md](TERMS.md), and [ACCEPTABLE_USE.md](ACCEPTABLE_USE.md). Self-hosters are responsible for replacing these hosted-service terms and privacy disclosures with documents appropriate to their own deployment.

## Project status

SabHaven is **actively maintained**. The repository uses GitHub Actions for validation, Dependabot for dependency maintenance, a public security policy, and documented release notes.

- **Current version:** 1.2.0
- **Release history:** [GitHub Releases](https://github.com/Saboreq/SabHaven/releases) and [CHANGELOG.md](CHANGELOG.md)
- **Roadmap:** [ROADMAP.md](ROADMAP.md)
- **Contributions:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Security:** [SECURITY.md](SECURITY.md)
- **Production deployment:** [files.saboreq.xyz](https://files.saboreq.xyz)

The project deliberately separates public file delivery from private member storage, with authorization enforced at the database and storage layers rather than only in the browser.

## Key capabilities

- Public file browsing with short-lived download links
- Invite-only accounts and role-based administration
- Member uploads, virtual folders, replacement, and deletion
- 50 MiB upload limit for admin/user accounts with an owner-only exemption
- Owner-only privacy across complete folder trees
- Server-side invitation, role, upload-size, and destructive-action validation
- Versioned Terms acceptance recorded during registration
- Self-service account-data export and eligible account deletion
- Privacy, Terms, acceptable-use, abuse, security, contact, 403/404/410, and application-error surfaces
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
- **`account-tools`** requires a signed-in user, exports account-linked records, removes owned Storage objects before eligible account deletion, and blocks automated deletion of the owner account.
- **`legal_acceptances`** stores server-timestamped Terms/privacy-notice versions shown during registration.
- **Reserved upload rules** require authorised metadata before an object can be created.

See [ADR 001](docs/adr/001-supabase-file-platform.md) for the storage design, [ADR 002](docs/adr/002-role-aware-administration.md) for role boundaries, and [SECURITY.md](SECURITY.md) for the threat model and known limitations.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | React application, components, and browser-side services |
| `supabase/migrations/` | Forward-only schema, RLS, trigger, and authorization changes |
| `supabase/functions/` | Privileged invitation, recursive-folder, and authenticated account/privacy operations |
| `tests/` | Static security and integration-contract regression tests |
| `docs/adr/` | Architectural decisions and rejected alternatives |
| `.github/` | Continuous integration, dependency updates, and contribution templates |

## Installation and self-hosting

### Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- A Supabase project
- Supabase CLI
- A frontend host such as Vercel, or any static host that supports SPA fallback routing

### 1. Clone and install

```powershell
git clone https://github.com/Saboreq/SabHaven.git
cd SabHaven
npm ci
```

### 2. Configure Supabase


Create a Supabase project, authenticate the Supabase CLI, and link the repository to your project:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

Apply the migrations and deploy the server functions:

   ```powershell
   npx supabase db push
   npx supabase functions deploy register-with-invite --no-verify-jwt
   npx supabase functions deploy manage-folder --no-verify-jwt
   npx supabase functions deploy account-tools
   ```

   Database migrations and server functions are separate from a Vercel deployment.

In **Supabase Dashboard → Storage → Settings**, set the project-wide **Global file size limit** to the largest file the owner should be able to upload. The migration removes the `downloads` bucket's 50 MiB override, but it cannot bypass the project or plan limit.

In **Supabase Dashboard → Authentication → Sign In / Providers**, disable **Allow new users to sign up**. Registration remains available through the invitation flow.

Allow the exact production browser origin:

   ```powershell
   npx supabase secrets set ALLOWED_ORIGIN=https://your-site.example
   ```

### 3. Configure the frontend

Copy `.env.example` to `.env.local` and set the project URL and publishable key. Never place a secret or service-role key in a `VITE_` variable.

```powershell
Copy-Item .env.example .env.local
npm run dev
```

The development server is intended for local development. For a production self-hosted instance, build the static application with:

```powershell
npm run build
```

The production output is written to `dist/`.

### 4. Deploy the frontend

**Vercel:** import this GitHub repository, set the required `VITE_*` environment variables, and deploy. The included `vercel.json` provides the SPA rewrite required for application routes and sends security headers including CSP, HSTS, frame denial, content-type protection, a referrer policy, and a restrictive permissions policy.

**Other static hosts:** publish the `dist/` directory and configure all non-file routes to fall back to `/index.html`. Use HTTPS in production and set `ALLOWED_ORIGIN` in Supabase to the exact production origin.

After deploying, verify login, invitation redemption, Terms acceptance, account export/deletion, legal routes, private-folder isolation, uploads, downloads, replacement, and deletion before using the instance for real data.

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
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:prod
```

Run the full local gate with `npm run check`. Pull requests and pushes to `main` run the same checks in GitHub Actions.

## Security scope

- The Storage bucket remains private, including for publicly listed files.
- Private metadata is returned only to its owner.
- Admin and owner roles do not bypass another member's private boundary.
- Invitation validation and role assignment are server-side.
- Upload-size permissions are role-aware and enforced beyond the browser.
- Browser-origin restrictions complement, but do not replace, authentication and authorisation.
- SabHaven is not end-to-end encrypted or independently audited and does not currently include malware scanning, per-user quotas, or distributed registration rate limiting.

Review [SECURITY.md](SECURITY.md) before using SabHaven for sensitive or untrusted workloads.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, migration rules, validation requirements, and pull request expectations. Security issues must follow the private reporting process in [SECURITY.md](SECURITY.md).

Created and maintained by the independent developer behind [Saboreq](https://saboreq.xyz), a public development brand.


## License

SabHaven is licensed under the [MIT License](LICENSE).
