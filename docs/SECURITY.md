# Security model

This codebase is the post-audit rewrite of a server that had three independent
unauthenticated file-disclosure escapes (see `AUDIT.md`). Every one of them is
now a regression test in `test/`.

## Enforced in code

- **Containment, twice:** lexical `path.relative` check (separator-aware — no sibling-prefix bypass) *and* `fs.realpath` re-validation, so symlinks can't escape or launder blocked extensions.
- **Dotfiles denied** by segment, not by extension (the old `path.extname('.env') === ''` bypass is gone).
- **Default-deny allowlists** for both the web root and the registry; secret types (`.env/.pem/.key/.p12/.pfx`) are hard-blocked in the registry even if configured. Blocked and missing files return the same 404 — no existence oracle.
- **Tokens:** SHA-256 hashes only, `0600` store, constant-time comparison, scopes, revocable, plaintext shown once. Bootstrap admin token lives only in the environment.
- **Uploads:** streamed to a temp file, size-capped mid-stream, SHA-256 while streaming, fsync + atomic rename; a crashed upload is never servable.
- **Rate limiting that works:** real `429`s with `Retry-After`; health checks exempt; auth routes stricter. Proxy trust is **off by default** — set `CDN_TRUST_PROXY` to Cloudflare's IP ranges only when the origin is tunnel-only.
- **No leakage:** error responses carry a generic message + `requestId`; stack traces and Node internals never reach clients. Logs redact `authorization`, `cookie`, `x-api-token`.
- **Headers:** Helmet with a deny-by-default CSP for app responses, registry downloads forced to `attachment` + `nosniff`, `Cross-Origin-Resource-Policy: cross-origin` so CDN embedding works without opening the API.
- **Conditionals & ranges** follow RFC 9110 (weak ETag comparison, `If-Range`, clamped ranges) — no 500s, no hung sockets from crafted `Range` headers.

## Operator responsibilities

- Keep the origin on `127.0.0.1` and publish only through the tunnel (or a firewall with equivalent effect).
- Treat anything in the web root / registry as **public** — this server has no per-file ACLs by design.
- Prefer pinned `/dl/<name>/<version>/…` URLs for anything security-sensitive; verify SHA-256 from `GET /dl/<name>/<version>` after download.
- Rotate CI tokens periodically; revoke with `POST /api/tokens/:id/revoke`.
- Keep `bun audit` clean (CI enforces it; Dependabot watches npm/Docker/Actions).

## Known limits

- Single-node, file-backed state — token/manifest writes are atomic but not locked across concurrent processes. Run one replica per `/opt/celecdn` volume.
- Rate limiting is in-memory per process (edge limiting at Cloudflare is the real DDoS control).
