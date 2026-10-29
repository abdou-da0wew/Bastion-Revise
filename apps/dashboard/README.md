# Bastion Dashboard

The human half of **Bastion** (see the repo root README): accounts, uploads, CDN URLs, per-file access rules, access/audit logs, analytics, settings and the 3-level admin panel. Bytes are stored/streamed by the **Bastion CDN core** at the repo root — this app keeps metadata in MongoDB and bridges to the core with a scoped service token (`CDN_SERVICE_TOKEN`, internal URL `CDN_INTERNAL_URL`).


Fortified file delivery. Secure, fast, and fully audited CDN for your assets.

Upload files, protect them with per-file access rules, and track every request with full audit logs. Self-hosted on your infrastructure.

## Features

- **File upload & delivery** — Upload files through a dashboard or API. Get a CDN URL for each file.
- **Per-file access rules** — Control who can access each file: allowed/blocked domains, IPs, user agents, referer checks, hotlink protection.
- **Registry uploads** — Extension allowlist, SHA-256 hashing server-side. Executables, scripts and archives are first-class content (they are the CDN registry’s job); private keys/secrets are blocked.
- **Rate limiting** — Per-user and per-file rate limits with configurable windows.
- **Full audit trail** — Every file access, upload, delete, and config change is logged with trace IDs, actor info, and timing.
- **Analytics** — Download counts, bandwidth usage, request patterns over time.
- **JWT authentication** — Register, login, API key auth. Session management via httpOnly cookies.
- **Admin panel** — 3 admin levels (moderator/admin/superadmin), account lifetime & quotas, CDN core status and service-token management.
- **Dark & light themes** — Deep black dark theme and eye-safe white light theme, system-aware.
- **REST API** — Full API for programmatic access. Upload, list, update, delete files.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Database | MongoDB via Mongoose 9 |
| UI | Tailwind CSS v4, shadcn/ui, base-ui |
| Auth | jose (JWT), bcryptjs |
| Forms/Validation | Zod |
| Charts | Recharts |
| Storage | Local filesystem (sharded by subdirectory) |

## Prerequisites

- **Node.js 22+** — required for production builds (Bun's `node:v8` module is incomplete)
- **Bun 1.2+** — for development and package management
- **MongoDB** — any MongoDB instance (Atlas, local, Docker)

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd bastion
bun install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your MONGODB_URI and JWT_SECRET

# Start development
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Register an account to get started.

### Production build

```bash
# Build requires Node.js (Bun can't build due to mongoose's node:v8 dependency)
npx next build
bun start
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret (min 32 chars) |
| `NEXT_PUBLIC_BASTION_URL` | No | `http://localhost:3000` | Public URL for CDN links |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, register pages
│   ├── (dashboard)/      # Dashboard layout + pages
│   │   ├── admin/        # Admin panel
│   │   ├── analytics/    # Usage analytics
│   │   ├── files/        # File listing & detail
│   │   ├── logs/         # Audit log viewer
│   │   ├── settings/     # User settings
│   │   └── upload/       # File upload
│   ├── api/              # REST API routes
│   │   ├── admin/        # Admin API
│   │   ├── analytics/    # Analytics API
│   │   ├── auth/         # Auth API
│   │   ├── cdn/          # CDN delivery API
│   │   ├── files/        # File management API
│   │   ├── logs/         # Audit log API
│   │   └── upload/       # Upload API
│   ├── cdn/              # CDN public endpoint
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/
│   ├── dashboard/        # Dashboard components
│   ├── landing/          # Landing page components
│   ├── ui/               # shadcn/ui components
│   └── theme-toggle.tsx  # Theme switcher
└── lib/
    ├── models/           # Mongoose models
    ├── types.ts          # Shared TypeScript types
    ├── constants.ts      # Config, limits, error codes
    ├── db.ts             # Database operations
    ├── auth.ts           # JWT & session helpers
    ├── audit.ts          # Audit logging
    ├── security.ts       # File validation
    ├── storage.ts        # Filesystem storage
    ├── rate-limit.ts     # Rate limiter
    └── mongodb.ts        # MongoDB connection
```

## API Overview

All API routes return `ApiResponse<T>` format:

```json
{
  "success": true,
  "data": { ... }
}
```

Errors include a machine-readable `code` and human-readable `message`:

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File exceeds the maximum allowed size of 10MB"
  }
}
```

### Key endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Current session |
| `GET` | `/api/files` | List user's files (paginated) |
| `POST` | `/api/upload` | Upload a file |
| `GET` | `/api/cdn/:fileId` | Serve a file (public CDN) |
| `GET` | `/api/analytics` | Usage analytics |
| `GET` | `/api/logs` | Audit logs (paginated, filterable) |
| `GET` | `/api/admin/stats` | Admin system stats |
| `GET` | `/api/admin/users` | Admin list users |

## Local CI

```bash
bun run ci
```

Runs TypeScript check and production build. Skips build on Bun (uses Node.js via `npx`).

## CI/CD

GitHub Actions runs on every push/PR to `main`:
1. **Type Check** — `tsc --noEmit` via Bun
2. **Build** — `next build` via Node.js

To disable CI, set `enabled: false` in `.github/ci-config.yml`.

## Deployment

The recommended platform is **Vercel**:
- Auto-detects Next.js
- Install command: `bun install`
- Build command: `next build`
- Set `MONGODB_URI` and `JWT_SECRET` in project environment variables

## License

MIT — see [LICENSE](LICENSE).
