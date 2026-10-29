# CeleCDN — Project Summary

**Status: v2.0.0 — post-audit rewrite.** The v1 server and every problem found in it are documented in [AUDIT.md](AUDIT.md); this version fixes them and adds the registry/API/observability layer.

## What ships
- 🌐 Web-root CDN with per-type TTLs, compression, correct Range/ETag semantics.
- 📦 `/dl/` versioned registry for executables & scripts (immutable pinned URLs, `latest` alias, SHA-256 manifests).
- 🔑 Scoped token API (create/list/revoke), streaming uploads, file management — plus plain disk placement.
- 📊 Prometheus metrics, `/health` + `/ready`, request-id correlation, redacted structured logs.
- 🔔 Opt-in (default-off) Discord webhooks, throttled per event.
- 🐳 Docker/Compose on `/opt/celecdn`, self-healing restarts, capped logs, Cloudflare Tunnel profile for `cdn.celestialb.cv`.

## Quality gates
`bun run check` (strict tsc + 28 tests) · `bun audit` clean · CI + CodeQL + Dependabot.

See [README.md](README.md) and [docs/](docs/) for the full story.
