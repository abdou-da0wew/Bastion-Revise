# Changelog
All notable changes are documented here (Keep a Changelog / SemVer).

## [2.0.0] — 2026-10-29
### Added
- `/dl/` versioned package registry for executables & scripts with SHA-256 ETags, `latest` alias, manifests.
- Token API: create/list/revoke scoped tokens (hash-only storage), streaming uploads, file management endpoints.
- Compression (Brotli/gzip), Prometheus metrics, readiness probe, request-id correlation, Discord webhooks (opt-in).
- Docker/Compose deployment with `/opt/celecdn` persistence, log rotation, self-healing restarts, Cloudflare Tunnel profile.
- Test suite (28 tests) and CI/CodeQL/Dependabot.

### Fixed (the AUDIT.md rewrite)
- Path traversal sibling-prefix bypass, symlink escapes, `.env`/dotfile disclosure.
- Range handling: suffix ranges, clamping, 416s instead of 500s/hung sockets; RFC-correct ETag conditionals incl. `If-Range`.
- Rate limiter returns real 429s; proxy trust is explicit; config is validated and deeply cloned; no internals leaked in errors.
- Removed vulnerable unused `@fastify/static`; all dependencies updated (`bun audit` clean).

## [1.0.0] — initial CDN server (superseded; see AUDIT.md)
