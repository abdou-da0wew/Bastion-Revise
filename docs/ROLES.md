# Accounts, roles & admin levels

## Roles

| Level | Role | Granted by | Can do |
|---|---|---|---|
| 0 | `user` | registration | own files/URLs/logs/settings/API key |
| 1 | `moderator` | admin+ | view all accounts; suspend/activate accounts below L1 |
| 2 | `admin` | superadmin (or admin creating below-level roles) | roles below own, quotas, account lifetime, delete below-level accounts |
| 3 | `superadmin` | bootstrap (first account, or `BASTION_SUPERADMIN_EMAILS`) | everything + CDN core token management |

## Enforcement rules (API-level, `apps/dashboard/src/app/api/admin/users/[id]/route.ts`)

- Actors can only manage accounts **strictly below** their level, and only grant roles strictly below their level.
- Role changes and quota changes require L2+; suspension requires L1+ (below-level targets only); deletion requires L2+.
- Nobody can modify or delete **their own** account through the admin endpoint.
- Suspended or **expired** accounts cannot log in, and existing sessions stop working immediately (`getActor()` re-checks DB state per request — role changes/suspension do not wait for JWT expiry).

## Account lifetime & quotas

- `expiresAt` (null = never) is set by admins in the Admin Panel → Users → **Lifetime**; shown to the user in Settings.
- Quotas (`maxFiles`, `maxStorageBytes`, `maxRequestsPerDay`) are per-user, editable by L2+ in the Admin Panel, enforced on upload and shown in Settings.
- Every account owns a CDN namespace (`u-<id-prefix>`); uploads publish to `/dl/<namespace>/<version>/<file>` on the CDN core, so ownership maps 1:1 to registry paths.

## Bootstrap

On a fresh MongoDB, the **first registered account becomes superadmin**. Alternatively list addresses in `BASTION_SUPERADMIN_EMAILS` (comma-separated) — they are promoted at registration. Do both behind a closed registration window on first deploy, then manage roles from the Admin Panel.
