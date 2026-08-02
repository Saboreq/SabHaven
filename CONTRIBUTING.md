# Contributing to SabHaven

Thank you for helping improve SabHaven. Changes should preserve its defining boundary: the browser is untrusted, and authorization is enforced by Postgres, Storage RLS, and narrowly scoped Edge Functions.

## Development setup

Requirements:

- Node.js 20.19 or newer
- npm 10 or newer
- Supabase CLI for database or Edge Function work

Install the lockfile-defined dependencies and run the local application:

```powershell
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and provide only the publishable Supabase values. Never place a service-role key or another secret in a `VITE_` variable.

## Change guidelines

- Keep client components and service logic modular.
- Treat every Supabase migration as forward-only after it has been applied. Add a new timestamped migration instead of editing deployed history.
- Add regression coverage for RLS, ownership, role, invitation, and destructive-action changes.
- Keep privileged credentials inside Edge Functions.
- Do not commit generated builds, dependencies, local Supabase state, user files, or environment files.
- Document deployment steps when a change requires migrations, function deployments, secrets, or dashboard configuration.

## Before opening a pull request

Run:

```powershell
npm run check
npm run audit:prod
git diff --check
```

Describe the user impact, root cause for fixes, relevant security boundaries, and any production steps that cannot be validated locally.

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md), not through a public issue.
