# SabHaven Roadmap

SabHaven is actively maintained. This roadmap communicates intended maintenance work without promising fixed delivery dates.

## Current focus

- Keep authentication, ownership, Postgres RLS, and Storage RLS regression-tested.
- Keep self-hosting instructions aligned with Supabase and Vercel deployment requirements.
- Review dependency updates and security advisories through Dependabot and CI.
- Keep releases reproducible and documented through GitHub Releases and CHANGELOG.md.

## Candidate improvements

These items are useful future directions and are not commitments to a specific release:

- [Optional malware-scanning integration for untrusted uploads](https://github.com/Saboreq/SabHaven/issues/14).
- [Per-user storage quotas and administrator-visible quota reporting](https://github.com/Saboreq/SabHaven/issues/15).
- More operational diagnostics for failed uploads and Edge Function errors.
- Additional end-to-end tests around invitation redemption, folder ancestry, replacement, and deletion.
- Better backup/restore guidance for self-hosted Supabase deployments.

## Release policy

- User-visible changes are summarized in CHANGELOG.md.
- Stable versions are published as GitHub Releases using tags such as `v1.1.1`.
- CI must pass before a release is considered ready.
- Security-sensitive fixes may be released without waiting for unrelated roadmap work.

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
