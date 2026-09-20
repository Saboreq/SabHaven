# Changelog

All notable changes to SabHaven are documented here.

The project follows semantic versioning where practical. GitHub Releases are the canonical published release history.

## [Unreleased]

### Planned
- Continue hardening upload and storage workflows.
- Improve operational visibility for self-hosted deployments.
- Expand contributor-facing tests and documentation.

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

[Unreleased]: https://github.com/Saboreq/SabHaven/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/Saboreq/SabHaven/releases/tag/v1.1.1
