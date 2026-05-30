---
"@squarecloud/api": major
---

# v4.0.0 — New modules + api-types 1.0.0 migration

This release adds Databases, Workspaces, Environment Variables, Metrics, Realtime SSE, GitHub App deploy, Snapshot restore, and the full edge analytics suite (errors/logs/performance/purge_cache). Type definitions are now sourced from `@squarecloud/api-types@1.0.0`.

## Breaking changes — migration guide

| 3.x                                       | 4.x                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `client.users.*`                          | `client.user.*`                                                                              |
| `app.backup` / `app.backups`              | `app.snapshots`                                                                              |
| `Backup` re-export                        | `Snapshot`                                                                                   |
| `app.deploys.list()` flat array           | returns `Deployment[][]` (one timeline per deploy — `.flat()` to mimic)                      |
| `Deployment.id` `` `git-${string}` ``     | plain `string` (commit SHA-1, 40 hex)                                                        |
| `app.network.dns()` array                 | single object `{ ownership, ssl }`                                                           |
| `app.network.analytics()` no-arg          | requires `{ start, end }` (ISO or `Date`)                                                    |
| `app.network.purgeCache()`                | `purgeCache(paths?: string[])` — `[]` purges all                                             |
| `app.custom === undefined`                | `app.custom === null`                                                                        |
| `workspace.members` / `.applications` (data) | renamed to `memberList` / `applicationList`; new `.members` / `.applications` are modules |
| Node 18                                   | Node 20+                                                                                     |

## New

- `client.databases.{fetch, create, statusAll}` + full `Database` class (`start`, `stop`, `update`, `delete`, `getStatus`, `getMetrics`)
  - `Database.credentials.{certificate, reset}` — TLS certificate + password/cert rotation
  - `Database.snapshots.{list, create, download, restore}` — separate `DatabaseSnapshot` class so download URL targets the correct scope
- `client.workspaces.{list, fetch, create, delete, leave, generateInviteCode}` + full `Workspace` class (`delete`, `leave`)
  - `Workspace.members.{add, update, remove}` — invite-code flow with role tiers
  - `Workspace.applications.{add, remove}` — share / unshare apps
- `client.service.status()` — aggregate platform health
- `Application.envs.{list, set, replace, delete}` — environment variables
- `Application.getMetrics()` — 24h CPU/RAM/network time series (288 points)
- `Application.realtime()` — Server-Sent Events stream
- `Application.snapshots.restore({ snapshotId, versionId })`
- `Application.deploys.linkGithubApp(options)` / `unlinkGithubApp()` / `current()` — GitHub App linkage
- `Application.network.{errors, logs, performance, purgeCache}` — edge analytics + cache management
- `client.user.snapshots(scope)` — list user-scoped snapshots
- New fields: `User.databases`, `User.locale`, `User.createdAt`, `BaseApplication.domain`, `BaseApplication.custom`, `BaseApplication.createdAt`
- `SimpleDatabaseStatus` (parallel to `SimpleApplicationStatus`, exposes `.databaseId`)
- `SquareCloudAPIError.code` now public — discriminate errors via `err.code === "FAILED_READ"` instead of message matching
- `assertNumber` literal-assertion helper
- Runnable code examples under [`examples/`](./examples/)

## Bug fixes

- `database.snapshots.list().download()` was 404-ing because snapshot URL hardcoded `applications/` — now correctly uses `databases/`
- `Application.deploys.linkGithubApp()` and `Snapshot.download()` now throw `SquareCloudAPIError` (was raw `Error`)
- `databases.create()` validates `memory` (was previously unchecked)
- `client.applications.fetch()` now returns a `WebsiteApplication` instance when the response has a domain. `app.isWebsite()` correctly narrows the type and `app.network` is available
- `client.service.status()` correctly handles the un-enveloped `{ status, message }` payload (was returning `undefined`)

## Other

- Bumped minimum Node to **20.0.0** (Node 18 reached EOL April 2025). tsdown bundles target Node 20.
- CI now gates publishes on `lint:ci` (non-mutating) and `check-types`. Release step has `NPM_TOKEN` wired up.
