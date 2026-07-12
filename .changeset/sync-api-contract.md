---
"@squarecloud/api": major
---

Sync with the Square Cloud API contract changes from the last 3 months.

**Breaking**

- Removed `SquareCloudAPI#users` — use `SquareCloudAPI#user`.
- Removed `BaseApplication#backup` and `#backups` — use `Application#snapshots`.
- Removed the `Backup` class alias — use `Snapshot`.
- `applications.create()` return type now matches the live API: `language: { name, version }` plus `cpu`, and optional `description`/`subdomain`.
- `network.dns()` now returns the API's array of DNS records (`{ type, name, value, status }`) instead of the removed `ownership`/`ssl` object (via `@squarecloud/api-types`).

**Added**

- `client.applications.domains()`: lists every domain configured across the account's applications.
- `client.applications.loadBalancers()`: lists custom-domain load balancers with the plan's per-domain application limit.
- `application.network.analytics()`: optional drill-down filters (`country`, `ip`, `path`, `status`, `os`, `browser`, `protocol`, `referer`, `provider`, `contentType`, `bot`).
- Re-export of `APIErrorCode` with the standardized error codes; pre-standardization names remain as `@deprecated` aliases.

**Docs**

- Updated JSDoc with current rate limits and behavior (logs, snapshot quotas, realtime SSE connection limits and TTL, `402 UPGRADE_REQUIRED` on `user.snapshots()` for accounts without an active paid plan) and explicit `node:buffer` imports so `Buffer` resolves in every TypeScript setup.
