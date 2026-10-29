# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.x (development) | No — pre-release |

## Reporting a Vulnerability

Bastion is a security-oriented project. If you find a vulnerability, please report it privately.

**Do not open a public issue.** Send details to aabdou911aydev@gmail.com.

Include:
- What the issue is
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You will receive a response within 48 hours. Once the issue is confirmed and fixed, a public advisory will be published.

## Security Features

- **No executables or archives** — upload validation checks extensions, MIME types, and magic bytes
- **Path traversal prevention** — filenames are sanitized before storage
- **Rate limiting** — per-user and per-file, with configurable windows
- **JWT auth** — httpOnly cookies, HS256 signing, 7-day expiry
- **Audit trail** — every action logged with trace IDs across all internal calls
- **Structured errors** — error codes never leak internals or stack traces
- **Full access rules** — per-file control over domains, IPs, user agents, referers
- **Hotlink protection** — optional per-file referer enforcement
