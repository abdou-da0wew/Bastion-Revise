# Security Policy

## Reporting a vulnerability
Please report privately via GitHub Security Advisories ("Report a vulnerability"
on the Security tab) or by opening a minimal, non-exploiting issue if advisories
are unavailable. Do not publish working exploits for unpatched issues.

## Supported versions
Only the latest release on the default branch is supported.

## Deployment hardening checklist
- Keep the origin port localhost-only (`CDN_BIND=127.0.0.1:3005`) and publish via Cloudflare Tunnel.
- Set a strong `CDN_ADMIN_TOKEN`; mint least-privilege scoped tokens for CI.
- Leave `CDN_TRUST_PROXY=false` unless the origin is unreachable except through your proxy.
- Serve `/dl/` content from a cookie-less domain; uploads are forced `Content-Disposition: attachment`.
- Rotate tokens with POST /api/tokens then revoke the old one. See docs/SECURITY.md.
