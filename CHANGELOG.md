# Changelog

All notable changes to SabHaven are documented here.

The project follows semantic versioning where practical. GitHub Releases are the canonical published release history.

## [Unreleased]

### Planned
- Continue hardening upload and storage workflows.
- Improve operational visibility for self-hosted deployments.
- Expand contributor-facing tests and documentation.

## [1.2.0] - 2026-09-20

Legal, privacy, account-control, and error-state release.

### Added
- Hosted Privacy Policy, Terms of Service, Acceptable Use, abuse-reporting, security, and contact pages.
- Versioned Terms acceptance during invitation registration with server-timestamped legal-acceptance records.
- Signed-in account-data export and automated deletion for eligible non-owner accounts.
- Custom 403, 404, 410, and application-error surfaces.
- RFC 9116-style security.txt contact metadata.
- Repository copies of hosted Privacy, Terms, and Acceptable Use policies.

### Security
- Account deletion removes owned Storage objects before deleting the Auth account.
- Automated account deletion refuses the single owner account.
- Account tools require a valid user JWT and independently resolve the authenticated caller.
- Hosted Vercel responses now include a Content Security Policy, HSTS, frame denial, referrer policy, MIME-sniffing protection, and restrictive browser permissions.

### Changed
- Registration explicitly separates contractual Terms acceptance from acknowledgement of the Privacy Policy.
- Footer navigation exposes legal, abuse, security, and contact routes on every page.
- Self-hosting documentation now includes the account-tools Edge Function and legal-deployment responsibilities.

## [1.1.1] - 2026-09-20

First formally documented open-source release of SabHaven.

### Added
- MIT open-source license and explicit self-hosting documentation.
- Contribution workflow, security reporting guidance, CI checks, CODEOWNERS, issue templates, and Dependabot configuration.
- Role-aware administration and invitation controls.
- Owner-only upload-size exemption while retaining the configured member limit.
- Regression coverage for authentication, ownership, RLS, storage, and destructive operations.

### Security
- Enforced private-folder ancestry in database access rules.
- Hardened Storage uploads so objects require matching authorized metadata.
- Kept privileged credentials inside server-side Edge Functions.
- Added exact-origin handling and documented deployment/security boundaries.
- Preserved owner isolation: admin and owner roles do not gain access to another member's private content.

### Changed
- Improved public documentation around architecture, access boundaries, deployment, and known limitations.
- Added a complete installation and self-hosting path for Supabase + Vercel or another static host.

[Unreleased]: https://github.com/Saboreq/SabHaven/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/Saboreq/SabHaven/releases/tag/v1.2.0
[1.1.1]: https://github.com/Saboreq/SabHaven/releases/tag/v1.1.1
