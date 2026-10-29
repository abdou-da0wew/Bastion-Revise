# Contributing to Bastion

Thanks for considering contributing. This project is small and focused — here is how to help.

## Code of Conduct

Be respectful. Don't be a jerk. This project is maintained by one person who values clean code and direct communication.

## How to Contribute

### Bugs

Open an issue with:
- What you did
- What you expected
- What actually happened
- Your environment (Node version, Bun version, browser)

### Features

Open an issue first. Describe what you want and why. The project has a clear scope — not everything will be accepted.

### Pull Requests

1. Fork the repo
2. Create a branch from `main`
3. Make your changes
4. Run `bun run ci` locally — it must pass
5. Open a PR with a clear title and description

## Development Setup

```bash
cp .env.example .env.local
# Edit MONGODB_URI and JWT_SECRET

bun install
bun dev
```

## Code Standards

- **TypeScript strict mode** — no `any`, no `@ts-ignore`
- **No emojis in code, comments, or logs**
- **No hardcoded values** — constants go in `src/lib/constants.ts`, env vars for secrets
- **API responses** — use `ApiResponse<T>` format from `src/lib/types.ts`
- **Error codes** — use `ERROR_CODES` from constants, never leak internals
- **Audit logging** — every significant operation must call `writeAuditLog()`
- **Trace IDs** — generate at every entry point, pass through the request chain

## Architecture

Bastion uses a flat modular layout (not SMO):

- **`src/lib/db.ts`** — all database operations. Lazy connection, paginated responses.
- **`src/lib/auth.ts`** — JWT creation, verification, session extraction.
- **`src/lib/audit.ts`** — trace IDs, audit entry creation, in-memory buffer + MongoDB persistence.
- **`src/lib/security.ts`** — extension validation, magic byte detection, MIME detection, filename sanitization.
- **`src/lib/storage.ts`** — filesystem read/write with subdirectory sharding.
- **`src/lib/rate-limit.ts`** — in-memory sliding window rate limiter.

API routes are thin — they parse input, call lib functions, and return structured responses.

## Build Notes

- `next build` requires **Node.js** (not Bun) due to mongoose's dependency on `node:v8`
- CI uses Bun for install, Node.js for build
- `bun dev` works fine for development

## Questions

Open an issue or reach out directly.
